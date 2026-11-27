import { ComputerPhoneSyncIcon, Moon01Icon, Sun03Icon } from "@hugeicons/core-free-icons"
import type { IconSvgElement } from "@hugeicons/react"
import type { ResolvedTheme, ThemePreference } from "./theme"

interface ThemeOption {
  value: ThemePreference
  label: string
  icon: IconSvgElement
}

/** Les choix d'apparence, dans l'ordre où ils sont proposés (profil, menu de l'accueil). */
export const THEME_OPTIONS: readonly ThemeOption[] = [
  { value: "system", label: "Automatique", icon: ComputerPhoneSyncIcon },
  { value: "light", label: "Clair", icon: Sun03Icon },
  { value: "dark", label: "Sombre", icon: Moon01Icon },
]

/** « Suit l'apparence de votre appareil, sombre en ce moment. » ; ou d'où vient un choix forcé. */
export function describeTheme(preference: ThemePreference, resolved: ResolvedTheme) {
  if (preference !== "system") return "Mémorisé sur cet appareil."
  return `Suit l'apparence de votre appareil, ${resolved === "dark" ? "sombre" : "claire"} en ce moment.`
}

/** Centre d'un élément à l'écran : le nouveau thème s'y dévoile. */
export function centerOf(element: Element | null | undefined) {
  if (!element) return undefined
  const { left, top, width, height } = element.getBoundingClientRect()
  return { x: left + width / 2, y: top + height / 2 }
}
