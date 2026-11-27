/** Contrat de l'API des invités d'appel — à garder synchronisé avec le serveur (`sse/src/call/guests/call-guests.types.ts`). */
import type { ChatUser } from "@/features/chat/types"

/** Lien d'invité créé : à usage unique, valable jusqu'à son utilisation ou la fin de l'appel. */
export interface CreatedGuestLink {
  token: string
  /** Date ISO 8601 au-delà de laquelle, inutilisé, il ne marche plus. */
  expiresAt: string
}

/** Ce que voit l'invité avant d'entrer (sans compte). */
export interface GuestLinkPreview {
  group: { name: string; photoUrl: string | null }
  inviterName: string
  /** Personnes dans l'appel en ce moment. */
  participantCount: number
}

/** Lien utilisé : l'identité de l'invité dans l'appel, et son laissez-passer. */
export interface GuestClaim {
  /** Secret présenté à la connexion ; il ne vaut que pour cet appel. */
  pass: string
  guest: ChatUser
  group: { name: string; photoUrl: string | null }
}
