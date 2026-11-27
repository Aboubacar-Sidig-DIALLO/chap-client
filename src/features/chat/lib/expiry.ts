/**
 * Le temps qu'il reste à un message avant de disparaître, et la façon de le
 * dire : calme d'abord (« 42 min »), plus pressant ensuite (« disparaît dans
 * 4 min »), à la seconde près pour finir (« disparaît dans 42 s »).
 */

const SECOND_MS = 1000
const MINUTE_MS = 60 * SECOND_MS
const HOUR_MS = 60 * MINUTE_MS

/** En deçà, le compte à rebours se fait pressant : c'est le moment de répondre. */
export const EXPIRY_SOON_MS = 10 * MINUTE_MS

/** La dernière minute, à la seconde ; le message s'y dissout peu à peu. */
export const EXPIRY_FINAL_MS = MINUTE_MS

/**
 * - `calm` : il reste du temps ;
 * - `soon` : moins de 10 minutes ;
 * - `final` : la dernière minute.
 */
export type ExpiryPhase = "calm" | "soon" | "final"

export function expiryPhase(remainingMs: number): ExpiryPhase {
  if (remainingMs <= EXPIRY_FINAL_MS) return "final"
  if (remainingMs <= EXPIRY_SOON_MS) return "soon"
  return "calm"
}

/** « 1 h », « 12 min », « 42 s » : arrondi vers le haut, pour ne jamais annoncer moins qu'il ne reste. */
export function formatRemaining(remainingMs: number) {
  const ms = Math.max(0, remainingMs)
  if (ms > EXPIRY_FINAL_MS) {
    const minutes = Math.ceil(ms / MINUTE_MS)
    return minutes >= 60 ? `${Math.ceil(ms / HOUR_MS)} h` : `${minutes} min`
  }
  return `${Math.ceil(ms / SECOND_MS)} s`
}

/** « 12 minutes », « 1 seconde » : la même chose, en toutes lettres (lecteurs d'écran). */
export function formatRemainingLong(remainingMs: number) {
  const ms = Math.max(0, remainingMs)
  const [value, unit] =
    ms > EXPIRY_FINAL_MS
      ? Math.ceil(ms / MINUTE_MS) >= 60
        ? [Math.ceil(ms / HOUR_MS), "heure"]
        : [Math.ceil(ms / MINUTE_MS), "minute"]
      : [Math.ceil(ms / SECOND_MS), "seconde"]
  return `${value} ${unit}${value > 1 ? "s" : ""}`
}

/**
 * Dans combien de temps le libellé change (minute suivante, ou seconde
 * suivante à la fin) : on ne réveille l'écran que lorsqu'il y a quelque chose
 * de nouveau à afficher.
 */
export function msUntilNextChange(remainingMs: number) {
  if (remainingMs <= 0) return null
  const step = remainingMs > EXPIRY_FINAL_MS ? MINUTE_MS : SECOND_MS
  // Le libellé arrondit vers le haut : il change quand on passe sous le multiple inférieur.
  const untilBoundary = remainingMs % step || step
  // Juste au-delà de la frontière (et jamais moins de 50 ms), pour ne pas se réveiller trop tôt.
  return Math.max(untilBoundary + 5, 50)
}
