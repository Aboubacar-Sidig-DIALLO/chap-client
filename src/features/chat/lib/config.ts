export { API_URL } from "@/lib/config"

/** Limites — à garder synchronisées avec le serveur (`sse/src/attachments/attachments.constants.ts`). */
export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 Mo
export const MAX_ATTACHMENTS_PER_MESSAGE = 10
export const MAX_VOICE_DURATION_MS = 5 * 60 * 1000 // 5 min
/** Nombre de barres de la forme d'onde d'un vocal (64 au plus côté serveur). */
export const WAVEFORM_BARS = 48

/** En dessous, l'enregistrement est jugé accidentel et n'est pas envoyé. */
export const MIN_VOICE_DURATION_MS = 1000

/** Formats audio lus dans le chat (les mêmes que ceux servis tels quels par le serveur). */
export const PLAYABLE_AUDIO_TYPES: ReadonlySet<string> = new Set([
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/mpeg",
  "audio/aac",
  "audio/wav",
])

/** Vidéos lues par un navigateur sans module (vue unique) — mêmes que le serveur (`sse/src/chat/view-once.ts`). */
export const PLAYABLE_VIDEO_TYPES: ReadonlySet<string> = new Set([
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime",
])

/** Réactions proposées sur un message — à garder synchronisé avec le serveur (`sse/src/chat/chat.constants.ts`). */
export const REACTION_EMOJIS = ["❤️", "😂", "🔥", "👏", "😮", "🙏"] as const
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number]

/** Formats affichés en aperçu ; les autres fichiers sont proposés au téléchargement. */
export const PREVIEWABLE_IMAGE_TYPES: ReadonlySet<string> = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
])

/**
 * Durée de vie d'un message (et de ses pièces jointes) : passé ce délai, il
 * disparaît de l'écran comme du serveur. À garder synchronisé avec le serveur
 * (`sse/src/chat/chat.constants.ts`).
 */
export const MESSAGE_TTL_MS = 60 * 60 * 1000
/** Fréquence à laquelle les messages expirés sont retirés de l'écran. */
export const EXPIRY_CHECK_INTERVAL_MS = 15 * 1000
