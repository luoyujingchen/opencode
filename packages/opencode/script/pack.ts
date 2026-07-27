#!/usr/bin/env bun
import { $ } from "bun"
import pkg from "../package.json"
import { fileURLToPath } from "url"
import { cp, mkdir, rm } from "node:fs/promises"

const dir = fileURLToPath(new URL("..", import.meta.url))
process.chdir(dir)

const binaries: Record<string, string> = {}
for (const filepath of new Bun.Glob("*/package.json").scanSync({ cwd: "./dist" })) {
  const mod = await Bun.file(`./dist/${filepath}`).json()
  binaries[mod.name] = mod.version
}

if (Object.keys(binaries).length === 0) {
  throw new Error(
    "No platform binaries found in ./dist. Run build first, for example: bun run script/build.ts --single",
  )
}

const version = Object.values(binaries)[0]
const base = "fangcode"
const bin = "fangcode"
const root = `./dist/${base}`

await rm(root, { recursive: true, force: true })
await mkdir(root, { recursive: true })
await cp("./bin", `${root}/bin`, { recursive: true })
await cp("./script/postinstall.mjs", `${root}/postinstall.mjs`)
await Bun.file(`${root}/LICENSE`).write(await Bun.file("../../LICENSE").text())

const map = { win32: "windows", darwin: "darwin", linux: "linux" } as const
const os = map[process.platform as keyof typeof map]
const cpu = process.arch
const key = Object.keys(binaries).find((x) => x.startsWith(`${base}-${os}-${cpu}`)) ?? Object.keys(binaries)[0]
const ext = key.includes("windows") ? ".exe" : ""
const file = `./dist/${key}/bin/${bin}${ext}`
if (await Bun.file(file).exists()) {
  await Bun.write(`${root}/bin/.fangcode${ext}`, await Bun.file(file).bytes())
  console.log(`Embedded binary: ${file}`)
} else {
  console.warn(`Binary not found for embed: ${file}`)
}

await Bun.file(`${root}/package.json`).write(
  JSON.stringify(
    {
      name: "fangcode",
      bin: {
        fang: "./bin/fangcode",
        fangcode: "./bin/fangcode",
      },
      scripts: {
        postinstall: "bun ./postinstall.mjs || node ./postinstall.mjs",
      },
      version,
      license: pkg.license,
      optionalDependencies: binaries,
    },
    null,
    2,
  ),
)

if (process.platform !== "win32") {
  await $`chmod -R 755 .`.cwd(root)
}

await $`bun pm pack`.cwd(root)
const files = Array.from(new Bun.Glob("*.tgz").scanSync({ cwd: root }))
if (files.length === 0) {
  throw new Error("Pack failed: no .tgz generated")
}

console.log(`Packed: ${root}/${files[0]}`)
