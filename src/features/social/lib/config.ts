/** Limites — à garder synchronisées avec le serveur (`sse/src/social/social.constants.ts`). */
export const SEARCH_MIN_LENGTH = 2
export const SEARCH_MAX_LENGTH = 50
export const GROUP_NAME_MAX_LENGTH = 40
/** Créateur compris. */
export const GROUP_MAX_MEMBERS = 50
/** Côté de la photo de groupe envoyée (px) : nette sur écran dense, légère à charger. */
export const GROUP_PHOTO_SIZE = 512

/** Attente après la dernière frappe avant de lancer la recherche. */
export const SEARCH_DEBOUNCE_MS = 300
