import { defineConfig } from "vite"
import solidPlugin from "vite-plugin-solid"
import { iconsSpritesheet } from "vite-plugin-icons-spritesheet"
import fs from "fs"
import { Source } from "@opencode-ai/core/source"

export default defineConfig({
  plugins: [
    solidPlugin(),
    providerIconsPlugin(),
    iconsSpritesheet([
      {
        withTypes: true,
        inputDir: "src/assets/icons/file-types",
        outputDir: "src/components/file-icons",
        formatter: "prettier",
      },
      {
        withTypes: true,
        inputDir: "src/assets/icons/provider",
        outputDir: "src/components/provider-icons",
        formatter: "prettier",
        iconNameTransformer: (iconName) => iconName,
      },
    ]),
  ],
  server: { port: 3001 },
  build: {
    target: "esnext",
  },
  worker: {
    format: "es",
  },
})

function providerIconsPlugin() {
  return {
    name: "provider-icons-plugin",
    configureServer() {
      void fetchProviderIcons()
    },
    buildStart() {
      void fetchProviderIcons()
    },
  }
}

async function fetchProviderIcons() {
  if (Source.offline() && !Source.modelsPath()) return
  const providers = await (async () => {
    const file = Source.modelsPath()
    if (file) return Bun.file(file).json().then((json) => Object.keys(json as Record<string, unknown>))
    return fetch(Source.modelsUrl("api.json"))
      .then((res) => res.json())
      .then((json) => Object.keys(json as Record<string, unknown>))
  })()
  if (Source.modelsPath()) return
  await Promise.all(
    providers.map((provider) =>
      fetch(Source.modelsUrl(`logos/${provider}.svg`))
        .then((res) => res.text())
        .then((svg) => fs.writeFileSync(`./src/assets/icons/provider/${provider}.svg`, svg)),
    ),
  )
}
