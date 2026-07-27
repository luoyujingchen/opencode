import { defineCollection, z } from "astro:content"
import { glob, type Loader } from "astro/loaders"
import { docsSchema, i18nSchema } from "@astrojs/starlight/schema"
import en from "./content/i18n/en.json"

const custom = Object.fromEntries(Object.keys(en).map((key) => [key, z.string()]))
const docsExt = "markdown,mdown,mkdn,mkd,mdwn,md,mdx"
const i18nExt = "json,yml,yaml"
const docs = [`[^_]*.{${docsExt}}`, `zh-cn/**/[^_]*.{${docsExt}}`]
const i18n = [`en.{${i18nExt}}`, `zh-CN.{${i18nExt}}`]

type Kind = "docs" | "i18n"
type Cfg = { root: URL | string; srcDir: URL | string }

function root(kind: Kind, cfg: Cfg) {
  const src = typeof cfg.srcDir === "string" ? cfg.srcDir : cfg.srcDir.pathname
  const dir = typeof cfg.root === "string" ? cfg.root : cfg.root.pathname
  return `${src.replace(dir, "")}content/${kind}`
}

function loader(kind: Kind, pattern: string[]): Loader {
  return {
    name: `fangcode-${kind}-loader`,
    load(ctx) {
      return glob({
        base: root(kind, ctx.config),
        pattern,
      }).load(ctx)
    },
  }
}

export const collections = {
  docs: defineCollection({ loader: loader("docs", docs), schema: docsSchema() }),
  i18n: defineCollection({
    loader: loader("i18n", i18n),
    schema: i18nSchema({
      extend: z.object(custom).catchall(z.string()),
    }),
  }),
}
