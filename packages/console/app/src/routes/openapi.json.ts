export async function GET() {
  const response = await fetch(
    "https://github-bak.com/anomalyco/fangcode/raw/refs/heads/dev/packages/sdk/openapi.json",
  )
  const json = await response.json()
  return json
}
