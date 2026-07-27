import path from "path"
import { describe, expect, test } from "bun:test"
import { Effect } from "effect"
import { NpmConfig } from "@opencode-ai/core/npm-config"
import { tmpdir } from "./fixture/tmpdir"

function env(name: string, value: string) {
  const previous = process.env[name]
  process.env[name] = value
  return {
    [Symbol.dispose]() {
      if (previous === undefined) {
        delete process.env[name]
        return
      }
      process.env[name] = previous
    },
  }
}

describe("NpmConfig.load", () => {
  test("reads registry from project .npmrc", async () => {
    await using tmp = await tmpdir()
    await Bun.write(path.join(tmp.path, ".npmrc"), "registry=https://registry.example.test/\n")

    const config = await Effect.runPromise(NpmConfig.load(tmp.path))

    expect(config.registry).toBe("https://registry.example.test/")
  })

  test("reads scoped registries from project .npmrc", async () => {
    await using tmp = await tmpdir()
    await Bun.write(path.join(tmp.path, ".npmrc"), "@acme:registry=https://npm.acme.test/\n")

    const config = await Effect.runPromise(NpmConfig.load(tmp.path))

    expect(config["@acme:registry"]).toBe("https://npm.acme.test/")
  })

  test("flattens boolean and list options", async () => {
    await using tmp = await tmpdir()
    await Bun.write(path.join(tmp.path, ".npmrc"), "ignore-scripts=true\nomit[]=dev\nomit[]=optional\n")

    const config = await Effect.runPromise(NpmConfig.load(tmp.path))

    expect(config.ignoreScripts).toBe(true)
    expect(config.omit).toEqual(["dev", "optional"])
  })
})

describe("NpmConfig.registry", () => {
  test("uses FangCode mirror default when registry is not explicitly configured", async () => {
    await using tmp = await tmpdir()

    await expect(Effect.runPromise(NpmConfig.registry(tmp.path))).resolves.toBe(
      "https://mirrors.huawei-bakcloud.com/repository/npm",
    )
  })

  test("normalizes configured registry without trailing slash", async () => {
    await using tmp = await tmpdir()
    await Bun.write(path.join(tmp.path, ".npmrc"), "registry=https://registry.example.test/\n")

    await expect(Effect.runPromise(NpmConfig.registry(tmp.path))).resolves.toBe("https://registry.example.test")
  })

  test("uses explicit registry from environment", async () => {
    await using tmp = await tmpdir()
    using _ = env("npm_config_registry", "https://registry.env.example/")

    await expect(Effect.runPromise(NpmConfig.registry(tmp.path))).resolves.toBe("https://registry.env.example")
  })

  test("leaves configured registry without trailing slash unchanged", async () => {
    await using tmp = await tmpdir()
    await Bun.write(path.join(tmp.path, ".npmrc"), "registry=https://registry.example.test\n")

    await expect(Effect.runPromise(NpmConfig.registry(tmp.path))).resolves.toBe("https://registry.example.test")
  })
})
