import { describe, expect, test } from "bun:test"
import { Source } from "../src/source"

const names = [
  "FANG_SOURCE_MODE",
  "OPENCODE_SOURCE_MODE",
  "FANG_OFFLINE",
  "OPENCODE_OFFLINE",
  "FANG_NPM_REGISTRY",
  "OPENCODE_NPM_REGISTRY",
  "FANG_GITHUB_WEB_URL",
  "OPENCODE_GITHUB_WEB_URL",
  "FANG_GITHUB_API_URL",
  "OPENCODE_GITHUB_API_URL",
  "FANG_RELEASE_LATEST_URL",
  "OPENCODE_RELEASE_LATEST_URL",
  "FANG_RELEASE_DOWNLOAD_BASE",
  "OPENCODE_RELEASE_DOWNLOAD_BASE",
  "FANG_INSTALL_URL",
  "OPENCODE_INSTALL_URL",
  "FANG_API_URL",
  "OPENCODE_API_URL",
  "FANG_APP_API_URL",
  "OPENCODE_APP_API_URL",
  "FANG_MODELS_URL",
  "OPENCODE_MODELS_URL",
  "FANG_MODELS_PATH",
  "OPENCODE_MODELS_PATH",
  "npm_config_registry",
]

function env(input: Record<string, string | undefined>, fn: () => void) {
  const prev = Object.fromEntries(names.map((name) => [name, process.env[name]]))
  names.forEach((name) => delete process.env[name])
  Object.entries(input).forEach(([key, value]) => {
    if (value !== undefined) process.env[key] = value
  })
  try {
    fn()
  } finally {
    names.forEach((name) => delete process.env[name])
    Object.entries(prev).forEach(([key, value]) => {
      if (value !== undefined) process.env[key] = value
    })
  }
}

describe("Source", () => {
  test("defaults to mirror-safe sources", () => {
    env({}, () => {
      expect(Source.mode()).toBe("mirror")
      expect(Source.githubWeb()).toBe("https://github-bak.com")
      expect(Source.githubApi()).toBe("https://api.github-bak.com")
      expect(Source.npmRegistry()).toBe("https://mirrors.huawei-bakcloud.com/repository/npm/")
    })
  })

  test("supports online mode", () => {
    env({ FANG_SOURCE_MODE: "online" }, () => {
      expect(Source.mode()).toBe("online")
      expect(Source.githubWeb("a/b")).toBe("https://github.com/a/b")
      expect(Source.githubApi("repos/a/b")).toBe("https://api.github.com/repos/a/b")
      expect(Source.npmRegistry()).toBe("https://registry.npmjs.org")
    })
  })

  test("offline flag overrides mode", () => {
    env({ FANG_SOURCE_MODE: "online", OPENCODE_OFFLINE: "true" }, () => {
      expect(Source.mode()).toBe("offline")
      expect(Source.offline()).toBe(true)
    })
  })

  test("FANG values override OPENCODE values", () => {
    env(
      {
        FANG_GITHUB_WEB_URL: "https://fang.example/",
        OPENCODE_GITHUB_WEB_URL: "https://opencode.example/",
        FANG_MODELS_PATH: "/tmp/fang-models.json",
        OPENCODE_MODELS_PATH: "/tmp/opencode-models.json",
      },
      () => {
        expect(Source.githubWeb("repo")).toBe("https://fang.example/repo")
        expect(Source.modelsPath()).toBe("/tmp/fang-models.json")
      },
    )
  })

  test("uses explicit release sources", () => {
    env(
      {
        OPENCODE_RELEASE_LATEST_URL: "https://release.example/latest",
        OPENCODE_RELEASE_DOWNLOAD_BASE: "https://release.example/download/",
        OPENCODE_INSTALL_URL: "https://release.example/install",
      },
      () => {
        expect(Source.releaseLatest()).toBe("https://release.example/latest")
        expect(Source.releaseDownload("v1/app.tar.gz")).toBe("https://release.example/download/v1/app.tar.gz")
        expect(Source.installUrl()).toBe("https://release.example/install")
      },
    )
  })

  test("supports FangCode API override", () => {
    env({ FANG_API_URL: "https://api.example/v1" }, () => {
      expect(Source.fangApi()).toBe("https://api.example/v1")
    })
  })

  test("supports FangCode app API override", () => {
    env({ FANG_APP_API_URL: "https://app.example/", OPENCODE_APP_API_URL: "https://open.example/" }, () => {
      expect(Source.appApi("get_github_app_installation")).toBe("https://app.example/get_github_app_installation")
    })
  })
})
