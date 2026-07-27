import { Config, Option } from "effect"

export function truthy(key: string) {
  const value = raw(key)?.toLowerCase()
  return value === "true" || value === "1"
}

function alias(key: string) {
  if (!key.startsWith("OPENCODE_")) return key
  return `FANG_${key.slice("OPENCODE_".length)}`
}

function raw(key: string) {
  const fang = alias(key)
  if (fang === key) return process.env[key]
  return process.env[fang] ?? process.env[key]
}

function env(key: string) {
  return process.env[`FANG_${key}`] ?? process.env[`OPENCODE_${key}`]
}

function any(key: string) {
  return truthy(`OPENCODE_${key}`)
}

function bool(key: string) {
  return Config.all({
    fang: Config.boolean(alias(key)).pipe(Config.option),
    open: Config.boolean(key).pipe(Config.option),
  }).pipe(Config.map((cfg) => Option.getOrElse(Option.isSome(cfg.fang) ? cfg.fang : cfg.open, () => false)))
}

const copy = env("EXPERIMENTAL_DISABLE_COPY_ON_SELECT")
const fff = env("DISABLE_FFF")

function enabledByExperimental(key: string) {
  return raw(key) === undefined ? truthy("OPENCODE_EXPERIMENTAL") : truthy(key)
}

export const Flag = {
  OTEL_EXPORTER_OTLP_ENDPOINT: process.env["OTEL_EXPORTER_OTLP_ENDPOINT"],
  OTEL_EXPORTER_OTLP_HEADERS: process.env["OTEL_EXPORTER_OTLP_HEADERS"],

  OPENCODE_AUTO_HEAP_SNAPSHOT: any("AUTO_HEAP_SNAPSHOT"),
  OPENCODE_GIT_BASH_PATH: env("GIT_BASH_PATH"),
  OPENCODE_CONFIG: env("CONFIG"),
  OPENCODE_CONFIG_CONTENT: env("CONFIG_CONTENT"),
  OPENCODE_DISABLE_AUTOUPDATE: any("DISABLE_AUTOUPDATE"),
  OPENCODE_ALWAYS_NOTIFY_UPDATE: any("ALWAYS_NOTIFY_UPDATE"),
  OPENCODE_DISABLE_PRUNE: any("DISABLE_PRUNE"),
  OPENCODE_DISABLE_TERMINAL_TITLE: any("DISABLE_TERMINAL_TITLE"),
  OPENCODE_SHOW_TTFD: any("SHOW_TTFD"),
  OPENCODE_DISABLE_AUTOCOMPACT: any("DISABLE_AUTOCOMPACT"),
  OPENCODE_DISABLE_MODELS_FETCH: any("DISABLE_MODELS_FETCH"),
  OPENCODE_DISABLE_MOUSE: any("DISABLE_MOUSE"),
  OPENCODE_FAKE_VCS: env("FAKE_VCS"),
  OPENCODE_SERVER_PASSWORD: env("SERVER_PASSWORD"),
  OPENCODE_SERVER_USERNAME: env("SERVER_USERNAME"),
  OPENCODE_DISABLE_FFF: fff === undefined ? process.platform === "win32" : truthy("OPENCODE_DISABLE_FFF"),

  // Experimental
  OPENCODE_EXPERIMENTAL_FILEWATCHER: bool("OPENCODE_EXPERIMENTAL_FILEWATCHER"),
  OPENCODE_EXPERIMENTAL_DISABLE_FILEWATCHER: bool("OPENCODE_EXPERIMENTAL_DISABLE_FILEWATCHER"),
  OPENCODE_EXPERIMENTAL_DISABLE_COPY_ON_SELECT:
    copy === undefined ? process.platform === "win32" : truthy("OPENCODE_EXPERIMENTAL_DISABLE_COPY_ON_SELECT"),
  OPENCODE_MODELS_URL: env("MODELS_URL"),
  OPENCODE_MODELS_PATH: env("MODELS_PATH"),
  OPENCODE_DB: env("DB"),

  OPENCODE_WORKSPACE_ID: env("WORKSPACE_ID"),
  OPENCODE_EXPERIMENTAL_WORKSPACES: enabledByExperimental("OPENCODE_EXPERIMENTAL_WORKSPACES"),

  // Evaluated at access time (not module load) because tests, the CLI, and
  // external tooling set these env vars at runtime.
  get OPENCODE_DISABLE_PROJECT_CONFIG() {
    return any("DISABLE_PROJECT_CONFIG")
  },
  get OPENCODE_EXPERIMENTAL_REFERENCES() {
    return enabledByExperimental("OPENCODE_EXPERIMENTAL_REFERENCES")
  },
  get OPENCODE_TUI_CONFIG() {
    return env("TUI_CONFIG")
  },
  get OPENCODE_CONFIG_DIR() {
    return env("CONFIG_DIR")
  },
  get OPENCODE_PURE() {
    return any("PURE")
  },
  get OPENCODE_PERMISSION() {
    return env("PERMISSION")
  },
  get OPENCODE_PLUGIN_META_FILE() {
    return env("PLUGIN_META_FILE")
  },
  get OPENCODE_CLIENT() {
    return env("CLIENT") ?? "cli"
  },
}
