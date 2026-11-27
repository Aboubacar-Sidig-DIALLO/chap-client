/** Routes de l'application. */
export const ROUTES = {
  signUp: "/inscription",
  signIn: "/connexion",
  /** Accueil, une fois connecté : amis et groupes. */
  home: "/",
  /** Son profil : nom, adresse email, suppression du compte. */
  profile: "/profil",
  /** Administration des comptes (rôle `admin`). */
  admin: "/admin",
  /** Conversation privée avec un ami. */
  friend: (userId: string) => `/amis/${encodeURIComponent(userId)}`,
  /** Conversation d'un groupe. */
  group: (groupId: string) => `/groupes/${encodeURIComponent(groupId)}`,
  /** Invitation éphémère (lien ou QR code) : devenir ami, ou rejoindre un groupe. */
  invite: (token: string) => `/invitation/${encodeURIComponent(token)}`,
  /** Invité d'un appel de groupe, sans compte : l'appel, et rien d'autre. */
  guestCall: (token: string) => `/appel/${encodeURIComponent(token)}`,
} as const

/** Paramètre d'URL des pages de connexion : la page où revenir une fois connecté. */
export const NEXT_PARAM = "suite"

/**
 * La page où revenir après la connexion, si elle est bien une page de
 * l'application : un chemin interne (`/invitation/…`), jamais une adresse
 * externe (`https://…`, `//autre.site`, `/\autre.site`), qui ferait de la
 * connexion un tremplin vers un site piégé.
 */
export function safeNextPath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return null
  return value
}

/** Lien vers la connexion ou l'inscription, avec l'email à pré-remplir et la page où revenir. */
export function authHref(route: string, { email, next }: { email?: string; next?: string | null } = {}) {
  const params = new URLSearchParams()
  if (email) params.set("email", email)
  const safeNext = safeNextPath(next)
  if (safeNext && safeNext !== ROUTES.home) params.set(NEXT_PARAM, safeNext)
  const query = params.toString()
  return query ? `${route}?${query}` : route
}

/** Paramètre d'URL qui fait rejoindre l'appel en cours dès l'ouverture de la conversation. */
export const JOIN_CALL_PARAM = "rejoindre"

/** Ouvre une conversation et rejoint aussitôt son appel (`/groupes/abc?rejoindre=appel`). */
export function joinCallHref(conversationHref: string) {
  return `${conversationHref}?${JOIN_CALL_PARAM}=appel`
}
