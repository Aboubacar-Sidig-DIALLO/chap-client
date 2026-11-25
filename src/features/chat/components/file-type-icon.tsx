import {
  File02Icon,
  Image01Icon,
  MusicNote01Icon,
  Pdf01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

function getIcon(mimeType: string) {
  if (mimeType === "application/pdf") return Pdf01Icon
  if (mimeType.startsWith("image/")) return Image01Icon
  if (mimeType.startsWith("audio/")) return MusicNote01Icon
  return File02Icon
}

export function FileTypeIcon({ mimeType }: { mimeType: string }) {
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
      <HugeiconsIcon icon={getIcon(mimeType)} size={18} aria-hidden />
    </span>
  )
}
