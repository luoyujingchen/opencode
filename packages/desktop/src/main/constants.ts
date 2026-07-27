import { app } from "electron"

type Channel = "dev" | "beta" | "prod"
const raw = process.env.FANG_CHANNEL ?? process.env.OPENCODE_CHANNEL ?? import.meta.env.OPENCODE_CHANNEL
export const CHANNEL: Channel = raw === "dev" || raw === "beta" || raw === "prod" ? raw : "dev"
const mode = process.env.FANG_SOURCE_MODE ?? process.env.OPENCODE_SOURCE_MODE
const offline =
  mode === "offline" ||
  truthy(process.env.FANG_OFFLINE) ||
  truthy(process.env.OPENCODE_OFFLINE) ||
  truthy(import.meta.env.FANG_OFFLINE) ||
  truthy(import.meta.env.OPENCODE_OFFLINE)

function truthy(value: string | undefined) {
  const text = value?.toLowerCase()
  return text === "1" || text === "true" || text === "yes"
}

export const UPDATER_ENABLED = app.isPackaged && CHANNEL !== "dev" && !offline
