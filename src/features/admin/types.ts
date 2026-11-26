/** Contrat de l'API d'administration — à garder synchronisé avec le serveur (`sse/src/admin/admin.types.ts`). */

export type AdminRole = "admin" | "user"

/** Vue d'ensemble des comptes, en tête de l'administration. */
export interface AdminStats {
  users: number
  /** Comptes ayant l'application ouverte en ce moment. */
  online: number
  admins: number
  /** Suspensions en cours. */
  banned: number
  /** Comptes créés ces 7 derniers jours. */
  newThisWeek: number
}

/** Un compte, tel que le voit un administrateur. */
export interface AdminUser {
  id: string
  name: string
  email: string
  image: string | null
  role: AdminRole
  /** Suspension en cours. */
  banned: boolean
  banReason: string | null
  /** Fin de la suspension (ISO 8601) ; `null` : définitive. */
  banExpires: string | null
  online: boolean
  /** Dates ISO 8601. */
  createdAt: string
  lastSeenAt: string | null
}

export interface AdminUserPage {
  users: AdminUser[]
  total: number
  page: number
  pageSize: number
}

export type AdminUserFilter = "all" | "online" | "admins" | "banned"
export type AdminUserSort = "newest" | "oldest" | "name"

export interface AdminUserQuery {
  search: string
  filter: AdminUserFilter
  sort: AdminUserSort
  page: number
}

/** Une session ouverte d'un utilisateur (un appareil, un navigateur). */
export interface AdminSession {
  id: string
  token: string
  /** Dates ISO 8601 (ou `Date`, selon le client). */
  createdAt: string | Date
  updatedAt: string | Date
  expiresAt: string | Date
  ipAddress?: string | null
  userAgent?: string | null
  /** Session ouverte par un administrateur « en tant que » cet utilisateur. */
  impersonatedBy?: string | null
}
