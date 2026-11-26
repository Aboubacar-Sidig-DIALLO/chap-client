/**
 * Mots de passe, réservés aux administrateurs — à garder synchronisés avec le
 * serveur (`sse/src/auth/auth.constants.ts`).
 */
export const MIN_PASSWORD_LENGTH = 12
export const MAX_PASSWORD_LENGTH = 128

/** Sans caractères ambigus (0/O, 1/l/I) : facile à recopier ou à dicter. */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"
const GENERATED_LENGTH = 20

/** Mot de passe aléatoire robuste, tiré par le générateur cryptographique du navigateur. */
export function generatePassword() {
  const values = crypto.getRandomValues(new Uint32Array(GENERATED_LENGTH))
  return Array.from(values, (value) => ALPHABET[value % ALPHABET.length]).join("")
}

/** Message si le mot de passe ne convient pas ; `null` s'il est valide. */
export function passwordProblem(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) return `Au moins ${MIN_PASSWORD_LENGTH} caractères.`
  if (password.length > MAX_PASSWORD_LENGTH) return "Ce mot de passe est trop long."
  return null
}
