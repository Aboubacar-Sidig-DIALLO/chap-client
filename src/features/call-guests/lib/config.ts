/** Limites — à garder synchronisées avec le serveur (`sse/src/call/guests/call-guests.constants.ts`). */

/** Un lien d'invité inutilisé cesse de fonctionner au bout de ce délai (et, de toute façon, à la fin de l'appel). */
export const GUEST_LINK_TTL_MS = 15 * 60 * 1000

/** Longueur maximale du nom choisi par l'invité. */
export const GUEST_NAME_MAX_LENGTH = 40

/** Espace Socket.io des invités, isolé de celui du chat. */
export const GUEST_NAMESPACE = "/call-guests"

/** Refus de connexion du serveur : laissez-passer inconnu, retiré, ou appel terminé. */
export const CALL_ENDED_ERROR = "CALL_ENDED"
