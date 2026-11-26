import { apiFetch } from "@/lib/api"
import { authClient } from "@/lib/auth-client"
import type {
  AdminRole,
  AdminSession,
  AdminStats,
  AdminUserPage,
  AdminUserQuery,
} from "../types"

/**
 * Codes d'erreur du plugin Admin de Better Auth (et du serveur), traduits.
 * Le serveur vérifie chaque droit : ces messages expliquent un refus, ils ne
 * le décident pas.
 */
const ERROR_MESSAGES: Record<string, string> = {
  USER_ALREADY_EXISTS: "Un compte existe déjà avec cette adresse.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Un compte existe déjà avec cette adresse.",
  INVALID_EMAIL: "Cette adresse email n'est pas valide.",
  NAME_REQUIRED: "Indiquez un nom ou un pseudo.",
  NAME_TOO_LONG: "Ce nom est trop long.",
  YOU_CANNOT_BAN_YOURSELF: "Vous ne pouvez pas suspendre votre propre compte.",
  YOU_CANNOT_REMOVE_YOURSELF: "Vous ne pouvez pas supprimer votre propre compte d'ici.",
  CANNOT_CHANGE_OWN_ROLE: "Vous ne pouvez pas changer votre propre rôle.",
  ADMIN_PASSWORD_REQUIRED: "Un administrateur doit avoir un mot de passe.",
  PASSWORD_ADMIN_ONLY: "Seuls les administrateurs ont un mot de passe.",
  PASSWORD_TOO_SHORT: "Ce mot de passe est trop court (12 caractères au moins).",
  PASSWORD_TOO_LONG: "Ce mot de passe est trop long.",
  YOU_CANNOT_IMPERSONATE_ADMINS: "Impossible de se connecter en tant qu'un autre administrateur.",
  NO_DATA_TO_UPDATE: "Aucune modification à enregistrer.",
  USER_NOT_FOUND: "Ce compte n'existe plus.",
}

const FORBIDDEN = "Cette action est réservée aux administrateurs."
const FALLBACK = "L'action a échoué. Vérifiez votre connexion et réessayez."

/** Échec d'une action d'administration, au message déjà traduit. */
export class AdminActionError extends Error {}

interface AuthClientResult<T> {
  data: T | null
  error: { code?: string; status?: number; message?: string } | null
}

/** Résultat d'un appel au client Better Auth, ou une `AdminActionError` lisible. */
async function unwrap<T>(request: Promise<AuthClientResult<T>>): Promise<T> {
  let result: AuthClientResult<T>
  try {
    result = await request
  } catch {
    throw new AdminActionError(FALLBACK)
  }
  const { data, error } = result
  if (error) {
    const message =
      (error.code && ERROR_MESSAGES[error.code]) ??
      (error.status === 401 || error.status === 403 ? FORBIDDEN : FALLBACK)
    throw new AdminActionError(message)
  }
  if (data === null) throw new AdminActionError(FALLBACK)
  return data
}

/** Durées de suspension proposées ; `null` : définitive. */
export const BAN_DURATIONS = [
  { label: "1 jour", seconds: 24 * 60 * 60 },
  { label: "7 jours", seconds: 7 * 24 * 60 * 60 },
  { label: "30 jours", seconds: 30 * 24 * 60 * 60 },
  { label: "Définitive", seconds: null },
] as const

/**
 * Administration : lecture par l'API Nest (`/admin/*`), actions par le
 * plugin Admin de Better Auth (`/api/auth/admin/*`). Les deux exigent le rôle
 * `admin`, vérifié côté serveur.
 */
export const adminApi = {
  getStats: () => apiFetch<AdminStats>("/admin/stats"),

  listUsers: ({ search, filter, sort, page }: AdminUserQuery, signal?: AbortSignal) => {
    const params = new URLSearchParams({ filter, sort, page: String(page) })
    if (search) params.set("search", search)
    return apiFetch<AdminUserPage>(`/admin/users?${params}`, { signal })
  },

  /**
   * Un utilisateur se connecte avec son adresse seule ; un administrateur,
   * avec le mot de passe fourni ici (exigé par le serveur).
   */
  createUser: ({ password, ...input }: { name: string; email: string; role: AdminRole; password: string }) =>
    unwrap(authClient.admin.createUser({ ...input, password: input.role === "admin" ? password : undefined })),

  updateUser: (userId: string, data: { name: string; email: string }) =>
    unwrap(authClient.admin.updateUser({ userId, data })),

  /**
   * Nomme administrateur : d'abord son mot de passe (le serveur l'exige),
   * puis le rôle. Ses sessions se ferment ; il se reconnecte avec ce mot de passe.
   */
  promoteToAdmin: async (userId: string, password: string) => {
    await unwrap(authClient.admin.setUserPassword({ userId, newPassword: password }))
    return unwrap(authClient.admin.setRole({ userId, role: "admin" }))
  },

  /** Retire les droits ; le serveur supprime aussi son mot de passe. */
  demoteToUser: (userId: string) => unwrap(authClient.admin.setRole({ userId, role: "user" })),

  /** Nouveau mot de passe d'un administrateur (oubli, compromission). */
  setPassword: (userId: string, password: string) =>
    unwrap(authClient.admin.setUserPassword({ userId, newPassword: password })),

  /** Ferme aussi toutes ses sessions (et ses connexions temps réel). */
  banUser: (userId: string, reason: string, expiresInSeconds: number | null) =>
    unwrap(
      authClient.admin.banUser({
        userId,
        banReason: reason || undefined,
        banExpiresIn: expiresInSeconds ?? undefined,
      })
    ),

  unbanUser: (userId: string) => unwrap(authClient.admin.unbanUser({ userId })),

  listSessions: async (userId: string) => {
    const { sessions } = await unwrap(authClient.admin.listUserSessions({ userId }))
    return sessions as AdminSession[]
  },

  revokeSession: (sessionToken: string) => unwrap(authClient.admin.revokeUserSession({ sessionToken })),

  revokeAllSessions: (userId: string) => unwrap(authClient.admin.revokeUserSessions({ userId })),

  /** Ouvre une session « en tant que » cet utilisateur (30 min au plus). */
  impersonate: (userId: string) => unwrap(authClient.admin.impersonateUser({ userId })),

  /** Revient à la session de l'administrateur. */
  stopImpersonating: () => unwrap(authClient.admin.stopImpersonating()),

  /** Définitif : amis et groupes de la personne sont prévenus. */
  removeUser: (userId: string) => unwrap(authClient.admin.removeUser({ userId })),
}
