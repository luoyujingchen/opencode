import { Source } from "@opencode-ai/core/source"

if (!process.env.npm_config_registry) {
  process.env.npm_config_registry = Source.npmRegistry()
}
if (!process.env.OPENCODE_DISABLE_LSP_DOWNLOAD && !process.env.FANG_DISABLE_LSP_DOWNLOAD) {
  process.env.OPENCODE_DISABLE_LSP_DOWNLOAD = "1"
  process.env.FANG_DISABLE_LSP_DOWNLOAD = "1"
}
await import("./index")
