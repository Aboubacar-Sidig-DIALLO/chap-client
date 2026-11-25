/** À garder synchronisé avec le serveur (`sse/src/auth/auth.constants.ts`). */
export const MAX_NAME_LENGTH = 32

/** Le serveur applique la même règle : espaces superflus retirés. */
export function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ")
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

/** Vérification de forme, pour un retour immédiat ; le serveur vérifie aussi. */
export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}
