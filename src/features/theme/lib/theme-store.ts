import { applyTheme, readStoredPreference, storePreference, systemPrefersDark } from "./theme-dom"
import { transitionTheme, type ScreenPoint } from "./theme-transition"
import { resolveTheme, type ResolvedTheme, type ThemePreference } from "./theme"

/**
 * L'apparence de l'application, partagée par tous ses écrans : la préférence
 * de l'utilisateur (mémorisée sur cet appareil) et le thème qui en découle.
 */

export interface ThemeSnapshot {
  preference: ThemePreference
  resolved: ResolvedTheme
}

/** Côté serveur, rien n'est connu : le HTML est le même pour tous, `THEME_SCRIPT` corrige avant peinture. */
const SERVER_SNAPSHOT: ThemeSnapshot = { preference: "system", resolved: "light" }

let snapshot: ThemeSnapshot | null = null
const listeners = new Set<() => void>()

function readSnapshot(): ThemeSnapshot {
  const preference = readStoredPreference()
  return { preference, resolved: resolveTheme(preference, systemPrefersDark()) }
}

function publish(next: ThemeSnapshot) {
  if (snapshot?.preference === next.preference && snapshot.resolved === next.resolved) return
  snapshot = next
  for (const listener of listeners) listener()
}

export const themeStore = {
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
  getSnapshot: () => (snapshot ??= readSnapshot()),
  getServerSnapshot: () => SERVER_SNAPSHOT,

  /** Choix de l'utilisateur : mémorisé, puis appliqué en transition depuis `origin`. */
  setPreference(preference: ThemePreference, origin?: ScreenPoint) {
    storePreference(preference)
    const next = { preference, resolved: resolveTheme(preference, systemPrefersDark()) }
    transitionTheme(next.resolved, origin)
    publish(next)
  },

  /** Quelque chose a changé ailleurs (autre onglet, appareil passé en sombre) : on suit, en fondu. */
  sync() {
    const next = readSnapshot()
    transitionTheme(next.resolved)
    publish(next)
  },

  /** Réapplique le thème sans transition (React efface l'attribut de `<html>` au remontage de développement). */
  restore() {
    const next = readSnapshot()
    applyTheme(next.resolved)
    publish(next)
  },
}
