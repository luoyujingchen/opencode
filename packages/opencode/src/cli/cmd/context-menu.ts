import type { Argv } from "yargs"
import * as prompts from "@clack/prompts"
import path from "path"
import os from "os"
import { rm } from "fs/promises"
import { cmd } from "./cmd"
import { UI } from "../ui"
import { Process } from "../../util/process"
import { Filesystem } from "../../util/filesystem"

const stem = "HKCU\\Software\\Classes"
const envKey = "HKCU\\Environment"
const cmdMain = "fangcode.cmd"
const cmdAlt = "fang.cmd"

type Mode = "auto" | "path"

function id(raw: string) {
  const val = raw.trim().replace(/[^a-zA-Z0-9_.-]/g, "_")
  if (val) return val
  return "fangcode"
}

function keys(raw: string) {
  const tag = id(raw)
  return {
    dir: `${stem}\\Directory\\shell\\${tag}`,
    dirCmd: `${stem}\\Directory\\shell\\${tag}\\command`,
    folder: `${stem}\\Folder\\shell\\${tag}`,
    folderCmd: `${stem}\\Folder\\shell\\${tag}\\command`,
    bg: `${stem}\\Directory\\Background\\shell\\${tag}`,
    bgCmd: `${stem}\\Directory\\Background\\shell\\${tag}\\command`,
    drive: `${stem}\\Drive\\shell\\${tag}`,
    driveCmd: `${stem}\\Drive\\shell\\${tag}\\command`,
  }
}

async function add(input: { key: string; data: string; name?: string }) {
  const args = ["add", input.key]
  if (input.name) args.push("/v", input.name)
  if (!input.name) args.push("/ve")
  args.push("/d", input.data, "/f")
  return Process.run(["reg", ...args], { nothrow: true })
}

async function del(key: string) {
  return Process.run(["reg", "delete", key, "/f"], { nothrow: true })
}

async function has(key: string) {
  const out = await Process.run(["reg", "query", key], { nothrow: true })
  return out.code === 0
}

function failText(out: { stderr: Buffer; stdout: Buffer }) {
  const err = out.stderr.toString("utf8").trim()
  if (err) return err
  return out.stdout.toString("utf8").trim()
}

function denied(msg: string) {
  return msg.toLowerCase().includes("access is denied")
}

function quote(raw: string) {
  return `'${raw.replace(/'/g, "''")}'`
}

function startup() {
  if (process.platform !== "win32") return false
  if (process.argv.length > 2) return false
  const cwd = Filesystem.resolve(process.cwd())
  const exe = Filesystem.resolve(path.dirname(process.execPath))
  return cwd === exe
}

async function elevate(exe: string) {
  const ps = await Process.run(["where", "powershell.exe"], { nothrow: true })
  const shell = ps.code === 0 ? "powershell.exe" : "pwsh"
  const filePath = quote(path.resolve(exe))
  const args = ["context-menu", "install", "--launcher", "auto", "--id", "fangcode", "--name", "Open with FangCode"]
    .map(quote)
    .join(",")
  const cmd = `Start-Process -Verb RunAs -FilePath ${filePath} -ArgumentList ${args}`
  return Process.run([shell, "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", cmd], {
    nothrow: true,
  })
}

function menu(input: {
  id: string
  name: string
  run: {
    icon: string
    dir: string
    bg: string
  }
}) {
  const key = keys(input.id)
  return [
    { key: key.dir, data: input.name },
    { key: key.dir, name: "Icon", data: input.run.icon },
    { key: key.dirCmd, data: input.run.dir },
    { key: key.folder, data: input.name },
    { key: key.folder, name: "Icon", data: input.run.icon },
    { key: key.folderCmd, data: input.run.dir },
    { key: key.bg, data: input.name },
    { key: key.bg, name: "Icon", data: input.run.icon },
    { key: key.bgCmd, data: input.run.bg },
    { key: key.drive, data: input.name },
    { key: key.drive, name: "Icon", data: input.run.icon },
    { key: key.driveCmd, data: input.run.dir },
  ]
}

async function register(input: ReturnType<typeof menu>) {
  const errs: string[] = []
  for (const item of input) {
    const out = await add(item)
    if (out.code === 0) continue
    errs.push(failText(out))
  }
  return errs
}

function bin() {
  const local = process.env.LOCALAPPDATA
  if (local) return path.join(local, "fangcode", "bin")
  return path.join(os.homedir(), "AppData", "Local", "fangcode", "bin")
}

function main() {
  return path.join(bin(), cmdMain)
}

function alt() {
  return path.join(bin(), cmdAlt)
}

function files() {
  return [main(), alt()]
}

function body(exe: string) {
  const target = path.resolve(exe)
  return `@echo off\r\n"${target}" %*\r\n`
}

function norm(raw: string) {
  const val = raw.trim().replace(/^"|"$/g, "").replace(/\//g, "\\")
  if (val.endsWith("\\") && !/^[a-zA-Z]:\\$/.test(val)) return val.slice(0, -1).toLowerCase()
  return val.toLowerCase()
}

function split(raw: string) {
  return raw
    .split(";")
    .map((x) => x.trim())
    .filter(Boolean)
}

function decode(raw: Buffer) {
  if (raw.includes(0)) return raw.toString("utf16le")
  return raw.toString("utf8")
}

function parsePath(raw: string) {
  const line = raw
    .split(/\r?\n/)
    .map((x) => x.trim())
    .find((x) => /^path\s+reg_\w+\s+/i.test(x))
  if (!line) return ""
  const match = line.match(/^path\s+reg_\w+\s+(.*)$/i)
  if (!match) return ""
  return match[1]?.trim() ?? ""
}

async function readPath() {
  const out = await Process.run(["reg", "query", envKey, "/v", "Path"], { nothrow: true })
  if (out.code !== 0) return ""
  return parsePath(decode(out.stdout))
}

async function writePath(raw: string) {
  return Process.run(["reg", "add", envKey, "/v", "Path", "/t", "REG_EXPAND_SZ", "/d", raw, "/f"], {
    nothrow: true,
  })
}

async function addPath(dir: string) {
  const raw = await readPath()
  const list = split(raw)
  const nextList = [dir, ...list.filter((x) => norm(x) !== norm(dir))]
  const next = nextList.join(";")
  if (next === list.join(";")) return { ok: true as const, updated: false }
  const out = await writePath(next)
  if (out.code !== 0) return { ok: false as const, err: failText(out) }
  process.env.PATH = process.env.PATH ? `${dir};${process.env.PATH}` : dir
  return { ok: true as const, updated: true }
}

async function removePath(dir: string) {
  const raw = await readPath()
  const list = split(raw)
  const next = list.filter((x) => norm(x) !== norm(dir))
  if (next.length === list.length) return { ok: true as const, updated: false }
  const out = await writePath(next.join(";"))
  if (out.code !== 0) return { ok: false as const, err: failText(out) }
  return { ok: true as const, updated: true }
}

async function shim(exe: string) {
  const script = body(exe)
  for (const item of files()) {
    const prev = await Filesystem.readText(item).catch(() => "")
    if (prev !== script) {
      const err = await Filesystem.write(item, script).catch((x) => x)
      if (err) {
        return {
          ok: false as const,
          err: err instanceof Error ? err.message : String(err),
        }
      }
    }
  }
  return { ok: true as const }
}

async function link(exe: string) {
  const sh = await shim(exe)
  if (!sh.ok) return sh
  return addPath(bin())
}

async function unlink() {
  for (const item of files()) {
    if (!(await Filesystem.exists(item))) continue
    const err = await rm(item, { force: true }).catch((x) => x)
    if (err) return { ok: false as const, err: err instanceof Error ? err.message : String(err) }
  }
  return removePath(bin())
}

async function ping(raw: string) {
  const out = await Process.run([raw, "--version"], {
    nothrow: true,
    timeout: 4_000,
  })
  return out.code === 0
}

async function launch(input: { mode: Mode; exe?: string }) {
  const exe = path.resolve(input.exe ?? process.execPath)
  if (input.mode === "auto") {
    const out = await shim(exe)
    if (out.ok) {
      const cmd = main()
      if (await ping(cmd)) {
        return {
          mode: "auto" as const,
          shim: true as const,
          icon: `"${exe}"`,
          dir: `"${cmd}" "%1"`,
          bg: `"${cmd}" "%V"`,
        }
      }
    }

    return {
      mode: "path" as const,
      shim: false as const,
      icon: `"${exe}"`,
      dir: `"${exe}" "%1"`,
      bg: `"${exe}" "%V"`,
    }
  }

  return {
    mode: "path" as const,
    shim: false as const,
    icon: `"${exe}"`,
    dir: `"${exe}" "%1"`,
    bg: `"${exe}" "%V"`,
  }
}

export namespace ContextMenuAuto {
  export async function ensure(exe = process.execPath) {
    if (process.platform !== "win32") return

    const key = keys("fangcode")
    const [dir, folder, bg, drive] = await Promise.all([has(key.dir), has(key.folder), has(key.bg), has(key.drive)])

    // Always ensure shim + PATH on Windows
    const auto = startup()
    const lk = await link(exe)
    if (!lk.ok) {
      const sh = await shim(exe)
      if (!sh.ok) return
    }

    if (dir && folder && bg && drive) return

    const target = path.resolve(exe)
    const run = {
      icon: `"${target}"`,
      dir: `"${target}" "%1"`,
      bg: `"${target}" "%V"`,
    }
    const errs = await register(
      menu({
        id: "fangcode",
        name: "Open with FangCode",
        run,
      }),
    )

    if (!auto) return
    if (!errs.some(denied)) return
    await elevate(exe)
  }
}

export const ContextMenuInstallCommand = cmd({
  command: "install",
  describe: "register Windows Explorer right-click open",
  builder: (yargs: Argv) =>
    yargs
      .option("id", {
        type: "string",
        describe: "registry id",
        default: "fangcode",
      })
      .option("name", {
        type: "string",
        describe: "menu label",
        default: "Open with FangCode",
      })
      .option("launcher", {
        type: "string",
        choices: ["auto", "path"],
        describe: "auto: use linked command when available, fallback to executable path",
        default: "auto",
      })
      .option("exe", {
        type: "string",
        describe: "path to executable (used when --launcher=path)",
      }),
  handler: async (args: { id: string; name: string; launcher: string; exe?: string }) => {
    if (process.platform !== "win32") {
      UI.error("This command is only available on Windows")
      process.exitCode = 1
      return
    }

    const mode = args.launcher === "path" ? "path" : "auto"
    const run = await launch({ mode, exe: args.exe })

    prompts.intro("Windows context menu")
    const errs = await register(menu({ id: args.id, name: args.name, run }))

    if (errs.length > 0) {
      prompts.log.error("Failed to register context menu")
      errs.forEach((x) => prompts.log.error(x))
      if (errs.some(denied)) {
        prompts.log.warn("Current install uses per-user HKCU registration; access may be blocked by system policy")
      }
      prompts.outro("Done")
      process.exitCode = 1
      return
    }

    prompts.log.success("Registered context menu for folder, folder class, folder background, and drive")
    if (run.mode === "auto" && run.shim) {
      prompts.log.info("Launcher mode: linked fangcode.cmd (stable for right-click)")
      prompts.log.info("If exe path/version changes, run install again once to refresh link")
    }
    if (run.mode === "path") {
      prompts.log.warn("Launcher mode: executable path (re-run install if exe path changes)")
    }
    prompts.outro("Done")
  },
})

export const ContextMenuLinkCommand = cmd({
  command: "link",
  describe: "install fangcode command for current user",
  builder: (yargs: Argv) =>
    yargs.option("exe", {
      type: "string",
      describe: "path to executable",
      default: process.execPath,
    }),
  handler: async (args: { exe: string }) => {
    if (process.platform !== "win32") {
      UI.error("This command is only available on Windows")
      process.exitCode = 1
      return
    }

    prompts.intro("Windows command link")
    const out = await link(args.exe)
    if (!out.ok) {
      prompts.log.error("Failed to install fangcode command")
      prompts.log.error(out.err)
      if (denied(out.err)) {
        prompts.log.warn("Updating user PATH may be blocked by system policy")
      }
      prompts.outro("Done")
      process.exitCode = 1
      return
    }

    prompts.log.success("Installed fangcode command")
    prompts.log.info("Command files: " + main() + " ; " + alt())
    if (out.updated) prompts.log.info("User PATH updated; reopen terminal to use fang/fangcode immediately")
    prompts.outro("Done")
  },
})

export const ContextMenuUnlinkCommand = cmd({
  command: "unlink",
  describe: "remove fangcode command for current user",
  handler: async () => {
    if (process.platform !== "win32") {
      UI.error("This command is only available on Windows")
      process.exitCode = 1
      return
    }

    prompts.intro("Windows command link")
    const out = await unlink()
    if (!out.ok) {
      prompts.log.error("Failed to remove fangcode command")
      prompts.log.error(out.err)
      prompts.outro("Done")
      process.exitCode = 1
      return
    }

    prompts.log.success("Removed fangcode command")
    if (out.updated) prompts.log.info("User PATH updated; reopen terminal to refresh PATH")
    prompts.outro("Done")
  },
})

export const ContextMenuUninstallCommand = cmd({
  command: "uninstall",
  describe: "remove Windows Explorer right-click open",
  builder: (yargs: Argv) =>
    yargs.option("id", {
      type: "string",
      describe: "registry id",
      default: "fangcode",
    }),
  handler: async (args: { id: string }) => {
    if (process.platform !== "win32") {
      UI.error("This command is only available on Windows")
      process.exitCode = 1
      return
    }

    const key = keys(args.id)
    prompts.intro("Windows context menu")

    const list = [key.dir, key.folder, key.bg, key.drive]
    const errs: string[] = []
    for (const item of list) {
      const out = await del(item)
      if (out.code === 0) continue

      const txt = failText(out)
      if (txt.toLowerCase().includes("unable to find")) continue
      errs.push(txt)
    }

    if (errs.length > 0) {
      prompts.log.error("Failed to remove context menu")
      errs.forEach((x) => prompts.log.error(x))
      prompts.outro("Done")
      process.exitCode = 1
      return
    }

    prompts.log.success("Context menu removed")
    prompts.outro("Done")
  },
})

export const ContextMenuStatusCommand = cmd({
  command: "status",
  describe: "show Windows Explorer right-click open status",
  builder: (yargs: Argv) =>
    yargs.option("id", {
      type: "string",
      describe: "registry id",
      default: "fangcode",
    }),
  handler: async (args: { id: string }) => {
    if (process.platform !== "win32") {
      UI.error("This command is only available on Windows")
      process.exitCode = 1
      return
    }

    const key = keys(args.id)
    prompts.intro("Windows context menu")
    const [dir, folder, bg, drive] = await Promise.all([has(key.dir), has(key.folder), has(key.bg), has(key.drive)])

    prompts.log.info(`Folder: ${dir ? "installed" : "missing"}`)
    prompts.log.info(`Folder class: ${folder ? "installed" : "missing"}`)
    prompts.log.info(`Folder background: ${bg ? "installed" : "missing"}`)
    prompts.log.info(`Drive: ${drive ? "installed" : "missing"}`)

    if (dir && folder && bg && drive) prompts.log.success("Context menu is fully installed")
    if (!dir || !folder || !bg || !drive) prompts.log.warn("Context menu is not fully installed")

    prompts.outro("Done")
  },
})

export const ContextMenuCommand = cmd({
  command: "context-menu",
  describe: "manage Windows Explorer context menu",
  builder: (yargs: Argv) =>
    yargs
      .command(ContextMenuInstallCommand)
      .command(ContextMenuUninstallCommand)
      .command(ContextMenuStatusCommand)
      .command(ContextMenuLinkCommand)
      .command(ContextMenuUnlinkCommand)
      .demandCommand(),
  handler: async () => {},
})
