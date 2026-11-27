import {
  DARK_SCHEME_QUERY,
  DEFAULT_THEME_PREFERENCE,
  THEME_ATTRIBUTE,
  THEME_COLORS,
  THEME_STORAGE_KEY,
  isThemePreference,
  type ResolvedTheme,
  type ThemePreference,
} from "./theme"

/** Préférence mémorisée sur cet appareil ; l'apparence de l'appareil si rien de valable n'est stocké. */
export function readStoredPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    return isThemePreference(stored) ? stored : DEFAULT_THEME_PREFERENCE
  } catch {
    return DEFAULT_THEME_PREFERENCE
  }
}

export function storePreference(preference: ThemePreference) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference)
  } catch {
    // Stockage indisponible (navigation privée stricte) : le choix vaut pour cette visite.
  }
}

export function systemPrefersDark() {
  return window.matchMedia(DARK_SCHEME_QUERY).matches
}

export function currentTheme() {
  return document.documentElement.getAttribute(THEME_ATTRIBUTE)
}

/** Pose le thème sur `<html>` et accorde la barre du navigateur, comme `THEME_SCRIPT` au chargement. */
export function applyTheme(theme: ResolvedTheme) {
  document.documentElement.setAttribute(THEME_ATTRIBUTE, theme)
  themeColorMeta().content = THEME_COLORS[theme]
}

function themeColorMeta(): HTMLMetaElement {
  const existing = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (existing) return existing

  const meta = document.createElement("meta")
  meta.name = "theme-color"
  document.head.append(meta)
  return meta
}
