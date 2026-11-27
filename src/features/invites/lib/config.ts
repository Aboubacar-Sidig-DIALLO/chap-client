/**
 * Durée de vie d'une invitation : une minute, puis elle disparaît, comme
 * les messages. À garder synchronisée avec le serveur (`sse/src/invites/invites.constants.ts`).
 */
export const INVITE_TTL_MS = 60 * 1000

/** Les 15 dernières secondes, le compte à rebours prend la couleur de l'urgence. */
export const INVITE_ENDING_MS = 15 * 1000
