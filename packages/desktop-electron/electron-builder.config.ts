import type { Configuration } from "electron-builder"

const channel = (() => {
  const raw = process.env.FANG_CHANNEL || process.env.OPENCODE_CHANNEL
  if (raw === "dev" || raw === "beta" || raw === "prod") return raw
  return "dev"
})()

const getBase = (): Configuration => ({
  artifactName: "fangcode-electron-${os}-${arch}.${ext}",
  directories: {
    output: "dist",
    buildResources: "resources",
  },
  files: ["out/**/*", "resources/**/*"],
  extraResources: [
    {
      from: "resources/",
      to: "",
      filter: ["fangcode-cli*"],
    },
    {
      from: "native/",
      to: "native/",
      filter: ["index.js", "index.d.ts", "build/Release/mac_window.node", "swift-build/**"],
    },
  ],
  mac: {
    category: "public.app-category.developer-tools",
    icon: `resources/icons/icon.icns`,
    hardenedRuntime: true,
    gatekeeperAssess: false,
    entitlements: "resources/entitlements.plist",
    entitlementsInherit: "resources/entitlements.plist",
    notarize: true,
    target: ["dmg", "zip"],
  },
  dmg: {
    sign: true,
  },
  protocols: {
    name: "FangCode",
    schemes: ["fangcode", "opencode"],
  },
  win: {
    icon: `resources/icons/icon.ico`,
    target: ["nsis"],
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    installerIcon: `resources/icons/icon.ico`,
    installerHeaderIcon: `resources/icons/icon.ico`,
  },
  linux: {
    icon: `resources/icons`,
    category: "Development",
    target: ["AppImage", "deb", "rpm"],
  },
})

function getConfig() {
  const base = getBase()

  switch (channel) {
    case "dev": {
      return {
        ...base,
        appId: "ai.fangcode.desktop.dev",
        productName: "FangCode Dev",
        rpm: { packageName: "fangcode-dev" },
      }
    }
    case "beta": {
      return {
        ...base,
        appId: "ai.fangcode.desktop.beta",
        productName: "FangCode Beta",
        protocols: { name: "FangCode Beta", schemes: ["fangcode", "opencode"] },
        publish: { provider: "github", owner: "anomalyco", repo: "fangcode-beta", channel: "latest" },
        rpm: { packageName: "fangcode-beta" },
      }
    }
    case "prod": {
      return {
        ...base,
        appId: "ai.fangcode.desktop",
        productName: "FangCode",
        protocols: { name: "FangCode", schemes: ["fangcode", "opencode"] },
        publish: { provider: "github", owner: "anomalyco", repo: "fangcode", channel: "latest" },
        rpm: { packageName: "fangcode" },
      }
    }
  }
}

export default getConfig()
