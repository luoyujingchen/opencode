const url =
  import.meta.env.FANG_RELEASE_LATEST_URL ||
  import.meta.env.OPENCODE_RELEASE_LATEST_URL ||
  "http://xiaofang-newapi.qyfbeta.com/v1/release/latest"
const mode = import.meta.env.FANG_SOURCE_MODE || import.meta.env.OPENCODE_SOURCE_MODE
const offline = mode === "offline" || truthy(import.meta.env.FANG_OFFLINE) || truthy(import.meta.env.OPENCODE_OFFLINE)

function truthy(value: string | undefined) {
  const text = value?.toLowerCase()
  return text === "1" || text === "true" || text === "yes"
}

function parse(value: string) {
  const parts = value
    .replace(/^v/, "")
    .split("-")[0]
    ?.split(".")
    .map((part) => Number.parseInt(part, 10))

  if (!parts || parts.length === 0) return null
  if (parts.some((part) => Number.isNaN(part))) return null
  return parts
}

export function cmp(left: string, right: string) {
  const a = parse(left)
  const b = parse(right)
  if (!a || !b) return null

  const len = Math.max(a.length, b.length)
  for (let i = 0; i < len; i += 1) {
    const x = a[i] ?? 0
    const y = b[i] ?? 0
    if (x > y) return 1
    if (x < y) return -1
  }

  return 0
}

function tag(value: unknown) {
  if (!value || typeof value !== "object") return null
  const next = (value as { tag_name?: unknown }).tag_name
  if (typeof next !== "string") return null
  return next.replace(/^v/, "")
}

export async function next(cur: string) {
  if (offline) return null
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  }).catch(() => null)

  if (!res?.ok) return null

  const body = await res.json().catch(() => null)
  const ver = tag(body)
  if (!ver) return null
  if (cmp(ver, cur) !== 1) return null
  return ver
}
