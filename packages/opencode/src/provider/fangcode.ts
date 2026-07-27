import z from "zod"
import { Installation } from "../installation"
import { Source } from "@opencode-ai/core/source"

export namespace Fangcode {
  export const id = "fangcode"
  export const base = Source.fangApi()

  export const provider = {
    id,
    name: "FangCode",
    api: base,
    npm: "@ai-sdk/openai-compatible",
    env: ["FANGCODE_API_KEY"],
    models: {},
  }

  const Data = z
    .object({
      data: z.array(
        z
          .object({
            id: z.string(),
          })
          .passthrough(),
      ),
    })
    .passthrough()

  export function api(input?: string) {
    const value = input?.trim()
    return (value && value.length > 0 ? value : base).replace(/\/+$/, "")
  }

  export function model(id: string) {
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

  export async function models(input: { api?: string; key?: string; timeout?: number } = {}) {
    const headers: Record<string, string> = {
      "User-Agent": Installation.USER_AGENT,
    }
    if (input.key) headers.Authorization = `Bearer ${input.key}`

    const result = await fetch(`${api(input.api)}/models`, {
      headers,
      signal: AbortSignal.timeout(input.timeout ?? 10000),
    }).catch(() => undefined)
    if (!result?.ok) return []

    const json = await result.json().catch(() => undefined)
    const parsed = Data.safeParse(json)
    if (!parsed.success) return []

    return parsed.data.data.map((item) => item.id)
  }
}
