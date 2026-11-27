import { ROUTES } from "@/features/auth/lib/routes"
import { apiFetch } from "@/lib/api"
import type { CreatedInvite, InviteAcceptance, InvitePreview, InviteTarget } from "../types"

const invitePath = (token: string) => `/invites/${encodeURIComponent(token)}`

/** Appels à l'API des invitations (`sse/src/invites`). */
export const invitesApi = {
  /** L'invitation en cours vers `target` (la même tant qu'elle vaut), ou une nouvelle avec `renew`. */
  create: (target: InviteTarget, renew = false) =>
    apiFetch<CreatedInvite>("/invites", { method: "POST", body: { target, renew } }),

  get: (token: string) => apiFetch<InvitePreview>(invitePath(token)),

  accept: (token: string) => apiFetch<InviteAcceptance>(`${invitePath(token)}/accept`, { method: "POST" }),

  /** Désactive son invitation avant l'heure. */
  revoke: (token: string) => apiFetch<void>(invitePath(token), { method: "DELETE" }),
}

/** Le lien complet à partager (ou à mettre dans le QR code). */
export function inviteUrl(token: string) {
  return `${window.location.origin}${ROUTES.invite(token)}`
}

/** La conversation qu'ouvre une invitation acceptée. */
export function acceptanceHref(acceptance: InviteAcceptance) {
  return acceptance.type === "direct" ? ROUTES.friend(acceptance.userId) : ROUTES.group(acceptance.groupId)
}
