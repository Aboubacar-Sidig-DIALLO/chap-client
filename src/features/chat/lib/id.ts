/** Identifiant unique, utilisable hors contexte sécurisé (contrairement à `crypto.randomUUID`). */
export function createId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
