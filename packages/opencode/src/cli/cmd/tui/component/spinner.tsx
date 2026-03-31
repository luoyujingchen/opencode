import { Show } from "solid-js"
import { useTheme } from "../context/theme"
import { useKV } from "../context/kv"
import type { JSX } from "@opentui/solid"
import type { RGBA } from "@opentui/core"
import { isUnicodeLogoSupported } from "@/cli/logo"
import "opentui-spinner/solid"

const unicode = isUnicodeLogoSupported()
const brailleFrames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]
const asciiFrames = ["-", "\\", "|", "/"]

export function Spinner(props: { children?: JSX.Element; color?: RGBA }) {
  const { theme } = useTheme()
  const kv = useKV()
  const color = () => props.color ?? theme.textMuted
  const staticPrefix = unicode ? "⋯ " : "... "
  return (
    <Show when={kv.get("animations_enabled", true)} fallback={<text fg={color()}>{staticPrefix}{props.children}</text>}>
      <box flexDirection="row" gap={1}>
        <spinner frames={unicode ? brailleFrames : asciiFrames} interval={80} color={color()} />
        <Show when={props.children}>
          <text fg={color()}>{props.children}</text>
        </Show>
      </box>
    </Show>
  )
}
