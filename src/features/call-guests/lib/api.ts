import { io, type Socket } from "socket.io-client"
import { ROUTES } from "@/features/auth/lib/routes"
import type { CallClientEvents, CallServerEvents } from "@/features/call/lib/call-socket"
import { apiFetch } from "@/lib/api"
import { API_URL } from "@/lib/config"
import type { CreatedGuestLink, GuestClaim, GuestLinkPreview } from "../types"
import { GUEST_NAMESPACE } from "./config"

const linkPath = (token: string) => `/call-guests/${encodeURIComponent(token)}`

/** Appels à l'API des invités d'appel (`sse/src/call/guests`). */
export const callGuestsApi = {
  /** Propriétaire ou administrateur, présent dans l'appel du groupe : un lien à usage unique. */
  createLink: (groupId: string) =>
    apiFetch<CreatedGuestLink>("/call-guests", { method: "POST", body: { groupId } }),

  /** Retire un lien encore inutilisé. */
  revokeLink: (token: string) => apiFetch<void>(linkPath(token), { method: "DELETE" }),

  /** Sans compte : l'appel auquel le lien invite. */
  preview: (token: string) => apiFetch<GuestLinkPreview>(linkPath(token)),

  /** Sans compte : utilise le lien (une fois pour toutes) sous le nom choisi. */
  claim: (token: string, name: string) =>
    apiFetch<GuestClaim>(`${linkPath(token)}/claim`, { method: "POST", body: { name } }),
}

/** Le lien complet à donner à l'invité (ou à mettre dans le QR code). */
export function guestCallUrl(token: string) {
  return `${window.location.origin}${ROUTES.guestCall(token)}`
}

/** Connexion d'un invité : l'appel, et rien d'autre. Il peut aussi en être retiré. */
export type GuestCallSocket = Socket<CallServerEvents & { "call:removed": () => void }, CallClientEvents>

/**
 * Connexion de l'invité à l'appel, sur l'espace qui lui est réservé, avec son
 * laissez-passer (aucun cookie de session : il n'a pas de compte).
 */
export function createGuestCallSocket(pass: string): GuestCallSocket {
  return io(`${API_URL}${GUEST_NAMESPACE}`, {
    autoConnect: false,
    forceNew: true,
    withCredentials: false,
    auth: { pass },
  })
}
