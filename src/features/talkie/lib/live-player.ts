import { createAudioMeter, type AudioMeter } from "@/components/voice-audio"
import { closeAudioContext } from "@/lib/audio-context"
import { JITTER_BUFFER_S, TALKIE_SAMPLE_RATE } from "./config"

/** PCM 16 bits → échantillons Web Audio (-1 à 1). */
function toFloat32(chunk: ArrayBuffer) {
  const pcm = new Int16Array(chunk)
  const samples = new Float32Array(pcm.length)
  for (let index = 0; index < pcm.length; index++) samples[index] = pcm[index] / 0x8000
  return samples
}

/**
 * Lecture de la voix reçue en direct : chaque morceau est programmé à la
 * suite du précédent, avec une petite avance qui absorbe les à-coups du
 * réseau. Si le réseau prend du retard, la lecture reprend avec la même avance
 * (un court silence plutôt qu'un son haché).
 *
 * Le contexte audio n'est créé et réveillé que lors d'un geste de
 * l'utilisateur (`wake`), comme l'exigent les navigateurs.
 */
export class LivePlayer {
  private context: AudioContext | null = null
  private output: GainNode | null = null
  private meter: AudioMeter | null = null
  private readonly sources = new Set<AudioBufferSourceNode>()
  /** Instant (horloge audio) où le prochain morceau doit commencer. */
  private playhead = 0

  /** Appelé quand le contexte se met en route ou s'endort. */
  onStateChange: () => void = () => {}

  /** À appeler dans un geste de l'utilisateur (appui, touche). */
  wake() {
    if (!this.context || this.context.state === "closed") {
      const context = new AudioContext()
      this.output = context.createGain()
      this.output.connect(context.destination)
      this.meter = createAudioMeter(context, this.output)
      context.onstatechange = () => this.onStateChange()
      this.context = context
    }
    if (this.context.state !== "running") void this.context.resume()
  }

  /** Le navigateur autorise le son : la voix reçue sera entendue. */
  get isRunning() {
    return this.context?.state === "running"
  }

  /** Programme un morceau ; `false` s'il ne peut pas être joué (son pas encore autorisé). */
  play(chunk: ArrayBuffer): boolean {
    const { context, output } = this
    if (!context || !output || context.state !== "running" || chunk.byteLength < 2) return false

    const samples = toFloat32(chunk)
    const buffer = context.createBuffer(1, samples.length, TALKIE_SAMPLE_RATE)
    buffer.copyToChannel(samples, 0)

    const source = context.createBufferSource()
    source.buffer = buffer
    source.connect(output)
    source.onended = () => this.sources.delete(source)

    // En retard sur le direct (début, ou réseau lent) : on reprend avec de l'avance.
    if (this.playhead < context.currentTime) this.playhead = context.currentTime + JITTER_BUFFER_S
    source.start(this.playhead)
    this.playhead += buffer.duration
    this.sources.add(source)
    return true
  }

  /** Coupe tout de suite ce qui reste à jouer. */
  stop() {
    for (const source of this.sources) {
      source.onended = null
      try {
        source.stop()
      } catch {
        // Déjà terminé.
      }
    }
    this.sources.clear()
    this.playhead = 0
  }

  /** Volume (0 à 1) de la voix en cours, lu à chaque image par les orbes. */
  getLevel = () => this.meter?.getLevel() ?? 0

  close() {
    this.stop()
    this.meter?.disconnect()
    if (this.context) {
      this.context.onstatechange = null
      closeAudioContext(this.context)
    }
    this.context = null
    this.output = null
    this.meter = null
  }
}
