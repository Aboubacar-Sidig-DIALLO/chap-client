/** Erreur telle que renvoyée par le client Better Auth. */
export interface AuthError {
  code?: string
  status?: number
}

/** Codes renvoyés par le serveur (`sse/src/auth/auth.constants.ts`). */
const MESSAGES: Record<string, string> = {
  INVALID_EMAIL: "Cette adresse email n'est pas valide.",
  NAME_REQUIRED: "Indiquez un nom ou un pseudo.",
  NAME_TOO_LONG: "Ce nom est trop long.",
  ACCOUNT_EXISTS: "Un compte existe déjà avec cette adresse.",
  ACCOUNT_NOT_FOUND: "Aucun compte n'est associé à cette adresse.",
  EMAIL_UNCHANGED: "C'est déjà l'adresse de votre compte.",
  EMAIL_MISMATCH: "Ce n'est pas l'adresse de votre compte.",
}

export function getAuthErrorMessage(error: AuthError) {
  if (error.status === 429) {
    return "Trop de tentatives. Patientez une minute avant de réessayer."
  }
  return (
    (error.code && MESSAGES[error.code]) ??
    "Une erreur est survenue. Vérifiez votre connexion et réessayez."
  )
}
