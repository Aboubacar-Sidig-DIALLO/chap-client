import type { VoiceMetadata } from "../types"
import { WAVEFORM_BARS } from "./config"

/** Fréquence de mesure du volume (et du chronomètre). */
const TICK_MS = 60
/** Débit suffisant pour la voix (Opus) : environ 240 ko par minute. */
const AUDIO_BITS_PER_SECOND = 32_000

/** Formats par ordre de préférence : Opus (Chrome, Firefox), puis AAC (Safari). */
const FORMATS = [
  { mimeType: "audio/webm;codecs=opus", extension: "webm" },
  { mimeType: "audio/ogg;codecs=opus", extension: "ogg" },
  { mimeType: "audio/mp4", extension: "m4a" },
  { mimeType: "audio/webm", extension: "webm" },
] as const

export interface VoiceRecording extends VoiceMetadata {
  file: File
}

export interface RecordingTick {
  elapsedMs: number
  /** Volume instantané, de 0 à 1. */
  level: number
}

export interface VoiceRecordingSession {
  /** Le flux du micro, pour une visualisation en direct (l'orbe vocal). */
  stream: MediaStream
  /** Termine l'enregistrement et renvoie le fichier, sa durée et sa forme d'onde. */
  stop: () => Promise<VoiceRecording>
  /** Abandonne l'enregistrement et libère le micro. */
  cancel: () => void
}

function pickFormat() {
  return FORMATS.find((format) => MediaRecorder.isTypeSupported(format.mimeType))
}

/** Volume d'un échantillon (moyenne quadratique), étiré pour que la voix remplisse l'échelle. */
function measureLevel(samples: Uint8Array) {
  let sum = 0
  for (const sample of samples) {
    const centered = (sample - 128) / 128
    sum += centered * centered
  }
  return Math.min(1, Math.sqrt(sum / samples.length) * 5)
}

/**
 * Réduit les volumes mesurés à `bars` barres (le pic de chaque tranche),
 * normalisées sur le pic global pour qu'une voix douce reste lisible.
 */
export function toWaveform(levels: number[], bars = WAVEFORM_BARS) {
  if (levels.length === 0) return []

  const peaks = Array.from({ length: bars }, (_, index) => {
    const start = Math.floor((index * levels.length) / bars)
    const end = Math.max(start + 1, Math.floor(((index + 1) * levels.length) / bars))
    return Math.max(...levels.slice(start, end))
  })
  const max = Math.max(...peaks) || 1
  return peaks.map((peak) => Math.round((peak / max) * 100))
}

/** « vocal-2026-11-24-143205.webm » */
function createFileName(extension: string, date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, "0")
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  const time = `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  return `vocal-${day}-${time}.${extension}`
}

/** Message compréhensible pour chaque cause d'échec d'accès au micro. */
export function getMicrophoneErrorMessage(error: unknown) {
  const name = error instanceof DOMException ? error.name : ""

  switch (name) {
    case "NotAllowedError":
      return "L'accès au micro a été refusé. Autorisez-le dans les réglages du navigateur, puis réessayez."
    case "NotFoundError":
      return "Aucun micro n'a été détecté sur cet appareil."
    case "NotReadableError":
      return "Le micro est déjà utilisé par une autre application."
    case "SecurityError":
      return "Le micro n'est disponible que sur une connexion sécurisée (HTTPS)."
    case "NotSupportedError":
      return "Votre navigateur ne permet pas d'enregistrer de message vocal."
    default:
      return "Impossible d'accéder au micro."
  }
}

/**
 * Ouvre le micro et commence à enregistrer. `onTick` reçoit régulièrement
 * le temps écoulé et le volume, pour le chronomètre et l'onde en direct.
 */
export async function startVoiceRecording({
  onTick,
}: {
  onTick: (tick: RecordingTick) => void
}): Promise<VoiceRecordingSession> {
  // `mediaDevices` n'existe qu'en contexte sécurisé (HTTPS ou localhost).
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new DOMException("Contexte non sécurisé", "SecurityError")
  }
  if (typeof MediaRecorder === "undefined") {
    throw new DOMException("MediaRecorder indisponible", "NotSupportedError")
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  })

  const format = pickFormat()
  const recorder = new MediaRecorder(stream, {
    mimeType: format?.mimeType,
    audioBitsPerSecond: AUDIO_BITS_PER_SECOND,
  })
  const chunks: Blob[] = []
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data)
  }

  // Analyse du volume, uniquement pour l'affichage (n'affecte pas l'enregistrement).
  const audioContext = new AudioContext()
  void audioContext.resume()
  const analyser = audioContext.createAnalyser()
  analyser.fftSize = 1024
  audioContext.createMediaStreamSource(stream).connect(analyser)
  const samples = new Uint8Array(analyser.fftSize)
  const levels: number[] = []

  const startedAt = performance.now()
  recorder.start()

  const timer = setInterval(() => {
    analyser.getByteTimeDomainData(samples)
    const level = measureLevel(samples)
    levels.push(level)
    onTick({ elapsedMs: performance.now() - startedAt, level })
  }, TICK_MS)

  /** Coupe le micro (son voyant s'éteint) et libère l'analyse. */
  function release() {
    clearInterval(timer)
    stream.getTracks().forEach((track) => track.stop())
    void audioContext.close()
  }

  return {
    stream,

    stop: () =>
      new Promise((resolve, reject) => {
        const durationMs = Math.round(performance.now() - startedAt)

        recorder.onstop = () => {
          release()
          // Sans ses paramètres (`;codecs=opus`) : le type de base suffit au serveur.
          const type = (recorder.mimeType || format?.mimeType || "audio/webm").split(";")[0]
          const extension = format?.extension ?? "webm"
          resolve({
            file: new File(chunks, createFileName(extension), { type }),
            durationMs,
            waveform: toWaveform(levels),
          })
        }
        recorder.onerror = () => {
          release()
          reject(new Error("L'enregistrement a échoué"))
        }
        recorder.stop()
      }),

    cancel: () => {
      recorder.onstop = null
      if (recorder.state !== "inactive") recorder.stop()
      release()
    },
  }
}
