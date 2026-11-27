/** Apparence choisie : suivre l'appareil, ou forcer le thème clair ou sombre. */
export const THEME_PREFERENCES = ["system", "light", "dark"] as const

export type ThemePreference = (typeof THEME_PREFERENCES)[number]

/** Thème réellement affiché, une fois « suivre l'appareil » tranché. */
export type ResolvedTheme = Exclude<ThemePreference, "system">

export const DEFAULT_THEME_PREFERENCE: ThemePreference = "system"

/**
 * Clé `localStorage` de la préférence : une simple préférence d'affichage, rien
 * de sensible. Lue avant la première peinture (`THEME_SCRIPT`), d'où le choix
 * de ce stockage plutôt qu'un cookie lu par le serveur, qui rendrait toutes les
 * pages dynamiques.
 */
export const THEME_STORAGE_KEY = "theme"

/** Attribut posé sur `<html>`, dont dépendent les variables de `globals.css` et la variante `dark:`. */
export const THEME_ATTRIBUTE = "data-theme"

export const DARK_SCHEME_QUERY = "(prefers-color-scheme: dark)"

/** Barre du navigateur et barre d'état de l'app installée : la couleur du fond (`--background`). */
export const THEME_COLORS: Readonly<Record<ResolvedTheme, string>> = {
  light: "#ffffff",
  dark: "#0a0a0a",
}

/** Valeur lue d'un stockage que l'on ne contrôle pas : seules les trois préférences connues passent. */
export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === "string" && (THEME_PREFERENCES as readonly string[]).includes(value)
}

export function resolveTheme(preference: ThemePreference, prefersDark: boolean): ResolvedTheme {
  if (preference !== "system") return preference
  return prefersDark ? "dark" : "light"
}
