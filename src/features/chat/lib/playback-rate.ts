/** Vitesses de lecture des vocaux, dans l'ordre où le bouton les fait défiler. */
export const PLAYBACK_RATES = [1, 1.5, 2] as const
export type PlaybackRate = (typeof PLAYBACK_RATES)[number]

/** Vitesse retenue par l'appareil, pour toutes les conversations. */
const STORAGE_KEY = "chapchap:playback-rate"

function isPlaybackRate(value: number): value is PlaybackRate {
  return (PLAYBACK_RATES as readonly number[]).includes(value)
}

/** La vitesse choisie la dernière fois sur cet appareil (×1 par défaut). */
export function readPlaybackRate(): PlaybackRate {
  try {
    const stored = Number(localStorage.getItem(STORAGE_KEY))
    return isPlaybackRate(stored) ? stored : 1
  } catch {
    // Rendu serveur, ou stockage indisponible (navigation privée).
    return 1
  }
}

export function storePlaybackRate(rate: PlaybackRate) {
  try {
    if (rate === 1) localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, String(rate))
  } catch {
    // Stockage indisponible : la vitesse vaut pour la session.
  }
}

/** La vitesse suivante : ×1 → ×1,5 → ×2 → ×1. */
export function nextPlaybackRate(rate: PlaybackRate): PlaybackRate {
  return PLAYBACK_RATES[(PLAYBACK_RATES.indexOf(rate) + 1) % PLAYBACK_RATES.length]
}

/** « 1,5× » : la virgule française. */
export function formatPlaybackRate(rate: PlaybackRate) {
  return `${String(rate).replace(".", ",")}×`
}
