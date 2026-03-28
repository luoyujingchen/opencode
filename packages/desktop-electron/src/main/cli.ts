import { execFileSync, spawn } from "node:child_process"
import { EventEmitter } from "node:events"
import { chmodSync, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs"
import { homedir, tmpdir } from "node:os"
import { dirname, join } from "node:path"
import readline from "node:readline"
import { fileURLToPath } from "node:url"
import { app } from "electron"
import treeKill from "tree-kill"

import { WSL_ENABLED_KEY } from "./constants"
import { getUserShell, loadShellEnv, mergeShellEnv } from "./shell-env"
import { store } from "./store"

const CLI_INSTALL_DIR = ".fangcode/bin"
const CLI_BINARY_NAME = "fangcode"
const ENV_KEY = "HKCU\\Environment"

export type ServerConfig = {
  hostname?: string
  port?: number
}

export type Config = {
  server?: ServerConfig
}

export type TerminatedPayload = { code: number | null; signal: number | null }

export type CommandEvent =
  | { type: "stdout"; value: string }
  | { type: "stderr"; value: string }
  | { type: "error"; value: string }
  | { type: "terminated"; value: TerminatedPayload }
  | { type: "sqlite"; value: SqliteMigrationProgress }

export type SqliteMigrationProgress = { type: "InProgress"; value: number } | { type: "Done" }

export type CommandChild = {
  pid: number | undefined
  kill: () => void
}

const root = dirname(fileURLToPath(import.meta.url))

export function getSidecarPath() {
  const suffix = process.platform === "win32" ? ".exe" : ""
  const path = app.isPackaged
    ? join(process.resourcesPath, `fangcode-cli${suffix}`)
    : join(root, "../../resources", `fangcode-cli${suffix}`)
  console.log(`[cli] Sidecar path resolved: ${path} (isPackaged: ${app.isPackaged})`)
  return path
}

export async function getConfig(): Promise<Config | null> {
  const { events } = spawnCommand("debug config", {})
  let output = ""

  await new Promise<void>((resolve) => {
    events.on("stdout", (line: string) => {
      output += line
    })
    events.on("stderr", (line: string) => {
      output += line
    })
    events.on("terminated", () => resolve())
    events.on("error", () => resolve())
  })

  try {
    return JSON.parse(output) as Config
  } catch {
    return null
  }
}

export async function installCli(): Promise<string> {
  if (process.platform === "win32") {
    return installCliWindows()
  }

  const sidecar = getSidecarPath()
  const scriptPath = join(app.getAppPath(), "install")
  const script = readFileSync(scriptPath, "utf8")
  const tempScript = join(tmpdir(), "opencode-install.sh")

  writeFileSync(tempScript, script, "utf8")
  chmodSync(tempScript, 0o755)

  const cmd = spawn(tempScript, ["--binary", sidecar], { stdio: "pipe" })
  return await new Promise<string>((resolve, reject) => {
    cmd.on("exit", (code: number | null) => {
      try {
        unlinkSync(tempScript)
      } catch {}
      if (code === 0) {
        const installPath = getCliInstallPath()
        if (installPath) return resolve(installPath)
        return reject(new Error("Could not determine install path"))
      }
      reject(new Error("Install script failed"))
    })
  })
}

export function syncCli() {
  if (!app.isPackaged) return
  if (process.platform === "win32") {
    void installCli().catch(() => undefined)
    return
  }
  const installPath = getCliInstallPath()
  if (!installPath) return

  let version = ""
  try {
    version = execFileSync(installPath, ["--version"], { windowsHide: true }).toString().trim()
  } catch {
    return
  }

  const cli = parseVersion(version)
  const appVersion = parseVersion(app.getVersion())
  if (!cli || !appVersion) return
  if (compareVersions(cli, appVersion) >= 0) return
  void installCli().catch(() => undefined)
}

export function serve(hostname: string, port: number, password: string) {
  const args = `--print-logs --log-level WARN serve --hostname ${hostname} --port ${port}`
  const env = {
    FANG_SERVER_USERNAME: "fangcode",
    OPENCODE_SERVER_USERNAME: "fangcode",
    FANG_SERVER_PASSWORD: password,
    OPENCODE_SERVER_PASSWORD: password,
  }

  return spawnCommand(args, env)
}

export function spawnCommand(args: string, extraEnv: Record<string, string>) {
  console.log(`[cli] Spawning command with args: ${args}`)
  const base = Object.fromEntries(
    Object.entries(process.env).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  )
  const env = {
    ...base,
    FANG_EXPERIMENTAL_ICON_DISCOVERY: "true",
    OPENCODE_EXPERIMENTAL_ICON_DISCOVERY: "true",
    FANG_EXPERIMENTAL_FILEWATCHER: "true",
    OPENCODE_EXPERIMENTAL_FILEWATCHER: "true",
    FANG_CLIENT: "desktop",
    OPENCODE_CLIENT: "desktop",
    XDG_STATE_HOME: app.getPath("userData"),
    ...extraEnv,
  }
  const shell = process.platform === "win32" ? null : getUserShell()
  const envs = shell ? mergeShellEnv(loadShellEnv(shell), env) : env

  const { cmd, cmdArgs } = buildCommand(args, envs, shell)
  console.log(`[cli] Executing: ${cmd} ${cmdArgs.join(" ")}`)
  const child = spawn(cmd, cmdArgs, {
    env: envs,
    detached: process.platform !== "win32",
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  })
  console.log(`[cli] Spawned process with PID: ${child.pid}`)

  const events = new EventEmitter()
  const exit = new Promise<TerminatedPayload>((resolve) => {
    child.on("exit", (code: number | null, signal: NodeJS.Signals | null) => {
      console.log(`[cli] Process exited with code: ${code}, signal: ${signal}`)
      resolve({ code: code ?? null, signal: null })
    })
    child.on("error", (error: Error) => {
      console.error(`[cli] Process error: ${error.message}`)
      events.emit("error", error.message)
    })
  })

  const stdout = child.stdout
  const stderr = child.stderr

  if (stdout) {
    readline.createInterface({ input: stdout }).on("line", (line: string) => {
      if (handleSqliteProgress(events, line)) return
      events.emit("stdout", `${line}\n`)
    })
  }

  if (stderr) {
    readline.createInterface({ input: stderr }).on("line", (line: string) => {
      if (handleSqliteProgress(events, line)) return
      events.emit("stderr", `${line}\n`)
    })
  }

  exit.then((payload) => {
    events.emit("terminated", payload)
  })

  const kill = () => {
    if (!child.pid) return
    treeKill(child.pid)
  }

  return { events, child: { pid: child.pid, kill }, exit }
}

function handleSqliteProgress(events: EventEmitter, line: string) {
  const stripped = line.startsWith("sqlite-migration:") ? line.slice("sqlite-migration:".length).trim() : null
  if (!stripped) return false
  if (stripped === "done") {
    events.emit("sqlite", { type: "Done" })
    return true
  }
  const value = Number.parseInt(stripped, 10)
  if (!Number.isNaN(value)) {
    events.emit("sqlite", { type: "InProgress", value })
    return true
  }
  return false
}

function buildCommand(args: string, env: Record<string, string>, shell: string | null) {
  if (process.platform === "win32" && isWslEnabled()) {
    console.log(`[cli] Using WSL mode`)
    const version = app.getVersion()
    const script = [
      "set -e",
      'BIN="$HOME/.fangcode/bin/fangcode"',
      'if [ ! -x "$BIN" ]; then',
      '  BIN="$HOME/.opencode/bin/opencode"',
      "fi",
      'if [ ! -x "$BIN" ]; then',
      `  curl -fsSL https://opencode.ai/install | bash -s -- --version ${shellEscape(version)} --no-modify-path`,
      "fi",
      `${envPrefix(env)} exec "$BIN" ${args}`,
    ].join("\n")

    return { cmd: "wsl", cmdArgs: ["-e", "bash", "-lc", script] }
  }

  if (process.platform === "win32") {
    const sidecar = getSidecarPath()
    console.log(`[cli] Windows direct mode, sidecar: ${sidecar}`)
    return { cmd: sidecar, cmdArgs: args.split(" ") }
  }

  const sidecar = getSidecarPath()
  const user = shell || getUserShell()
  const line = user.endsWith("/nu") ? `^\"${sidecar}\" ${args}` : `\"${sidecar}\" ${args}`
  console.log(`[cli] Unix mode, shell: ${user}, command: ${line}`)
  return { cmd: user, cmdArgs: ["-l", "-c", line] }
}

function envPrefix(env: Record<string, string>) {
  const entries = Object.entries(env).map(([key, value]) => `${key}=${shellEscape(value)}`)
  return entries.join(" ")
}

function shellEscape(input: string) {
  if (!input) return "''"
  return `'${input.replace(/'/g, `'"'"'`)}'`
}

function windowsDir() {
  const local = process.env.LOCALAPPDATA
  if (local) return join(local, "fangcode", "bin")
  return join(homedir(), "AppData", "Local", "fangcode", "bin")
}

function windowsBody(exe: string) {
  return `@echo off\r\n"${exe}" %*\r\n`
}

function npmDir() {
  for (const cmd of ["npm.cmd", "npm"]) {
    try {
      const out = execFileSync(cmd, ["prefix", "-g"], {
        encoding: "utf8",
        windowsHide: true,
      }).trim()
      if (out) return out
    } catch {}
  }
  const appdata = process.env.APPDATA
  if (!appdata) return ""
  return join(appdata, "npm")
}

function windowsDirs() {
  const out: string[] = []
  const list = [npmDir(), windowsDir()]
  for (const item of list) {
    if (!item) continue
    if (out.some((x) => norm(x) === norm(item))) continue
    out.push(item)
  }
  return out
}

function writeCmd(dir: string, exe: string) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  const body = windowsBody(exe)
  const main = join(dir, "fangcode.cmd")
  const alt = join(dir, "fang.cmd")
  writeFileSync(main, body, "ascii")
  writeFileSync(alt, body, "ascii")
  return main
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

function readPath() {
  try {
    return parsePath(execFileSync("reg.exe", ["query", ENV_KEY, "/v", "Path"], { encoding: "utf8", windowsHide: true }))
  } catch {
    return ""
  }
}

function writePath(raw: string) {
  execFileSync("reg.exe", ["add", ENV_KEY, "/v", "Path", "/t", "REG_EXPAND_SZ", "/d", raw, "/f"], {
    windowsHide: true,
  })
}

function addPath(dir: string) {
  const raw = readPath()
  const list = split(raw)
  const next = [dir, ...list.filter((x) => norm(x) !== norm(dir))]
  if (next.join(";") !== list.join(";")) {
    writePath(next.join(";"))
  }

  const env = split(process.env.PATH ?? "")
  const has = env.some((x) => norm(x) === norm(dir))
  if (has) return
  process.env.PATH = process.env.PATH ? `${dir};${process.env.PATH}` : dir
}

function installCliWindows() {
  const exe = getSidecarPath()
  if (!existsSync(exe)) {
    throw new Error(`CLI binary not found: ${exe}`)
  }

  const list = windowsDirs()
  let file = ""
  const err: string[] = []
  for (const dir of list) {
    try {
      const next = writeCmd(dir, exe)
      try {
        addPath(dir)
      } catch {}
      if (!file) file = next
    } catch (e) {
      err.push(e instanceof Error ? e.message : String(e))
    }
  }

  if (file) return file
  throw new Error(err.join("; "))
}

function getCliInstallPath() {
  const home = process.env.HOME
  if (!home) return null
  return join(home, CLI_INSTALL_DIR, CLI_BINARY_NAME)
}

function isWslEnabled() {
  return store.get(WSL_ENABLED_KEY) === true
}

function parseVersion(value: string) {
  const parts = value
    .replace(/^v/, "")
    .split(".")
    .map((part) => Number.parseInt(part, 10))
  if (parts.some((part) => Number.isNaN(part))) return null
  return parts
}

function compareVersions(a: number[], b: number[]) {
  const len = Math.max(a.length, b.length)
  for (let i = 0; i < len; i += 1) {
    const left = a[i] ?? 0
    const right = b[i] ?? 0
    if (left > right) return 1
    if (left < right) return -1
  }
  return 0
}
