/**
 * Talkie-walkie — à garder synchronisé avec le serveur
 * (`sse/src/talkie/talkie.constants.ts`).
 */

/** Son transmis : PCM 16 bits, mono, 16 kHz (qualité voix, ~32 ko/s). */
export const TALKIE_SAMPLE_RATE = 16_000

/** Un morceau toutes les 80 ms : assez court pour une voix sans retard perceptible. */
export const CHUNK_SAMPLES = (TALKIE_SAMPLE_RATE * 80) / 1000

/** Module de capture (dans `public/`), exécuté dans le fil audio. */
export const CAPTURE_WORKLET_URL = "/talkie-capture.worklet.js"

/**
 * Avance prise par la lecture sur le son reçu : elle absorbe les irrégularités
 * du réseau (sans elle, la voix hacherait).
 */
export const JITTER_BUFFER_S = 0.15

/** Son capté en attendant l'accord du serveur, gardé pour ne pas perdre le début. */
export const MAX_PENDING_CHUNKS = 25 // 2 s

/** Délai de réponse du serveur à une demande de parole. */
export const START_TIMEOUT_MS = 3000

/** Part du direct à avoir entendue pour que le vocal compte comme « écouté ». */
export const HEARD_RATIO = 0.8

/** Préférence « couper le direct » (propre à l'appareil). */
export const MUTED_STORAGE_KEY = "chapchap:talkie-muted"
