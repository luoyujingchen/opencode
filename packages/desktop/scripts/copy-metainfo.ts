import { resolveChannel } from "./utils"

const arg = process.argv[2]
const channel = arg === "dev" || arg === "beta" || arg === "prod" ? arg : resolveChannel()

const appId = channel === "prod" ? "ai.fangcode.desktop" : `ai.fangcode.desktop.${channel}`
const productName = channel === "prod" ? "FangCode" : `FangCode ${channel.charAt(0).toUpperCase() + channel.slice(1)}`
const summary = `AI coding agent${channel !== "prod" ? ` (${channel})` : ""}`

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<component type="desktop-application">
  <id>${appId}</id>

  <metadata_license>CC0-1.0</metadata_license>
  <project_license>MIT</project_license>

  <name>${productName}</name>
  <summary>${summary}</summary>

  <developer id="ai.fangcode">
    <name>FangCode</name>
  </developer>

  <description>
    <p>
      FangCode helps you write and run code with AI models.
    </p>
  </description>

  <launchable type="desktop-id">${appId}.desktop</launchable>

  <content_rating type="oars-1.1" />

  <url type="bugtracker">https://fangcode.ai</url>
  <url type="homepage">https://fangcode.ai</url>
  <url type="vcs-browser">https://fangcode.ai</url>

  <screenshots>
    <screenshot type="default">
      <image>https://fangcode.ai/screenshot.png</image>
    </screenshot>
  </screenshots>
</component>
`

await Bun.write(`resources/${appId}.metainfo.xml`, xml)
console.log(`Generated metainfo for ${channel} at resources/${appId}.metainfo.xml`)
