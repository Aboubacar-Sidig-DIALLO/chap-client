/**
 * Serveurs ICE : un STUN public suffit sur la plupart des réseaux. Derrière un
 * pare-feu strict (entreprise, certains réseaux mobiles), il faut un serveur
 * TURN, à fournir en JSON dans `NEXT_PUBLIC_ICE_SERVERS`.
 */
export const ICE_SERVERS: RTCIceServer[] = parseIceServers(process.env.NEXT_PUBLIC_ICE_SERVERS) ?? [
  { urls: "stun:stun.l.google.com:19302" },
]

function parseIceServers(value: string | undefined): RTCIceServer[] | null {
  if (!value) return null
  try {
    return JSON.parse(value) as RTCIceServer[]
  } catch {
    console.warn("NEXT_PUBLIC_ICE_SERVERS n'est pas un JSON valide : STUN public utilisé.")
    return null
  }
}

/** Le micro, réglé pour la conversation. */
export const MICROPHONE_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
}

/** La caméra en carré léger : elle s'affiche dans une bulle ronde. */
export const CAMERA_CONSTRAINTS: MediaTrackConstraints = {
  facingMode: "user",
  width: { ideal: 480 },
  height: { ideal: 480 },
  frameRate: { ideal: 24 },
}

/** Durée d'une réaction qui s'envole. */
export const REACTION_LIFETIME_MS = 2600
