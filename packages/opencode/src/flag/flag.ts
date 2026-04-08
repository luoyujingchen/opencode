import { Config } from "effect"

function env(key: string) {
  return process.env[key]
}

function truthy(...keys: string[]) {
  for (const key of keys) {
    const value = env(key)?.toLowerCase()
    if (value === "true" || value === "1") return true
  }
  return false
}

function falsy(...keys: string[]) {
  for (const key of keys) {
    const value = env(key)?.toLowerCase()
    if (value === "false" || value === "0") return true
  }
  return false
}

function string(...keys: string[]) {
  for (const key of keys) {
    const value = env(key)
    if (value !== undefined) return value
  }
  return undefined
}

const P = (name: string) => [`FANG_${name}`, `OPENCODE_${name}`] as const

export namespace Flag {
  export const OTEL_EXPORTER_OTLP_ENDPOINT = process.env["OTEL_EXPORTER_OTLP_ENDPOINT"]
  export const OTEL_EXPORTER_OTLP_HEADERS = process.env["OTEL_EXPORTER_OTLP_HEADERS"]
  export const FANG_AUTO_HEAP_SNAPSHOT = truthy(...P("AUTO_HEAP_SNAPSHOT"))
  export const OPENCODE_AUTO_HEAP_SNAPSHOT = FANG_AUTO_HEAP_SNAPSHOT
  export const FANG_SHOW_TTFD = truthy(...P("SHOW_TTFD"))
  export const OPENCODE_SHOW_TTFD = FANG_SHOW_TTFD
  export const FANG_DISABLE_MOUSE = truthy(...P("DISABLE_MOUSE"))
  export const OPENCODE_DISABLE_MOUSE = FANG_DISABLE_MOUSE

  export const FANG_AUTO_SHARE = truthy(...P("AUTO_SHARE"))
  export const OPENCODE_AUTO_SHARE = FANG_AUTO_SHARE
  export const FANG_GIT_BASH_PATH = string(...P("GIT_BASH_PATH"))
  export const OPENCODE_GIT_BASH_PATH = FANG_GIT_BASH_PATH
  export const FANG_CONFIG = string(...P("CONFIG"))
  export const OPENCODE_CONFIG = FANG_CONFIG
  export declare const FANG_TUI_CONFIG: string | undefined
  export declare const OPENCODE_TUI_CONFIG: string | undefined
  export declare const FANG_CONFIG_DIR: string | undefined
  export declare const OPENCODE_CONFIG_DIR: string | undefined
  export declare const OPENCODE_PLUGIN_META_FILE: string | undefined
  export declare const OPENCODE_PURE: boolean
  export const FANG_CONFIG_CONTENT = string(...P("CONFIG_CONTENT"))
  export const OPENCODE_CONFIG_CONTENT = FANG_CONFIG_CONTENT
  export const FANG_DISABLE_AUTOUPDATE = truthy(...P("DISABLE_AUTOUPDATE"))
  export const OPENCODE_DISABLE_AUTOUPDATE = FANG_DISABLE_AUTOUPDATE
  export const FANG_ALWAYS_NOTIFY_UPDATE = truthy(...P("ALWAYS_NOTIFY_UPDATE"))
  export const OPENCODE_ALWAYS_NOTIFY_UPDATE = FANG_ALWAYS_NOTIFY_UPDATE
  export const FANG_DISABLE_PRUNE = truthy(...P("DISABLE_PRUNE"))
  export const OPENCODE_DISABLE_PRUNE = FANG_DISABLE_PRUNE
  export const FANG_DISABLE_TERMINAL_TITLE = truthy(...P("DISABLE_TERMINAL_TITLE"))
  export const OPENCODE_DISABLE_TERMINAL_TITLE = FANG_DISABLE_TERMINAL_TITLE
  export const FANG_PERMISSION = string(...P("PERMISSION"))
  export const OPENCODE_PERMISSION = FANG_PERMISSION
  export const FANG_DISABLE_DEFAULT_PLUGINS = truthy(...P("DISABLE_DEFAULT_PLUGINS"))
  export const OPENCODE_DISABLE_DEFAULT_PLUGINS = FANG_DISABLE_DEFAULT_PLUGINS
  export const FANG_DISABLE_LSP_DOWNLOAD = truthy(...P("DISABLE_LSP_DOWNLOAD"))
  export const OPENCODE_DISABLE_LSP_DOWNLOAD = FANG_DISABLE_LSP_DOWNLOAD
  export const FANG_ENABLE_EXPERIMENTAL_MODELS = truthy(...P("ENABLE_EXPERIMENTAL_MODELS"))
  export const OPENCODE_ENABLE_EXPERIMENTAL_MODELS = FANG_ENABLE_EXPERIMENTAL_MODELS
  export const FANG_DISABLE_AUTOCOMPACT = truthy(...P("DISABLE_AUTOCOMPACT"))
  export const OPENCODE_DISABLE_AUTOCOMPACT = FANG_DISABLE_AUTOCOMPACT
  export const FANG_DISABLE_MODELS_FETCH = truthy(...P("DISABLE_MODELS_FETCH"))
  export const OPENCODE_DISABLE_MODELS_FETCH = FANG_DISABLE_MODELS_FETCH
  export const FANG_DISABLE_CLAUDE_CODE = truthy(...P("DISABLE_CLAUDE_CODE"))
  export const OPENCODE_DISABLE_CLAUDE_CODE = FANG_DISABLE_CLAUDE_CODE
  export const FANG_DISABLE_CLAUDE_CODE_PROMPT = FANG_DISABLE_CLAUDE_CODE || truthy(...P("DISABLE_CLAUDE_CODE_PROMPT"))
  export const OPENCODE_DISABLE_CLAUDE_CODE_PROMPT = FANG_DISABLE_CLAUDE_CODE_PROMPT
  export const FANG_DISABLE_CLAUDE_CODE_SKILLS = FANG_DISABLE_CLAUDE_CODE || truthy(...P("DISABLE_CLAUDE_CODE_SKILLS"))
  export const OPENCODE_DISABLE_CLAUDE_CODE_SKILLS = FANG_DISABLE_CLAUDE_CODE_SKILLS
  export const FANG_DISABLE_EXTERNAL_SKILLS = FANG_DISABLE_CLAUDE_CODE_SKILLS || truthy(...P("DISABLE_EXTERNAL_SKILLS"))
  export const OPENCODE_DISABLE_EXTERNAL_SKILLS = FANG_DISABLE_EXTERNAL_SKILLS
  export declare const OPENCODE_DISABLE_PROJECT_CONFIG: boolean
  export declare const FANG_DISABLE_PROJECT_CONFIG: boolean
  export const FANG_FAKE_VCS = string(...P("FAKE_VCS"))
  export const OPENCODE_FAKE_VCS = FANG_FAKE_VCS
  export declare const OPENCODE_CLIENT: string
  export declare const FANG_CLIENT: string
  export const FANG_SERVER_PASSWORD = string(...P("SERVER_PASSWORD"))
  export const OPENCODE_SERVER_PASSWORD = FANG_SERVER_PASSWORD
  export const FANG_SERVER_USERNAME = string(...P("SERVER_USERNAME"))
  export const OPENCODE_SERVER_USERNAME = FANG_SERVER_USERNAME
  export const FANG_ENABLE_QUESTION_TOOL = truthy(...P("ENABLE_QUESTION_TOOL"))
  export const OPENCODE_ENABLE_QUESTION_TOOL = FANG_ENABLE_QUESTION_TOOL

  // Experimental
  export const FANG_EXPERIMENTAL = truthy(...P("EXPERIMENTAL"))
  export const OPENCODE_EXPERIMENTAL = FANG_EXPERIMENTAL
  export const FANG_EXPERIMENTAL_FILEWATCHER = Config.boolean("FANG_EXPERIMENTAL_FILEWATCHER").pipe(
    Config.orElse(() => Config.boolean("OPENCODE_EXPERIMENTAL_FILEWATCHER")),
    Config.withDefault(false),
  )
  export const OPENCODE_EXPERIMENTAL_FILEWATCHER = FANG_EXPERIMENTAL_FILEWATCHER
  export const FANG_EXPERIMENTAL_DISABLE_FILEWATCHER = Config.boolean("FANG_EXPERIMENTAL_DISABLE_FILEWATCHER").pipe(
    Config.orElse(() => Config.boolean("OPENCODE_EXPERIMENTAL_DISABLE_FILEWATCHER")),
    Config.withDefault(false),
  )
  export const OPENCODE_EXPERIMENTAL_DISABLE_FILEWATCHER = FANG_EXPERIMENTAL_DISABLE_FILEWATCHER
  export const FANG_EXPERIMENTAL_ICON_DISCOVERY = FANG_EXPERIMENTAL || truthy(...P("EXPERIMENTAL_ICON_DISCOVERY"))
  export const OPENCODE_EXPERIMENTAL_ICON_DISCOVERY = FANG_EXPERIMENTAL_ICON_DISCOVERY

  const copy = string(...P("EXPERIMENTAL_DISABLE_COPY_ON_SELECT"))
  export const FANG_EXPERIMENTAL_DISABLE_COPY_ON_SELECT =
    copy === undefined ? process.platform === "win32" : truthy(...P("EXPERIMENTAL_DISABLE_COPY_ON_SELECT"))
  export const OPENCODE_EXPERIMENTAL_DISABLE_COPY_ON_SELECT = FANG_EXPERIMENTAL_DISABLE_COPY_ON_SELECT
  export const FANG_ENABLE_EXA = truthy(...P("ENABLE_EXA")) || FANG_EXPERIMENTAL || truthy(...P("EXPERIMENTAL_EXA"))
  export const OPENCODE_ENABLE_EXA = FANG_ENABLE_EXA
  export const FANG_EXPERIMENTAL_BASH_DEFAULT_TIMEOUT_MS = number(...P("EXPERIMENTAL_BASH_DEFAULT_TIMEOUT_MS"))
  export const OPENCODE_EXPERIMENTAL_BASH_DEFAULT_TIMEOUT_MS = FANG_EXPERIMENTAL_BASH_DEFAULT_TIMEOUT_MS
  export const FANG_EXPERIMENTAL_OUTPUT_TOKEN_MAX = number(...P("EXPERIMENTAL_OUTPUT_TOKEN_MAX"))
  export const OPENCODE_EXPERIMENTAL_OUTPUT_TOKEN_MAX = FANG_EXPERIMENTAL_OUTPUT_TOKEN_MAX
  export const FANG_EXPERIMENTAL_OXFMT = FANG_EXPERIMENTAL || truthy(...P("EXPERIMENTAL_OXFMT"))
  export const OPENCODE_EXPERIMENTAL_OXFMT = FANG_EXPERIMENTAL_OXFMT
  export const FANG_EXPERIMENTAL_LSP_TY = truthy(...P("EXPERIMENTAL_LSP_TY"))
  export const OPENCODE_EXPERIMENTAL_LSP_TY = FANG_EXPERIMENTAL_LSP_TY
  export const FANG_EXPERIMENTAL_LSP_TOOL = FANG_EXPERIMENTAL || truthy(...P("EXPERIMENTAL_LSP_TOOL"))
  export const OPENCODE_EXPERIMENTAL_LSP_TOOL = FANG_EXPERIMENTAL_LSP_TOOL
  export const FANG_DISABLE_FILETIME_CHECK = Config.boolean("FANG_DISABLE_FILETIME_CHECK").pipe(
    Config.orElse(() => Config.boolean("OPENCODE_DISABLE_FILETIME_CHECK")),
    Config.withDefault(false),
  )
  export const OPENCODE_DISABLE_FILETIME_CHECK = FANG_DISABLE_FILETIME_CHECK
  export const FANG_EXPERIMENTAL_PLAN_MODE = FANG_EXPERIMENTAL || truthy(...P("EXPERIMENTAL_PLAN_MODE"))
  export const OPENCODE_EXPERIMENTAL_PLAN_MODE = FANG_EXPERIMENTAL_PLAN_MODE
  export const FANG_EXPERIMENTAL_WORKSPACES = FANG_EXPERIMENTAL || truthy(...P("EXPERIMENTAL_WORKSPACES"))
  export const OPENCODE_EXPERIMENTAL_WORKSPACES = FANG_EXPERIMENTAL_WORKSPACES
  export const FANG_EXPERIMENTAL_MARKDOWN = !falsy(...P("EXPERIMENTAL_MARKDOWN"))
  export const OPENCODE_EXPERIMENTAL_MARKDOWN = FANG_EXPERIMENTAL_MARKDOWN
  export const FANG_MODELS_URL = string("FANGCODE_MODELS_URL", ...P("MODELS_URL"))
  export const OPENCODE_MODELS_URL = FANG_MODELS_URL
  export const FANG_MODELS_PATH = string(...P("MODELS_PATH"))
  export const OPENCODE_MODELS_PATH = FANG_MODELS_PATH
  export const FANG_DISABLE_EMBEDDED_WEB_UI = truthy(...P("DISABLE_EMBEDDED_WEB_UI"))
  export const OPENCODE_DISABLE_EMBEDDED_WEB_UI = FANG_DISABLE_EMBEDDED_WEB_UI
  export const FANG_DB = string(...P("DB"))
  export const OPENCODE_DB = FANG_DB
  export const FANG_DISABLE_CHANNEL_DB = truthy(...P("DISABLE_CHANNEL_DB"))
  export const OPENCODE_DISABLE_CHANNEL_DB = FANG_DISABLE_CHANNEL_DB
  export const FANG_SKIP_MIGRATIONS = truthy(...P("SKIP_MIGRATIONS"))
  export const OPENCODE_SKIP_MIGRATIONS = FANG_SKIP_MIGRATIONS
  export const FANG_STRICT_CONFIG_DEPS = truthy(...P("STRICT_CONFIG_DEPS"))
  export const OPENCODE_STRICT_CONFIG_DEPS = FANG_STRICT_CONFIG_DEPS

  function number(...keys: string[]) {
    for (const key of keys) {
      const value = env(key)
      if (!value) continue
      const parsed = Number(value)
      if (Number.isInteger(parsed) && parsed > 0) return parsed
    }
    return undefined
  }
}

// Dynamic getter for FANG_DISABLE_PROJECT_CONFIG / OPENCODE_DISABLE_PROJECT_CONFIG
Object.defineProperty(Flag, "OPENCODE_DISABLE_PROJECT_CONFIG", {
  get() {
    return truthy(...P("DISABLE_PROJECT_CONFIG"))
  },
  enumerable: true,
  configurable: false,
})
// Alias
Object.defineProperty(Flag, "FANG_DISABLE_PROJECT_CONFIG", {
  get() {
    return Flag.OPENCODE_DISABLE_PROJECT_CONFIG
  },
  enumerable: true,
  configurable: false,
})

// Dynamic getter for FANG_TUI_CONFIG / OPENCODE_TUI_CONFIG
Object.defineProperty(Flag, "OPENCODE_TUI_CONFIG", {
  get() {
    return string(...P("TUI_CONFIG"))
  },
  enumerable: true,
  configurable: false,
})
Object.defineProperty(Flag, "FANG_TUI_CONFIG", {
  get() {
    return Flag.OPENCODE_TUI_CONFIG
  },
  enumerable: true,
  configurable: false,
})

// Dynamic getter for FANG_CONFIG_DIR / OPENCODE_CONFIG_DIR
Object.defineProperty(Flag, "OPENCODE_CONFIG_DIR", {
  get() {
    return string(...P("CONFIG_DIR"))
  },
  enumerable: true,
  configurable: false,
})
Object.defineProperty(Flag, "FANG_CONFIG_DIR", {
  get() {
    return Flag.OPENCODE_CONFIG_DIR
  },
  enumerable: true,
  configurable: false,
})

// Dynamic getter for OPENCODE_PURE
// This must be evaluated at access time, not module load time,
// because the CLI can set this flag at runtime
Object.defineProperty(Flag, "OPENCODE_PURE", {
  get() {
    return truthy(...P("PURE"))
  },
  enumerable: true,
  configurable: false,
})

// Dynamic getter for OPENCODE_PLUGIN_META_FILE
// This must be evaluated at access time, not module load time,
// because tests and external tooling may set this env var at runtime
Object.defineProperty(Flag, "OPENCODE_PLUGIN_META_FILE", {
  get() {
    return process.env["OPENCODE_PLUGIN_META_FILE"]
  },
  enumerable: true,
  configurable: false,
})

// Dynamic getter for FANG_CLIENT / OPENCODE_CLIENT
// This must be evaluated at access time, not module load time,
// because some commands override the client at runtime
Object.defineProperty(Flag, "OPENCODE_CLIENT", {
  get() {
    return string(...P("CLIENT")) ?? "cli"
  },
  enumerable: true,
  configurable: false,
})
Object.defineProperty(Flag, "FANG_CLIENT", {
  get() {
    return Flag.OPENCODE_CLIENT
  },
  enumerable: true,
  configurable: false,
})
