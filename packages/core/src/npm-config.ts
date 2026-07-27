export * as NpmConfig from "./npm-config"

import { fileURLToPath } from "url"
// @ts-expect-error npm does not publish types for this internal config API.
import Config from "@npmcli/config"
// @ts-expect-error npm does not publish types for this internal config API.
import { definitions, flatten, nerfDarts, shorthands } from "@npmcli/config/lib/definitions/index.js"
import { Effect } from "effect"
import { Source } from "./source"

const npmPath = fileURLToPath(new URL("..", import.meta.url))

type Loaded = {
  readonly flat: Record<string, unknown>
  readonly data: Map<string, { readonly raw?: Record<string, unknown> }>
  load(): Promise<void>
}

const scopes = ["cli", "env", "project", "user", "global", "builtin"] as const

async function make(dir: string) {
  const cfg = new Config({
    npmPath,
    cwd: dir,
    env: { ...process.env },
    argv: [process.execPath, process.execPath],
    execPath: process.execPath,
    platform: process.platform,
    definitions,
    flatten,
    nerfDarts,
    shorthands,
    warn: false,
  }) as Loaded
  await cfg.load()
  return cfg
}

function explicit(cfg: Loaded) {
  return scopes
    .map((scope) => cfg.data.get(scope)?.raw?.registry)
    .find((value): value is string => typeof value === "string")
}

function clean(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value
}

export const load = (dir: string) =>
  Effect.tryPromise({
    try: async () => {
      const cfg = await make(dir)
      return cfg.flat
    },
    catch: (cause) => cause,
  }).pipe(Effect.orElseSucceed(() => ({}) as Record<string, unknown>))

export const registry = (dir: string) =>
  Effect.tryPromise({
    try: async () => {
      const cfg = await make(dir)
      return clean(explicit(cfg) ?? Source.npmRegistry())
    },
    catch: (cause) => cause,
  }).pipe(
    Effect.orElseSucceed(() => clean(Source.npmRegistry())),
  )
