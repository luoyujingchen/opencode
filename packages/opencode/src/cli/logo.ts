export const logo = {
  left: ["                   ", "█▀▀▀ ▄▀▀▄ █▀▀█ █▀▀▀", "█^^^ █^^█ █__█ █_▀█", "▀    ▀  ▀ ▀~~▀ ▀▀▀▀"],
  right: ["             ▄     ", "█▀▀▀ █▀▀█ █▀▀█ █▀▀█", "█___ █__█ █__█ █^^^", "▀▀▀▀ ▀▀▀▀ ▀▀▀▀ ▀▀▀▀"],
}

export const marks = "_^~"

export const plainText = {
  left: "Fang",
  right: "Code",
}

export function isUnicodeLogoSupported(): boolean {
  if (process.env.FANGCODE_PLAIN_LOGO === "1") return false

  if (process.platform === "win32") {
    return !!(
      process.env.WT_SESSION ||
      process.env.TERM_PROGRAM === "vscode" ||
      process.env.ConEmuANSI === "ON"
    )
  }

  if (!process.stdout.isTTY) return false
  if (process.env.TERM === "dumb") return false

  return true
}
