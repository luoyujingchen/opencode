/**
 * Application-wide constants and configuration
 */
export const config = {
  // Base URL
  baseUrl: "https://fangcode.ai",

  // GitHub
  github: {
    repoUrl: "https://github-bak.com/anomalyco/fangcode",
    starsFormatted: {
      compact: "160K",
      full: "160,000",
    },
  },

  // Social links
  social: {
    twitter: "https://x.com/fangcode",
    discord: "https://discord.gg/fangcode",
  },

  // Static stats (used on landing page)
  stats: {
    contributors: "900",
    commits: "13,000",
    monthlyUsers: "7.5M",
  },
} as const
