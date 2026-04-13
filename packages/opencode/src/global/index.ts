import fs from "fs/promises"
import { xdgData, xdgCache, xdgConfig, xdgState } from "xdg-basedir"
import path from "path"
import os from "os"
import { Filesystem } from "../util/filesystem"

const app = "fangcode"

const legacy = "opencode"

const data = path.join(xdgData!, app)
const cache = path.join(xdgCache!, app)
const config = path.join(xdgConfig!, app)
const state = path.join(xdgState!, app)

const legacyData = path.join(xdgData!, legacy)
const legacyCache = path.join(xdgCache!, legacy)
const legacyConfig = path.join(xdgConfig!, legacy)
const legacyState = path.join(xdgState!, legacy)

export namespace Global {
  export const Path = {
    get home() {
      return process.env.FANG_TEST_HOME || process.env.OPENCODE_TEST_HOME || os.homedir()
    },
    data,
    bin: path.join(cache, "bin"),
    log: path.join(data, "log"),
    cache,
    config,
    state,
    legacyData,
    legacyCache,
    legacyConfig,
    legacyState,
  }
}

// Migrate legacy opencode dirs to fangcode before creating new dirs.
// If the legacy dir exists and the target does NOT, rename it in place.
async function migrateLegacyDir(legacyDir: string, targetDir: string) {
  try {
    const legacyExists = await fs.stat(legacyDir).then(
      (s) => s.isDirectory(),
      () => false,
    )
    if (!legacyExists) return
    const targetExists = await fs.stat(targetDir).then(
      (s) => s.isDirectory(),
      () => false,
    )
    if (!targetExists) {
      await fs.rename(legacyDir, targetDir)
    }
  } catch {}
}

await Promise.all([
  migrateLegacyDir(legacyData, data),
  migrateLegacyDir(legacyCache, cache),
  migrateLegacyDir(legacyConfig, config),
  migrateLegacyDir(legacyState, state),
])

await Promise.all([
  fs.mkdir(Global.Path.data, { recursive: true }),
  fs.mkdir(Global.Path.config, { recursive: true }),
  fs.mkdir(Global.Path.state, { recursive: true }),
  fs.mkdir(Global.Path.log, { recursive: true }),
  fs.mkdir(Global.Path.bin, { recursive: true }),
])

const CACHE_VERSION = "21"

const version = await Filesystem.readText(path.join(Global.Path.cache, "version")).catch(() => "0")

if (version !== CACHE_VERSION) {
  try {
    const contents = await fs.readdir(Global.Path.cache)
    await Promise.all(
      contents.map((item) =>
        fs.rm(path.join(Global.Path.cache, item), {
          recursive: true,
          force: true,
        }),
      ),
    )
  } catch (e) {}
  await Filesystem.write(path.join(Global.Path.cache, "version"), CACHE_VERSION)
}
