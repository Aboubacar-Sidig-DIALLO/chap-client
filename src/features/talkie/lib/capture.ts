import { closeAudioContext } from "@/lib/audio-context"
import { CAPTURE_WORKLET_URL, CHUNK_SAMPLES, TALKIE_SAMPLE_RATE } from "./config"

/**
 * Branche la capture du talkie-walkie sur un micro déjà ouvert (celui de
 * l'enregistrement du vocal) : `onChunk` reçoit un morceau PCM 16 bits toutes
 * les 80 ms. Renvoie de quoi arrêter ; le micro, lui, reste ouvert.
 */
export async function startCapture(
  stream: MediaStream,
  onChunk: (chunk: ArrayBuffer) => void
): Promise<() => void> {
  const context = new AudioContext()
  try {
    await context.audioWorklet.addModule(CAPTURE_WORKLET_URL)
    void context.resume()

    const source = context.createMediaStreamSource(stream)
    const capture = new AudioWorkletNode(context, "talkie-capture", {
      numberOfOutputs: 1,
      processorOptions: { targetRate: TALKIE_SAMPLE_RATE, chunkSamples: CHUNK_SAMPLES },
    })
    // Le nœud doit rejoindre la sortie pour être exécuté ; à volume nul, rien ne s'entend.
    const silence = context.createGain()
    silence.gain.value = 0

    capture.port.onmessage = (event: MessageEvent<ArrayBuffer>) => onChunk(event.data)
    source.connect(capture).connect(silence).connect(context.destination)

    // Peut être appelé plusieurs fois (fin de la parole, puis démontage) : sans effet après la première.
    let isStopped = false
    return () => {
      if (isStopped) return
      isStopped = true
      capture.port.onmessage = null
      source.disconnect()
      closeAudioContext(context)
    }
  } catch (error) {
    closeAudioContext(context)
    throw error
  }
}
