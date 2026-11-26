import { io, type Socket } from "socket.io-client"
import { API_URL } from "@/lib/config"
import type { SocialClientEvents, SocialServerEvents } from "../types"

export type SocialSocket = Socket<SocialServerEvents, SocialClientEvents>

let shared: SocialSocket | null = null
let users = 0

/**
 * Connexion temps réel de l'espace `/social` (amis, présence, appels), partagée
 * par tous ceux qui l'écoutent : l'accueil et les notifications d'appel
 * n'ouvrent qu'une seule connexion. Le cookie de session l'authentifie.
 *
 * À rendre avec `releaseSocialSocket` ; elle se ferme quand plus personne ne l'utilise.
 */
export function acquireSocialSocket(): SocialSocket {
  shared ??= io(`${API_URL}/social`, { withCredentials: true, autoConnect: false })
  users++
  if (!shared.active) shared.connect()
  return shared
}

export function releaseSocialSocket() {
  users = Math.max(0, users - 1)
  if (users === 0 && shared) {
    shared.disconnect()
    shared = null
  }
}

/** Refuse l'appel d'un ami (depuis la sonnerie) : il s'arrête aussi chez lui. */
export function declineFriendCall(friendId: string) {
  shared?.emit("call:decline", { userId: friendId })
}
