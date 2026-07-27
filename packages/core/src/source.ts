export namespace Source {
  export type Mode = "online" | "mirror" | "offline"

  const defaults = {
    npm: {
      online: "https://registry.npmjs.org",
      mirror: "https://mirrors.huawei-bakcloud.com/repository/npm/",
    },
    web: {
      online: "https://github.com",
      mirror: "https://github-bak.com",
    },
    api: {
      online: "https://api.github.com",
      mirror: "https://api.github-bak.com",
    },
    provider: "http://xiaofang-newapi.qyfbeta.com/v1",
    appApi: "https://api.fangcode.ai",
    latest: "http://xiaofang-newapi.qyfbeta.com/v1/release/latest",
    release: "https://github-bak.com/anomalyco/fangcode/releases/download",
    models: "http://xiaofang-newapi.qyfbeta.com/v1/provider",
    install: "https://fangcode.ai/install",
  } as const

  function keys(name: string) {
    return [`FANG_${name}`, `OPENCODE_${name}`] as const
  }

  function env(...list: readonly string[]) {
    for (const key of list) {
      const value = process.env[key]
      if (value !== undefined) return value
    }
  }

  function truthy(...list: readonly string[]) {
    for (const key of list) {
      const value = process.env[key]?.toLowerCase()
      if (value === "1" || value === "true" || value === "yes") return true
    }
    return false
  }

  function clean(value: string) {
    return value.replace(/\/+$/, "")
  }

  function join(base: string, part?: string) {
    if (!part) return clean(base)
    return `${clean(base)}/${part.replace(/^\/+/, "")}`
  }

  function pick(input: string | undefined): Mode | undefined {
    if (input === "online" || input === "mirror" || input === "offline") return input
  }

  export function mode(): Mode {
    if (truthy(...keys("OFFLINE"))) return "offline"
    return pick(env(...keys("SOURCE_MODE"))) ?? "mirror"
  }

  export function offline() {
    return mode() === "offline"
  }

  export function npmRegistry() {
    const hit = env(...keys("NPM_REGISTRY")) ?? process.env.npm_config_registry
    if (hit) return hit
    return mode() === "online" ? defaults.npm.online : defaults.npm.mirror
  }

  export function githubWeb(part?: string) {
    const hit = env(...keys("GITHUB_WEB_URL"))
    const base = hit ?? (mode() === "online" ? defaults.web.online : defaults.web.mirror)
    return join(base, part)
  }

  export function githubApi(part?: string) {
    const hit = env(...keys("GITHUB_API_URL"))
    const base = hit ?? (mode() === "online" ? defaults.api.online : defaults.api.mirror)
    return join(base, part)
  }

  export function releaseLatest() {
    return env(...keys("RELEASE_LATEST_URL")) ?? defaults.latest
  }

  export function releaseDownload(part?: string) {
    return join(env(...keys("RELEASE_DOWNLOAD_BASE")) ?? defaults.release, part)
  }

  export function installUrl() {
    return env(...keys("INSTALL_URL")) ?? defaults.install
  }

  export function fangApi() {
    return env(...keys("API_URL")) ?? defaults.provider
  }

  export function appApi(part?: string) {
    return join(env(...keys("APP_API_URL")) ?? defaults.appApi, part)
  }

  export function modelsUrl(part?: string) {
    return join(env(...keys("MODELS_URL")) ?? defaults.models, part)
  }

  export function modelsPath() {
    return env(...keys("MODELS_PATH"))
  }

  export function desktopUpdateUrl() {
    return env(...keys("DESKTOP_UPDATE_URL"))
  }
}
