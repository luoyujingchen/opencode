<p align="center">
  <a href="https://fangcode.ai">
    <picture>
      <source srcset="packages/console/app/src/asset/logo-ornate-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="packages/console/app/src/asset/logo-ornate-light.svg" media="(prefers-color-scheme: light)">
      <img src="packages/console/app/src/asset/logo-ornate-light.svg" alt="FangCode logo">
    </picture>
  </a>
</p>
<p align="center">The open source AI coding agent.</p>
<p align="center">
  <a href="https://fangcode.ai/discord"><img alt="Discord" src="https://img.shields.io/discord/1391832426048651334?style=flat-square&label=discord" /></a>
  <a href="https://www.npmjs.com/package/fangcode"><img alt="npm" src="https://img.shields.io/npm/v/fangcode?style=flat-square" /></a>
  <a href="https://github.com/anomalyco/fangcode/actions/workflows/publish.yml"><img alt="Build status" src="https://img.shields.io/github/actions/workflow/status/anomalyco/fangcode/publish.yml?style=flat-square&branch=dev" /></a>
</p>

<p align="center">
  <a href="README.md">English</a> |
  <a href="README.zh.md">简体中文</a>
</p>

[![FangCode Terminal UI](packages/web/src/assets/lander/screenshot.png)](https://fangcode.ai)

---

### Installation

```bash
# YOLO
curl -fsSL https://fangcode.ai/install | bash

# Package managers
npm i -g fangcode@latest        # or bun/pnpm/yarn
scoop install fangcode          # Windows
choco install fangcode          # Windows
brew install anomalyco/tap/fangcode # macOS and Linux
paru -S fangcode-bin            # Arch Linux (Latest from AUR)
nix run github:anomalyco/fangcode # latest dev branch
```

> [!TIP]
> Remove versions older than 0.1.x before installing.

### Desktop App (BETA)

FangCode is also available as a desktop application. Download directly from the [releases page](https://github.com/anomalyco/fangcode/releases) or [fangcode.ai/download](https://fangcode.ai/download).

| Platform              | Download                           |
| --------------------- | ---------------------------------- |
| macOS (Apple Silicon) | `fangcode-desktop-mac-arm64.dmg`   |
| macOS (Intel)         | `fangcode-desktop-mac-x64.dmg`     |
| Windows               | `fangcode-desktop-windows-x64.exe` |
| Linux                 | `.deb`, `.rpm`, or `.AppImage`     |

```bash
# macOS (Homebrew)
brew install --cask fangcode-desktop
# Windows (Scoop)
scoop bucket add extras; scoop install extras/fangcode-desktop
```

#### Installation Directory

The install script respects the following priority order for the installation path:

1. `$FANG_INSTALL_DIR` - Custom installation directory
2. `$XDG_BIN_DIR` - XDG Base Directory Specification compliant path
3. `$HOME/bin` - Standard user binary directory (if it exists or can be created)
4. `$HOME/.fangcode/bin` - Default fallback

```bash
# Examples
FANG_INSTALL_DIR=/usr/local/bin curl -fsSL https://fangcode.ai/install | bash
XDG_BIN_DIR=$HOME/.local/bin curl -fsSL https://fangcode.ai/install | bash
```

### Agents

FangCode includes two built-in agents you can switch between with the `Tab` key.

- **build** - Default, full-access agent for development work
- **plan** - Read-only agent for analysis and code exploration
  - Denies file edits by default
  - Asks permission before running bash commands
  - Ideal for exploring unfamiliar codebases or planning changes

Also included is a **general** subagent for complex searches and multistep tasks.
This is used internally and can be invoked using `@general` in messages.

Learn more about [agents](https://fangcode.ai/docs/agents).

### Documentation

For more info on how to configure FangCode, [**head over to our docs**](https://fangcode.ai/docs).

### Contributing

If you're interested in contributing to FangCode, please read our [contributing docs](./CONTRIBUTING.md) before submitting a pull request.

### Building on FangCode

If you are working on a project that's related to FangCode and is using "fangcode" as part of its name, for example "fangcode-dashboard" or "fangcode-mobile", please add a note to your README to clarify that it is not built by the FangCode team and is not affiliated with us in any way.

---

**Join our community** [Discord](https://discord.gg/fangcode) | [X.com](https://x.com/fangcode)
