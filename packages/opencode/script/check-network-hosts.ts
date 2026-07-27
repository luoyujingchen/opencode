#!/usr/bin/env bun

import path from "path"

const root = path.resolve(import.meta.dir, "../../..")
const hosts = [
  "https://github.com",
  "https://api.github.com",
  "https://raw.githubusercontent.com",
  "https://github-bak.com",
  "https://api.github-bak.com",
  "https://registry.npmjs.org",
  "https://models.dev",
  "https://pkg.pr.new",
  "https://formulae.brew.sh",
  "https://community.chocolatey.org",
  "http://xiaofang-newapi.qyfbeta.com",
]

const targets = [
  "install",
  "packages/app/src/i18n/en.ts",
  "packages/app/src/i18n/zh.ts",
  "packages/app/src/desktop-menu.ts",
  "packages/app/src/pages/layout/helpers.ts",
  "packages/cli/src/**/*.ts",
  "packages/cli/script/**/*.ts",
  "packages/core/src/source.ts",
  "packages/core/src/npm-config.ts",
  "packages/core/src/models-dev.ts",
  "packages/core/src/repository.ts",
  "packages/core/src/ripgrep/binary.ts",
  "packages/console/app/src/i18n/en.ts",
  "packages/console/app/src/i18n/zh.ts",
  "packages/console/app/src/routes/index.tsx",
  "packages/console/app/src/routes/download/index.tsx",
  "packages/console/app/src/routes/temp.tsx",
  "packages/console/app/src/routes/openapi.json.ts",
  "packages/opencode/src/**/*.{ts,tsx}",
  "packages/opencode/script/**/*.ts",
  "packages/server/src/**/*.ts",
  "packages/ui/vite.config.ts",
  "packages/web/src/content/docs/index.mdx",
  "packages/web/src/content/docs/zh-cn/index.mdx",
  "packages/desktop/src/**/*.{ts,tsx}",
  "packages/desktop/scripts/**/*.ts",
  "packages/desktop-electron/src/**/*.ts",
  "packages/desktop-electron/scripts/**/*.ts",
  "packages/desktop-electron/electron-builder.config.ts",
]

const allow = [
  "packages/core/src/source.ts",
  "packages/opencode/script/check-network-hosts.ts",
  "packages/opencode/script/publish.ts",
  "packages/opencode/script/schema.ts",
  "packages/opencode/src/server/server.ts",
  "packages/core/src/models-dev.ts",
  "packages/opencode/src/tool/edit.ts",
  "packages/opencode/src/provider/error.ts",
  "packages/opencode/src/provider/provider.ts",
  "packages/opencode/src/agent/agent.ts",
  "packages/opencode/src/acp/README.md",
  "packages/opencode/src/cli/cmd/github.ts",
  "packages/opencode/parsers-config.ts",
  "packages/opencode/test/",
  "packages/ui/src/components/timeline-playground.stories.tsx",
  "install",
  "packages/desktop/src/menu.ts",
  "packages/desktop/src/release.ts",
  "packages/desktop/scripts/finalize-latest-json.ts",
  "packages/desktop-electron/src/main/menu.ts",
  "packages/desktop-electron/src/main/release.ts",
  "packages/desktop/src-tauri/",
]

const allowHosts = [
  ["packages/cli/script/build.ts", "https://github.com"],
  ["packages/cli/script/generate.ts", "https://models.dev"],
  ["packages/cli/script/publish.ts", "https://github.com"],
  ["packages/app/src/desktop-menu.ts", "https://github-bak.com"],
  ["packages/console/app/src/routes/openapi.json.ts", "https://github-bak.com"],
  ["packages/console/app/src/routes/temp.tsx", "https://github-bak.com"],
  ["packages/console/app/src/routes/temp.tsx", "https://models.dev"],
  ["packages/opencode/src/installation/index.ts", "https://formulae.brew.sh"],
  ["packages/opencode/src/installation/index.ts", "https://community.chocolatey.org"],
  ["packages/web/src/content/docs/index.mdx", "https://github-bak.com"],
  ["packages/web/src/content/docs/zh-cn/index.mdx", "https://github-bak.com"],
] as const

const files = Array.from(new Set((await Promise.all(targets.map((item) => Array.fromAsync(new Bun.Glob(item).scan({ cwd: root, dot: true }))))).flat()))

const bad = (
  await Promise.all(
    files
      .filter((file) => !file.includes("node_modules/"))
      .filter((file) => !allow.some((item) => file.startsWith(item) || file === item))
      .map(async (file) => {
        const text = await Bun.file(path.join(root, file)).text().catch(() => "")
        return hosts
          .filter((host) => text.includes(host))
          .filter((host) => !allowHosts.some((item) => item[0] === file && item[1] === host))
          .map((host) => `${file}: ${host}`)
      }),
  )
).flat()

if (bad.length) {
  console.error("Found hardcoded network hosts in active files:")
  console.error(bad.join("\n"))
  process.exit(1)
}

console.log("network host scan passed")
