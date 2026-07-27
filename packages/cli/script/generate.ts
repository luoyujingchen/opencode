const modelsUrl = process.env.FANG_MODELS_URL || process.env.OPENCODE_MODELS_URL || "https://models.dev"
const file = process.env.FANG_MODELS_DEV_API_JSON || process.env.MODELS_DEV_API_JSON

export const modelsData = file
  ? await Bun.file(file).text()
  : await fetch(`${modelsUrl}/api.json`).then((response) => response.text())

console.log("Loaded models.dev snapshot")
