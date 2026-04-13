import { check } from "@tauri-apps/plugin-updater"
import { relaunch } from "@tauri-apps/plugin-process"
import { ask, message } from "@tauri-apps/plugin-dialog"
import { type as ostype } from "@tauri-apps/plugin-os"
import pkg from "../package.json"

import { initI18n, t } from "./i18n"
import { cmp, next } from "./release"
import { commands } from "./bindings"

export const UPDATER_ENABLED = window.__OPENCODE__?.updaterEnabled ?? false

export async function runUpdater({ alertOnFail }: { alertOnFail: boolean }) {
  await initI18n()

  const ver = await next(pkg.version)
  if (!ver) {
    if (alertOnFail) await message(t("desktop.updater.none.message"), { title: t("desktop.updater.none.title") })
    return
  }

  const update = await check().catch(() => null)
  if (!update?.version || cmp(update.version, ver) !== 0) {
    if (alertOnFail) await message(t("desktop.updater.none.message"), { title: t("desktop.updater.none.title") })
    return
  }

  try {
    await update.download()
  } catch {
    if (alertOnFail) await message(t("desktop.updater.none.message"), { title: t("desktop.updater.none.title") })
    return
  }

  const shouldUpdate = await ask(t("desktop.updater.downloaded.prompt", { version: update.version }), {
    title: t("desktop.updater.downloaded.title"),
  })
  if (!shouldUpdate) return

  try {
    if (ostype() === "windows") await commands.killSidecar()
    await update.install()
  } catch {
    await message(t("desktop.updater.installFailed.message"), { title: t("desktop.updater.installFailed.title") })
    return
  }

  await commands.killSidecar()
  await relaunch()
}
