export * as ServerAuth from "./auth"

import { ConfigService } from "@/effect/config-service"
import { Flag } from "@opencode-ai/core/flag/flag"
import { Config as EffectConfig, Context, Option, Redacted } from "effect"

export type Credentials = {
  password?: string
  username?: string
}

export type DecodedCredentials = {
  readonly username: string
  readonly password: Redacted.Redacted
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

export class Config extends ConfigService.Service<Config>()("@opencode/ServerAuthConfig", {
  password: opt("SERVER_PASSWORD"),
  username: text("SERVER_USERNAME", "opencode"),
}) {}

export type Info = Context.Service.Shape<typeof Config>

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
  const password = credentials?.password ?? Flag.OPENCODE_SERVER_PASSWORD
  if (!password) return undefined

  const username = credentials?.username ?? Flag.OPENCODE_SERVER_USERNAME ?? "opencode"
  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`
}

export function headers(credentials?: Credentials) {
  const authorization = header(credentials)
  if (!authorization) return undefined
  return { Authorization: authorization }
}
