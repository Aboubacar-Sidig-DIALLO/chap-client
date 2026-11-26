/**
 * Compte administrateur (rôle `admin` du plugin Admin de Better Auth).
 * Sert uniquement à adapter l'interface : le serveur vérifie le rôle à
 * chaque requête d'administration.
 */
export function isAdmin(user: { role?: string | null }) {
  return user.role === "admin"
}
