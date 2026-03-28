import { createMemo, createSignal, onMount, Show } from "solid-js"
import { useSync } from "@tui/context/sync"
import { map, pipe, sortBy } from "remeda"
import { DialogSelect } from "@tui/ui/dialog-select"
import { useDialog } from "@tui/ui/dialog"
import { useSDK } from "../context/sdk"
import { DialogPrompt } from "../ui/dialog-prompt"
import { Link } from "../ui/link"
import { useTheme } from "../context/theme"
import { TextAttributes } from "@opentui/core"
import type { ProviderAuthAuthorization, ProviderAuthMethod } from "@opencode-ai/sdk/v2"
import { DialogModel } from "./dialog-model"
import { useKeyboard } from "@opentui/solid"
import { Clipboard } from "@tui/util/clipboard"
import { useToast } from "../ui/toast"

const PROVIDER_PRIORITY: Record<string, number> = {
  fangcode: 0,
}

const OPENAI_COMPATIBLE = "openai-compatible"

function openaiCompatibleModel(id: string) {
  const text = "text" as const
  return {
    id,
    name: id,
    family: "openai-compatible",
    release_date: "",
    attachment: false,
    reasoning: false,
    temperature: true,
    tool_call: true,
    options: {},
    cost: { input: 0, output: 0, cache_read: 0, cache_write: 0 },
    limit: { context: 131072, output: 16384 },
    modalities: { input: [text], output: [text] },
  }
}

async function setupOpenAICompatible(input: {
  dialog: ReturnType<typeof useDialog>
  sdk: ReturnType<typeof useSDK>
  sync: ReturnType<typeof useSync>
  toast: ReturnType<typeof useToast>
}) {
  const api = await DialogPrompt.show(input.dialog, "OpenAI Compatible base URL", {
    placeholder: "https://api.openai.com/v1",
  })
  if (!api) return

  const model = await DialogPrompt.show(input.dialog, "Model ID", {
    placeholder: "gpt-4o-mini",
  })
  if (!model) return

  const key = await DialogPrompt.show(input.dialog, "API key", {
    placeholder: "sk-...",
  })
  if (!key) return

  const cfg = await input.sdk.client.config.get()
  if (cfg.error || !cfg.data) {
    input.toast.show({
      variant: "error",
      message: "Failed to load config",
    })
    input.dialog.clear()
    return
  }

  const base = api.replace(/\/+$/, "")
  const id = model.trim()
  if (!id) {
    input.toast.show({
      variant: "warning",
      message: "Model ID is required",
    })
    input.dialog.clear()
    return
  }

  const old = cfg.data.provider?.[OPENAI_COMPATIBLE]
  const next = {
    provider: {
      ...(cfg.data.provider ?? {}),
      [OPENAI_COMPATIBLE]: {
        ...old,
        name: "OpenAI Compatible",
        env: old?.env ?? [],
        npm: "@ai-sdk/openai-compatible",
        api: base,
        options: old?.options ?? {},
        models: {
          ...(old?.models ?? {}),
          [id]: old?.models?.[id] ?? openaiCompatibleModel(id),
        },
      },
    },
  }

  const updated = await input.sdk.client.global.config.update({
    config: next,
  })
  if (updated.error) {
    input.toast.show({
      variant: "error",
      message: `Failed to update config: ${JSON.stringify(updated.error)}`,
    })
    input.dialog.clear()
    return
  }

  const auth = await input.sdk.client.auth.set({
    providerID: OPENAI_COMPATIBLE,
    auth: {
      type: "api",
      key,
    },
  })
  if (auth.error) {
    input.toast.show({
      variant: "error",
      message: "Failed to save API key",
    })
    input.dialog.clear()
    return
  }

  await input.sdk.client.instance.dispose()
  await input.sync.bootstrap()

  // Check if provider was loaded
  let found = input.sync.data.provider.some((x) => x.id === OPENAI_COMPATIBLE)
  if (!found) {
    // Retry: dispose + bootstrap again
    await input.sdk.client.instance.dispose()
    await input.sync.bootstrap()
    found = input.sync.data.provider.some((x) => x.id === OPENAI_COMPATIBLE)
  }

  if (!found) {
    const available = input.sync.data.provider.map((x) => x.id).join(", ") || "(none)"
    input.toast.show({
      variant: "error",
      message: `Provider "${OPENAI_COMPATIBLE}" not found. Available: [${available}]`,
    })
    input.dialog.clear()
    return
  }

  input.dialog.replace(() => <DialogModel providerID={OPENAI_COMPATIBLE} />)
}

export function createDialogProviderOptions() {
  const sync = useSync()
  const dialog = useDialog()
  const sdk = useSDK()
  const toast = useToast()
  const options = createMemo(() => {
    const list = pipe(
      sync.data.provider_next.all.filter((provider) => provider.id === "fangcode"),
      sortBy((x) => PROVIDER_PRIORITY[x.id] ?? 99),
      map((provider) => ({
        title: provider.name,
        value: provider.id,
        description: {
          opencode: "(Recommended)",
        }[provider.id],
        category: "Popular",
        async onSelect() {
          const methods = sync.data.provider_auth[provider.id] ?? [
            {
              type: "api",
              label: "API key",
            },
          ]
          let index: number | null = 0
          if (methods.length > 1) {
            index = await new Promise<number | null>((resolve) => {
              dialog.replace(
                () => (
                  <DialogSelect
                    title="Select auth method"
                    options={methods.map((x, index) => ({
                      title: x.label,
                      value: index,
                    }))}
                    onSelect={(option) => resolve(option.value)}
                  />
                ),
                () => resolve(null),
              )
            })
          }
          if (index == null) return
          const method = methods[index]
          if (method.type === "oauth") {
            let inputs: Record<string, string> | undefined
            if (method.prompts?.length) {
              const value = await PromptsMethod({
                dialog,
                prompts: method.prompts,
              })
              if (!value) return
              inputs = value
            }

            const result = await sdk.client.provider.oauth.authorize({
              providerID: provider.id,
              method: index,
              inputs,
            })
            if (result.error) {
              toast.show({
                variant: "error",
                message: JSON.stringify(result.error),
              })
              dialog.clear()
              return
            }
            if (result.data?.method === "code") {
              dialog.replace(() => (
                <CodeMethod providerID={provider.id} title={method.label} index={index} authorization={result.data!} />
              ))
            }
            if (result.data?.method === "auto") {
              dialog.replace(() => (
                <AutoMethod providerID={provider.id} title={method.label} index={index} authorization={result.data!} />
              ))
            }
          }
          if (method.type === "api") {
            return dialog.replace(() => <ApiMethod providerID={provider.id} title={method.label} />)
          }
        },
      })),
    )

    const has = list.some((item) => item.value === OPENAI_COMPATIBLE)
    if (!has) {
      list.push({
        title: "OpenAI Compatible",
        value: OPENAI_COMPATIBLE,
        description: "Any OpenAI-compatible API (base URL + API key)",
        category: "Popular",
        async onSelect() {
          await setupOpenAICompatible({
            dialog,
            sdk,
            sync,
            toast,
          })
        },
      })
    }

    return list
  })
  return options
}

export function DialogFangcodeApiKey() {
  return <ApiMethod providerID="fangcode" title="FangCode API key" />
}

export function DialogProvider() {
  const options = createDialogProviderOptions()
  return <DialogSelect title="Connect a provider" options={options()} />
}

interface AutoMethodProps {
  index: number
  providerID: string
  title: string
  authorization: ProviderAuthAuthorization
}
function AutoMethod(props: AutoMethodProps) {
  const { theme } = useTheme()
  const sdk = useSDK()
  const dialog = useDialog()
  const sync = useSync()
  const toast = useToast()

  useKeyboard((evt) => {
    if (evt.name === "c" && !evt.ctrl && !evt.meta) {
      const code = props.authorization.instructions.match(/[A-Z0-9]{4}-[A-Z0-9]{4,5}/)?.[0] ?? props.authorization.url
      Clipboard.copy(code)
        .then(() => toast.show({ message: "Copied to clipboard", variant: "info" }))
        .catch(toast.error)
    }
  })

  onMount(async () => {
    const result = await sdk.client.provider.oauth.callback({
      providerID: props.providerID,
      method: props.index,
    })
    if (result.error) {
      dialog.clear()
      return
    }
    await sdk.client.instance.dispose()
    await sync.bootstrap()
    dialog.replace(() => <DialogModel providerID={props.providerID} />)
  })

  return (
    <box paddingLeft={2} paddingRight={2} gap={1} paddingBottom={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text attributes={TextAttributes.BOLD} fg={theme.text}>
          {props.title}
        </text>
        <text fg={theme.textMuted} onMouseUp={() => dialog.clear()}>
          esc
        </text>
      </box>
      <box gap={1}>
        <Link href={props.authorization.url} fg={theme.primary} />
        <text fg={theme.textMuted}>{props.authorization.instructions}</text>
      </box>
      <text fg={theme.textMuted}>Waiting for authorization...</text>
      <text fg={theme.text}>
        c <span style={{ fg: theme.textMuted }}>copy</span>
      </text>
    </box>
  )
}

interface CodeMethodProps {
  index: number
  title: string
  providerID: string
  authorization: ProviderAuthAuthorization
}
function CodeMethod(props: CodeMethodProps) {
  const { theme } = useTheme()
  const sdk = useSDK()
  const sync = useSync()
  const dialog = useDialog()
  const [error, setError] = createSignal(false)

  return (
    <DialogPrompt
      title={props.title}
      placeholder="Authorization code"
      onConfirm={async (value) => {
        const { error } = await sdk.client.provider.oauth.callback({
          providerID: props.providerID,
          method: props.index,
          code: value,
        })
        if (!error) {
          await sdk.client.instance.dispose()
          await sync.bootstrap()
          dialog.replace(() => <DialogModel providerID={props.providerID} />)
          return
        }
        setError(true)
      }}
      description={() => (
        <box gap={1}>
          <text fg={theme.textMuted}>{props.authorization.instructions}</text>
          <Link href={props.authorization.url} fg={theme.primary} />
          <Show when={error()}>
            <text fg={theme.error}>Invalid code</text>
          </Show>
        </box>
      )}
    />
  )
}

interface ApiMethodProps {
  providerID: string
  title: string
}
function ApiMethod(props: ApiMethodProps) {
  const dialog = useDialog()
  const sdk = useSDK()
  const sync = useSync()
  const { theme } = useTheme()

  return (
    <DialogPrompt
      title={props.title}
      placeholder="API key"
      description={
        {
          opencode: (
            <box gap={1}>
              <text fg={theme.textMuted}>
                FangCode Zen gives you access to all the best coding models at the cheapest prices with a single API
                key.
              </text>
              <text fg={theme.text}>
                Go to <span style={{ fg: theme.primary }}>https://opencode.ai/zen</span> to get a key
              </text>
            </box>
          ),
        }[props.providerID] ?? undefined
      }
      onConfirm={async (value) => {
        if (!value) return
        await sdk.client.auth.set({
          providerID: props.providerID,
          auth: {
            type: "api",
            key: value,
          },
        })
        await sdk.client.instance.dispose()
        await sync.bootstrap()
        dialog.replace(() => <DialogModel providerID={props.providerID} />)
      }}
    />
  )
}

interface PromptsMethodProps {
  dialog: ReturnType<typeof useDialog>
  prompts: NonNullable<ProviderAuthMethod["prompts"]>[number][]
}
async function PromptsMethod(props: PromptsMethodProps) {
  const inputs: Record<string, string> = {}
  for (const prompt of props.prompts) {
    if (prompt.when) {
      const value = inputs[prompt.when.key]
      if (value === undefined) continue
      const matches = prompt.when.op === "eq" ? value === prompt.when.value : value !== prompt.when.value
      if (!matches) continue
    }

    if (prompt.type === "select") {
      const value = await new Promise<string | null>((resolve) => {
        props.dialog.replace(
          () => (
            <DialogSelect
              title={prompt.message}
              options={prompt.options.map((x) => ({
                title: x.label,
                value: x.value,
                description: x.hint,
              }))}
              onSelect={(option) => resolve(option.value)}
            />
          ),
          () => resolve(null),
        )
      })
      if (value === null) return null
      inputs[prompt.key] = value
      continue
    }

    const value = await new Promise<string | null>((resolve) => {
      props.dialog.replace(
        () => (
          <DialogPrompt title={prompt.message} placeholder={prompt.placeholder} onConfirm={(value) => resolve(value)} />
        ),
        () => resolve(null),
      )
    })
    if (value === null) return null
    inputs[prompt.key] = value
  }
  return inputs
}
