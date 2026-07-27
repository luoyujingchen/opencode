export * as ServerAuth from "./auth"

import { Config as EffectConfig, Context, Effect, Layer, Option, Redacted } from "effect"

export type Credentials = {
  password?: string
  username?: string
}

export type DecodedCredentials = {
  readonly username: string
  readonly password: Redacted.Redacted
}

export type Info = {
  readonly password: Option.Option<string>
  readonly username: string
}

function env(key: string) {
  return process.env[`FANG_${key}`] ?? process.env[`OPENCODE_${key}`]
}

function opt(key: string) {
  return EffectConfig.all({
    fang: EffectConfig.string(`FANG_${key}`).pipe(EffectConfig.option),
    open: EffectConfig.string(`OPENCODE_${key}`).pipe(EffectConfig.option),
  }).pipe(EffectConfig.map((cfg) => (Option.isSome(cfg.fang) ? cfg.fang : cfg.open)))
}

function text(key: string, fallback: string) {
  return opt(key).pipe(EffectConfig.map((value) => Option.getOrElse(value, () => fallback)))
}

export class Config extends Context.Service<Config, Info>()("@opencode/ServerAuthConfig") {
  static configLayer(input: Info) {
    return Layer.succeed(this, this.of(input))
  }

  static get layer() {
    return Layer.effect(
      this,
      Effect.gen(function* () {
        return Config.of(
          yield* EffectConfig.all({
            password: opt("SERVER_PASSWORD"),
            username: text("SERVER_USERNAME", "opencode"),
          }),
        )
      }),
    )
  }
}

export function required(config: Info) {
  return Option.isSome(config.password) && config.password.value !== ""
}

export function authorized(credentials: DecodedCredentials, config: Info) {
  return (
    Option.isSome(config.password) &&
    credentials.username === config.username &&
    Redacted.value(credentials.password) === config.password.value
  )
}

export function header(credentials?: Credentials) {
  const password = credentials?.password ?? env("SERVER_PASSWORD")
  if (!password) return undefined

  return `Basic ${Buffer.from(`${credentials?.username ?? env("SERVER_USERNAME") ?? "opencode"}:${password}`).toString("base64")}`
}

export function headers(credentials?: Credentials) {
  const authorization = header(credentials)
  if (!authorization) return undefined
  return { Authorization: authorization }
}
