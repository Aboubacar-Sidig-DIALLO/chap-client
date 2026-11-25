import type { SignalData } from "../types"
import { ICE_SERVERS } from "./config"

export type TrackKind = "audio" | "video"

interface PeerLinkOptions {
  /**
   * En cas d'offres croisées, le pair « poli » cède. Les deux côtés doivent en
   * convenir : on compare leurs identifiants.
   */
  polite: boolean
  /** Celui qui arrive dans le direct ouvre la liaison avec chacun des présents. */
  initiator: boolean
  /** Pistes locales du moment (micro, caméra), envoyées dès la liaison. */
  tracks: Record<TrackKind, MediaStreamTrack | null>
  sendSignal: (data: SignalData) => void
  /** Une piste distante est arrivée (son ou image) : `stream` les rassemble. */
  onTrack: (stream: MediaStream, kind: TrackKind) => void
}

/**
 * Liaison WebRTC avec un autre participant, selon la « négociation parfaite »
 * (https://w3c.github.io/webrtc-pc/#perfect-negotiation-example) : chacun peut
 * renégocier à tout moment, les offres croisées se résolvent seules.
 *
 * Un émetteur audio et un émetteur vidéo sont créés une fois pour toutes :
 * couper le micro ou allumer la caméra remplace simplement la piste envoyée
 * (`setTrack`), sans renégociation.
 */
export class PeerLink {
  readonly stream = new MediaStream()
  private readonly connection = new RTCPeerConnection({ iceServers: ICE_SERVERS })
  private readonly options: PeerLinkOptions
  private makingOffer = false
  private ignoreOffer = false

  constructor(options: PeerLinkOptions) {
    this.options = options
    const { connection } = this

    connection.ontrack = ({ track }) => {
      this.stream.addTrack(track)
      options.onTrack(this.stream, track.kind as TrackKind)
    }
    connection.onicecandidate = ({ candidate }) => {
      options.sendSignal({ candidate: candidate?.toJSON() ?? null })
    }
    connection.onnegotiationneeded = async () => {
      try {
        this.makingOffer = true
        await connection.setLocalDescription()
        options.sendSignal({ description: connection.localDescription!.toJSON() })
      } catch (error) {
        console.error("Négociation WebRTC impossible", error)
      } finally {
        this.makingOffer = false
      }
    }
    // Changement de réseau (Wi-Fi → 4G) : on retrouve un chemin sans tout refaire.
    connection.oniceconnectionstatechange = () => {
      if (connection.iceConnectionState === "failed") connection.restartIce()
    }

    if (options.initiator) {
      for (const kind of ["audio", "video"] as const) {
        connection.addTransceiver(options.tracks[kind] ?? kind, { direction: "sendrecv" })
      }
    }
  }

  async handleSignal({ description, candidate }: SignalData) {
    const { connection } = this

    if (description) {
      const isCollision =
        description.type === "offer" &&
        (this.makingOffer || connection.signalingState !== "stable")
      this.ignoreOffer = !this.options.polite && isCollision
      if (this.ignoreOffer) return

      await connection.setRemoteDescription(description)
      if (description.type === "offer") {
        // Côté appelé : on répond en envoyant aussi son micro et sa caméra.
        this.sendLocalTracks()
        await connection.setLocalDescription()
        this.options.sendSignal({ description: connection.localDescription!.toJSON() })
      }
      return
    }

    if (candidate !== undefined) {
      try {
        await connection.addIceCandidate(candidate ?? undefined)
      } catch (error) {
        // Candidat d'une offre qu'on a choisi d'ignorer : sans importance.
        if (!this.ignoreOffer) throw error
      }
    }
  }

  /** Remplace la piste envoyée (`null` : n'envoie plus rien de ce type). */
  setTrack(kind: TrackKind, track: MediaStreamTrack | null) {
    this.options.tracks[kind] = track
    void this.transceiver(kind)?.sender.replaceTrack(track)
  }

  close() {
    this.connection.close()
    for (const track of this.stream.getTracks()) track.stop()
  }

  private sendLocalTracks() {
    for (const kind of ["audio", "video"] as const) {
      const transceiver = this.transceiver(kind)
      if (!transceiver) continue
      transceiver.direction = "sendrecv"
      const track = this.options.tracks[kind]
      if (track && transceiver.sender.track !== track) void transceiver.sender.replaceTrack(track)
    }
  }

  private transceiver(kind: TrackKind) {
    return this.connection
      .getTransceivers()
      .find((transceiver) => transceiver.receiver.track.kind === kind)
  }
}
