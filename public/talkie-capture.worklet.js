/**
 * Talkie-walkie : capte la voix du micro, la ramène à 16 kHz (moyenne de
 * chaque fenêtre, qui sert aussi de filtre anti-repliement) et l'envoie au
 * fil de l'eau en morceaux PCM 16 bits.
 *
 * Exécuté dans le fil audio du navigateur (AudioWorklet) : rien n'y bloque
 * l'interface. Options : `{ targetRate, chunkSamples }`.
 */
class TalkieCaptureProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super()
    const { targetRate, chunkSamples } = options.processorOptions
    /** Échantillons d'entrée par échantillon de sortie (ex. 3 pour 48 kHz). */
    this.ratio = sampleRate / targetRate
    this.chunkSamples = chunkSamples
    this.chunk = new Int16Array(chunkSamples)
    this.length = 0
    this.sum = 0
    this.count = 0
    this.position = 0
  }

  process(inputs) {
    const channel = inputs[0] && inputs[0][0]
    if (!channel) return true

    for (let index = 0; index < channel.length; index++) {
      this.sum += channel[index]
      this.count++
      this.position++
      if (this.position >= this.ratio) {
        this.position -= this.ratio
        this.push(this.sum / this.count)
        this.sum = 0
        this.count = 0
      }
    }
    return true
  }

  push(sample) {
    const clamped = Math.max(-1, Math.min(1, sample))
    this.chunk[this.length++] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff

    if (this.length === this.chunkSamples) {
      // Transféré (pas copié) au fil principal ; un nouveau tampon prend le relais.
      this.port.postMessage(this.chunk.buffer, [this.chunk.buffer])
      this.chunk = new Int16Array(this.chunkSamples)
      this.length = 0
    }
  }
}

registerProcessor("talkie-capture", TalkieCaptureProcessor)
