import path from "path"
import { fileURLToPath } from "url"
import { Source } from "@opencode-ai/core/source"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dir = path.resolve(__dirname, "..")

process.chdir(dir)

const fallback = JSON.stringify({
  opencode: {
    id: "opencode",
    name: "FangCode",
    api: Source.fangApi(),
    npm: "@ai-sdk/openai-compatible",
    env: ["FANG_API_KEY", "OPENCODE_API_KEY"],
    models: {
      "gpt-5": {
        id: "gpt-5",
        name: "GPT 5",
        family: "gpt",
        release_date: "2025-08-07",
        attachment: true,
        reasoning: true,
        temperature: true,
        tool_call: true,
        modalities: {
          input: ["text", "image"],
          output: ["text"],
        },
        limit: {
          context: 400000,
          output: 128000,
        },
        cost: {
          input: 1.25,
          output: 10,
          cache_read: 0.125,
          cache_write: 1.25,
        },
      },
    },
  },
})

export const modelsData = await (async () => {
  const file = process.env.MODELS_DEV_API_JSON ?? Source.modelsPath()
  if (file) return Bun.file(file).text()
  if (Source.offline()) return fallback
  const url = Source.modelsUrl("api.json")
  const res = await fetch(url).catch(() => undefined)
  if (res?.ok) return res.text()
  console.warn(`Failed to fetch ${url}, using FangCode fallback`)
  return fallback
})()
console.log("Loaded provider snapshot")
