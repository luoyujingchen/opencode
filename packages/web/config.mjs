const stage = process.env.SST_STAGE || "dev"

export default {
  url: stage === "production" ? "https://fangcode.ai" : `https://${stage}.fangcode.ai`,
  console: stage === "production" ? "https://fangcode.ai/auth" : `https://${stage}.fangcode.ai/auth`,
  email: "help@fangcode.ai",
  socialCard: "https://social-cards.sst.dev",
  github: "https://github.com/anomalyco/fangcode",
  discord: "https://fangcode.ai/discord",
  headerLinks: [
    { name: "app.header.home", url: "/" },
    { name: "app.header.docs", url: "/docs/" },
  ],
}
