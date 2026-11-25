import { renderAppIcon } from "@/lib/app-icon"

export const size = { width: 180, height: 180 }
export const contentType = "image/png"

/** iOS arrondit lui-même les icônes de l'écran d'accueil. */
export default function AppleIcon() {
  return renderAppIcon(size.width, { rounded: false })
}
