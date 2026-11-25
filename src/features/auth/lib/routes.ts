/** Routes de l'application. */
export const ROUTES = {
  signUp: "/inscription",
  signIn: "/connexion",
  /** Accueil, une fois connecté : amis et groupes. */
  home: "/",
  /** Salon de discussion ouvert à tous. */
  salon: "/salon",
  /** Conversation privée avec un ami. */
  friend: (userId: string) => `/amis/${encodeURIComponent(userId)}`,
  /** Conversation d'un groupe. */
  group: (groupId: string) => `/groupes/${encodeURIComponent(groupId)}`,
} as const

/** Paramètre d'URL qui fait rejoindre l'appel en cours dès l'ouverture de la conversation. */
export const JOIN_CALL_PARAM = "rejoindre"

/** Ouvre une conversation et rejoint aussitôt son appel (`/groupes/abc?rejoindre=appel`). */
export function joinCallHref(conversationHref: string) {
  return `${conversationHref}?${JOIN_CALL_PARAM}=appel`
}
