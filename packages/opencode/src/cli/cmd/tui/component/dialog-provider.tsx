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
import { isConsoleManagedProvider } from "@tui/util/provider-origin"
import { Fangcode } from "@/provider/fangcode"

const PROVIDER_PRIORITY: Record<string, number> = {
  [Fangcode.id]: 0,
}

const OPENAI_COMPATIBLE = "openai-compatible"

function slugify(name: string): string {
  return (
    "custom-" +
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-+/g, "-")
  )
}

function uniqueSlug(base: string, existingIDs: Set<string>): string {
  let slug = base
  if (!existingIDs.has(slug)) return slug
  let i = 2
  while (existingIDs.has(`${slug}-${i}`)) i++
  return `${slug}-${i}`
}

async function fetchModels(baseURL: string, apiKey?: string): Promise<string[]> {
  return Fangcode.models({ api: baseURL, key: apiKey, timeout: 5000 })
}

function openaiCompatibleModel(id: string) {
  return Fangcode.model(id)
}

async function setupOpenAICompatible(input: {
  dialog: ReturnType<typeof useDialog>
  sdk: ReturnType<typeof useSDK>
  sync: ReturnType<typeof useSync>
  toast: ReturnType<typeof useToast>
}) {
  const name = await DialogPrompt.show(input.dialog, "Provider name", {
    placeholder: "DeepSeek",
  })
  if (!name?.trim()) return

  const api = await DialogPrompt.show(input.dialog, "Base URL", {
    placeholder: "https://api.deepseek.com/v1",
  })
  if (!api?.trim()) return

  const key = await DialogPrompt.show(input.dialog, "API key", {
    placeholder: "sk-...",
  })
  if (!key?.trim()) return

  const base = api.replace(/\/+$/, "")

  // Try to auto-fetch model list
  let allModels: string[] = []
  const remoteModels = await fetchModels(base, key)

  if (remoteModels.length > 0) {
    // Save all fetched models to config; user picks which one to use in DialogModel later
    allModels = remoteModels
  } else {
    // Fallback: manual input for a single model
    const modelId = await DialogPrompt.show(input.dialog, "Model ID (could not fetch model list)", {
      placeholder: "gpt-4o-mini",
    })
    if (!modelId?.trim()) return
    allModels = [modelId.trim()]
  }

  // Generate unique provider ID from name
  const existingIDs = new Set(input.sync.data.provider_next.all.map((p) => p.id))
  const providerID = uniqueSlug(slugify(name.trim()), existingIDs)

  const cfg = await input.sdk.client.config.get()
  if (cfg.error || !cfg.data) {
    input.toast.show({ variant: "error", message: "Failed to load config" })
    input.dialog.clear()
    return
  }

  const next = {
    provider: {
      ...(cfg.data.provider ?? {}),
      [providerID]: {
        name: name.trim(),
        npm: "@ai-sdk/openai-compatible",
        api: base,
        models: Object.fromEntries(allModels.map((id) => [id, openaiCompatibleModel(id)])),
      },
    },
  }

  const updated = await input.sdk.client.global.config.update({ config: next })
  if (updated.error) {
    input.toast.show({
      variant: "error",
      message: `Failed to update config: ${JSON.stringify(updated.error)}`,
    })
    input.dialog.clear()
    return
  }

  const auth = await input.sdk.client.auth.set({
    providerID,
    auth: { type: "api", key },
  })
  if (auth.error) {
    input.toast.show({ variant: "error", message: "Failed to save API key" })
    input.dialog.clear()
    return
  }

  await input.sdk.client.instance.dispose()
  await input.sync.bootstrap()

  const hasProvider = (id: string) =>
    input.sync.data.provider.some((x) => x.id === id) ||
    input.sync.data.provider_next.all.some((x) => x.id === id)

  if (!hasProvider(providerID)) {
    await input.sdk.client.instance.dispose()
    await input.sync.bootstrap()
  }

  input.dialog.replace(() => <DialogModel providerID={providerID} />)
}

async function setupFangcode(input: {
  dialog: ReturnType<typeof useDialog>
  sdk: ReturnType<typeof useSDK>
  sync: ReturnType<typeof useSync>
  toast: ReturnType<typeof useToast>
}) {
  const api = await DialogPrompt.show(input.dialog, "Base URL", {
    value: Fangcode.base,
    placeholder: Fangcode.base,
  })
  if (api === null) return

  const key = await DialogPrompt.show(input.dialog, "API key", {
    placeholder: "sk-...",
  })
  if (!key?.trim()) return

  const base = Fangcode.api(api)
  const models = await fetchModels(base, key.trim())
  if (models.length === 0) {
    input.toast.show({ variant: "error", message: "Failed to fetch FangCode models" })
    input.dialog.clear()
    return
  }

  const cfg = await input.sdk.client.config.get()
  if (cfg.error || !cfg.data) {
    input.toast.show({ variant: "error", message: "Failed to load config" })
    input.dialog.clear()
    return
  }

  const next = {
    provider: {
      ...(cfg.data.provider ?? {}),
      [Fangcode.id]: {
        name: "FangCode",
        npm: "@ai-sdk/openai-compatible",
        api: base,
        env: ["FANGCODE_API_KEY"],
        models: Object.fromEntries(models.map((id) => [id, openaiCompatibleModel(id)])),
      },
    },
  }

  const updated = await input.sdk.client.global.config.update({ config: next })
  if (updated.error) {
    input.toast.show({
      variant: "error",
      message: `Failed to update config: ${JSON.stringify(updated.error)}`,
    })
    input.dialog.clear()
    return
  }

  const auth = await input.sdk.client.auth.set({
    providerID: Fangcode.id,
    auth: { type: "api", key: key.trim() },
  })
  if (auth.error) {
    input.toast.show({ variant: "error", message: "Failed to save API key" })
    input.dialog.clear()
    return
  }

  await input.sdk.client.instance.dispose()
  await input.sync.bootstrap()

  const exists = (id: string) =>
    input.sync.data.provider.some((x) => x.id === id) ||
    input.sync.data.provider_next.all.some((x) => x.id === id)

  if (!exists(Fangcode.id)) {
    await input.sdk.client.instance.dispose()
    await input.sync.bootstrap()
  }

  input.dialog.replace(() => <DialogModel providerID={Fangcode.id} />)
}

export function createDialogProviderOptions() {
  const sync = useSync()
  const dialog = useDialog()
  const sdk = useSDK()
  const toast = useToast()
  const { theme } = useTheme()
  const options = createMemo(() => {
    const list = pipe(
      sync.data.provider_next.all.filter((provider) => provider.id === Fangcode.id),
      sortBy((x) => PROVIDER_PRIORITY[x.id] ?? 99),
      map((provider) => {
        const consoleManaged = isConsoleManagedProvider(sync.data.console_state.consoleManagedProviders, provider.id)
        const connected = sync.data.provider_next.connected.includes(provider.id)

        return {
          title: provider.name,
          value: provider.id,
          description: {
            opencode: "(Recommended)",
            anthropic: "(API key)",
            openai: "(ChatGPT Plus/Pro or API key)",
            "opencode-go": "Low cost subscription for everyone",
          }[provider.id],
          footer: consoleManaged ? sync.data.console_state.activeOrgName : undefined,
          category: provider.id in PROVIDER_PRIORITY ? "Popular" : "Other",
          gutter: connected ? <text fg={theme.success}>✓</text> : undefined,
          async onSelect() {
            if (consoleManaged) return

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
                  <CodeMethod
                    providerID={provider.id}
                    title={method.label}
                    index={index}
                    authorization={result.data!}
                  />
                ))
              }
              if (result.data?.method === "auto") {
                dialog.replace(() => (
                  <AutoMethod
                    providerID={provider.id}
                    title={method.label}
                    index={index}
                    authorization={result.data!}
                  />
                ))
              }
            }
            if (method.type === "api") {
              if (provider.id === Fangcode.id) {
                await setupFangcode({ dialog, sdk, sync, toast })
                return
              }
              let metadata: Record<string, string> | undefined
              if (method.prompts?.length) {
                const value = await PromptsMethod({ dialog, prompts: method.prompts })
                if (!value) return
                metadata = value
              }
              return dialog.replace(() => (
                <ApiMethod providerID={provider.id} title={method.label} metadata={metadata} />
              ))
            }
          },
        }
      }),
    )

    // Show configured OpenAI Compatible instances
    for (const provider of sync.data.provider_next.all) {
      // Skip fangcode (already shown above) and the legacy openai-compatible ID
      if (provider.id === Fangcode.id || provider.id === OPENAI_COMPATIBLE) continue
      const connected = sync.data.provider_next.connected.includes(provider.id)
      list.push({
        title: provider.name,
        value: provider.id,
        description: "OpenAI Compatible",
        footer: undefined,
        gutter: connected ? <text fg={theme.success}>✓</text> : undefined,
        category: "Custom",
        async onSelect() {
          // Already connected → skip auth, go directly to model selection
          if (connected) {
            return dialog.replace(() => <DialogModel providerID={provider.id} />)
          }
          const methods = sync.data.provider_auth[provider.id] ?? [
            { type: "api", label: "API key" },
          ]
          let index: number | null = 0
          if (methods.length > 1) {
            index = await new Promise<number | null>((resolve) => {
              dialog.replace(
                () => (
                  <DialogSelect
                    title="Select auth method"
                    options={methods.map((x, i) => ({
                      title: x.label,
                      value: i,
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
          if (method.type === "api") {
            return dialog.replace(() => (
              <ApiMethod providerID={provider.id} title={method.label} />
            ))
          }
          if (method.type === "oauth") {
            let inputs: Record<string, string> | undefined
            if (method.prompts?.length) {
              const value = await PromptsMethod({ dialog, prompts: method.prompts })
              if (!value) return
              inputs = value
            }
            const result = await sdk.client.provider.oauth.authorize({
              providerID: provider.id,
              method: index,
              inputs,
            })
            if (result.error) {
              toast.show({ variant: "error", message: JSON.stringify(result.error) })
              dialog.clear()
              return
            }
            if (result.data?.method === "code") {
              dialog.replace(() => (
                <CodeMethod
                  providerID={provider.id}
                  title={method.label}
                  index={index}
                  authorization={result.data!}
                />
              ))
            }
            if (result.data?.method === "auto") {
              dialog.replace(() => (
                <AutoMethod
                  providerID={provider.id}
                  title={method.label}
                  index={index}
                  authorization={result.data!}
                />
              ))
            }
          }
        },
      })
    }

    // Add "new OpenAI Compatible" entry
    list.push({
      title: "OpenAI Compatible (Add new)",
      value: "__add_openai_compatible__",
      description: "Any OpenAI-compatible API (base URL + API key)",
      footer: undefined,
      gutter: undefined,
      category: "Popular",
      async onSelect() {
        await setupOpenAICompatible({ dialog, sdk, sync, toast })
      },
    })

    return list
  })
  return options
}

export function DialogFangcodeApiKey() {
  const dialog = useDialog()
  const sdk = useSDK()
  const sync = useSync()
  const toast = useToast()

  onMount(() => {
    void setupFangcode({ dialog, sdk, sync, toast })
  })

  return <DialogPrompt title="FangCode" busy={true} busyText="Preparing..." />
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
  metadata?: Record<string, string>
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
            ...(props.metadata ? { metadata: props.metadata } : {}),
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
