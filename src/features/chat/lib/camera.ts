/** `user` : caméra frontale (selfie) ; `environment` : caméra arrière. */
export type FacingMode = "user" | "environment"

const JPEG_QUALITY = 0.9

/** Ouvre la caméra demandée, en haute définition si possible, sans micro. */
export async function openCamera(facingMode: FacingMode): Promise<MediaStream> {
  // `mediaDevices` n'existe qu'en contexte sécurisé (HTTPS ou localhost).
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new DOMException("Contexte non sécurisé", "SecurityError")
  }

  return navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: { ideal: facingMode },
      width: { ideal: 1920 },
      height: { ideal: 1920 },
    },
  })
}

/** Coupe la caméra (et éteint son voyant). */
export function stopStream(stream: MediaStream) {
  stream.getTracks().forEach((track) => track.stop())
}

export async function hasMultipleCameras() {
  const devices = await navigator.mediaDevices.enumerateDevices()
  return devices.filter((device) => device.kind === "videoinput").length > 1
}

/** Message compréhensible pour chaque cause d'échec de `getUserMedia`. */
export function getCameraErrorMessage(error: unknown) {
  const name = error instanceof DOMException ? error.name : ""

  switch (name) {
    case "NotAllowedError":
      return "L'accès à la caméra a été refusé. Autorisez-le dans les réglages du navigateur, puis réessayez."
    case "NotFoundError":
    case "OverconstrainedError":
      return "Aucune caméra n'a été détectée sur cet appareil."
    case "NotReadableError":
      return "La caméra est déjà utilisée par une autre application."
    case "SecurityError":
      return "La caméra n'est disponible que sur une connexion sécurisée (HTTPS)."
    default:
      return "Impossible d'accéder à la caméra."
  }
}

/** « selfie-2026-11-24-143205.jpg » */
function createPhotoName(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, "0")
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  const time = `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  return `selfie-${day}-${time}.jpg`
}

/**
 * Capture l'image affichée par la vidéo en JPEG. `mirror` retourne l'image
 * horizontalement, pour que la photo corresponde à l'aperçu d'un selfie.
 */
export async function captureFrame(
  video: HTMLVideoElement,
  { mirror = false } = {}
): Promise<File> {
  const canvas = document.createElement("canvas")
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight

  const context = canvas.getContext("2d")
  if (!context) throw new Error("Capture impossible")

  if (mirror) {
    context.translate(canvas.width, 0)
    context.scale(-1, 1)
  }
  context.drawImage(video, 0, 0, canvas.width, canvas.height)

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
  )
  if (!blob) throw new Error("Capture impossible")

  return new File([blob], createPhotoName(), { type: "image/jpeg" })
}
