import { createAudioMeter, type AudioMeter } from "@/components/voice-audio"
import { closeAudioContext } from "@/lib/audio-context"
import type { ReactionEmoji } from "@/features/chat/lib/config"
import { listen } from "@/features/chat/lib/socket"
import type { CallParticipant, CallReaction, CallSignal } from "../types"
import type { CallSocket } from "./call-socket"
import {
  CAMERA_CONSTRAINTS,
  MICROPHONE_CONSTRAINTS,
  REACTION_LIFETIME_MS,
} from "./config"
import { PeerLink } from "./peer-link"

const JOIN_TIMEOUT_MS = 8000

export type CallStatus = "idle" | "joining" | "joined"

/** Réaction qui s'envole de l'orbe de son auteur. */
export interface FloatingReaction {
  id: number
  peerId: string
  emoji: ReactionEmoji
}

/** Tout ce que l'interface affiche du direct ; remplacé (jamais modifié) à chaque changement. */
export interface CallSnapshot {
  status: CallStatus
  /** Participants du direct, vous compris une fois entré. */
  participants: CallParticipant[]
  /** La liste des participants a été reçue du serveur (sinon, elle n'est pas encore connue). */
  isSynced: boolean
  /** Votre identifiant dans le direct. */
  selfId: string | null
  isMuted: boolean
  /** Votre caméra, quand elle est allumée. */
  cameraStream: MediaStream | null
  /** Son et image de chaque autre participant. */
  remoteStreams: ReadonlyMap<string, MediaStream>
  reactions: FloatingReaction[]
  /** Dernier problème à expliquer (micro refusé, direct complet…). */
  error: string | null
}

const INITIAL_SNAPSHOT: CallSnapshot = {
  status: "idle",
  participants: [],
  isSynced: false,
  selfId: null,
  isMuted: false,
  cameraStream: null,
  remoteStreams: new Map(),
  reactions: [],
  error: null,
}

const MEDIA_ERRORS = {
  micro: {
    NotAllowedError: "Autorisez le micro dans le navigateur pour rejoindre le direct",
    NotFoundError: "Aucun micro trouvé",
    NotReadableError: "Le micro est déjà utilisé par une autre application",
    default: "Impossible d'accéder au micro",
  },
  camera: {
    NotAllowedError: "Autorisez la caméra dans le navigateur",
    NotFoundError: "Aucune caméra trouvée",
    NotReadableError: "La caméra est déjà utilisée par une autre application",
    default: "Impossible d'accéder à la caméra",
  },
} as const

/** Le refus du navigateur, expliqué en une phrase. */
function describeMediaError(error: unknown, device: keyof typeof MEDIA_ERRORS) {
  const messages: Record<string, string> = MEDIA_ERRORS[device]
  const name = error instanceof DOMException ? error.name : ""
  return messages[name] ?? messages.default
}

/**
 * Le direct d'une conversation (appel audio et vidéo), indépendant de React : signalisation
 * par la connexion du chat (ou celle d'un invité), une liaison WebRTC par autre
 * participant (maillage), mesure du volume de chacun pour les orbes vocaux.
 */
export class CallSession {
  private snapshot = INITIAL_SNAPSHOT
  private readonly listeners = new Set<() => void>()
  private readonly links = new Map<string, PeerLink>()
  private readonly meters = new Map<string, AudioMeter>()
  private readonly levelReaders = new Map<string, () => number>()
  private micTrack: MediaStreamTrack | null = null
  private cameraTrack: MediaStreamTrack | null = null
  private audioContext: AudioContext | null = null
  /** Change à chaque entrée ou sortie : une entrée périmée s'abandonne d'elle-même. */
  private generation = 0
  private reactionId = 0
  private readonly socket: CallSocket

  constructor(socket: CallSocket) {
    this.socket = socket
  }

  // ── Lecture par React (`useSyncExternalStore`) ──────────────────────────

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getSnapshot = () => this.snapshot

  getServerSnapshot = () => INITIAL_SNAPSHOT

  /** Volume (0 à 1) d'un participant ; même fonction à chaque appel, lue à chaque image. */
  levelReader = (peerId: string) => {
    let reader = this.levelReaders.get(peerId)
    if (!reader) {
      reader = () => this.meters.get(peerId)?.getLevel() ?? 0
      this.levelReaders.set(peerId, reader)
    }
    return reader
  }

  /** Écoute la signalisation ; renvoie de quoi s'en détacher (et quitter le direct). */
  attach = () => {
    const unlisten = listen(this.socket, {
      "call:participants": this.handleParticipants,
      "call:signal": this.handleSignal,
      "call:reaction": this.handleReaction,
      // Entre amis, l'autre a raccroché ou refusé, ou personne n'a répondu.
      "call:ended": () => this.reset(null),
      // Le serveur nous a retiré du direct : on libère micro et caméra.
      disconnect: () => {
        if (this.snapshot.status !== "idle") {
          this.reset("Connexion perdue : vous avez quitté le direct")
        }
      },
    })
    return () => {
      unlisten()
      this.leave()
    }
  }

  // ── Actions ─────────────────────────────────────────────────────────────

  /** Entre dans le direct, micro ouvert et caméra éteinte : la voix d'abord. */
  join = async () => {
    if (this.snapshot.status !== "idle") return
    const generation = ++this.generation
    this.update({ status: "joining", error: null })

    // Créé dans le geste de l'utilisateur : le navigateur l'autorise à jouer.
    this.audioContext = new AudioContext()
    void this.audioContext.resume()

    let micTrack: MediaStreamTrack
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: MICROPHONE_CONSTRAINTS })
      micTrack = stream.getAudioTracks()[0]
    } catch (error) {
      if (generation === this.generation) this.reset(describeMediaError(error, "micro"))
      return
    }
    if (generation !== this.generation) return micTrack.stop()
    this.micTrack = micTrack

    try {
      const ack = await this.socket
        .timeout(JOIN_TIMEOUT_MS)
        .emitWithAck("call:join", { audio: true, video: false })
      if (generation !== this.generation) return
      if (!ack.ok) return this.reset(ack.error)

      const selfId = this.socket.id ?? null
      if (selfId) this.meter(selfId, new MediaStream([micTrack]))
      this.update({ status: "joined", selfId })
      for (const participant of ack.participants) this.connect(participant.peerId, true)
    } catch {
      if (generation === this.generation) this.reset("Le direct ne répond pas, réessayez")
    }
  }

  leave = () => {
    if (this.snapshot.status === "idle") return
    this.socket.emit("call:leave")
    this.reset(null)
  }

  /** Refuse l'appel d'un ami qui sonne : il s'arrête aussi chez lui. */
  decline = () => {
    if (this.snapshot.status === "idle") this.socket.emit("call:decline")
  }

  toggleMute = () => {
    if (!this.micTrack) return
    this.micTrack.enabled = !this.micTrack.enabled
    this.update({ isMuted: !this.micTrack.enabled })
    this.announceMedia()
  }

  /**
   * Allume ou éteint la caméra. Rejette une `Error` lisible si elle est
   * inaccessible (la touche caméra l'affiche).
   */
  setCamera = async (on: boolean) => {
    if (!on) {
      this.cameraTrack?.stop()
      this.cameraTrack = null
      this.sendTrack("video", null)
      this.update({ cameraStream: null })
      this.announceMedia()
      return
    }

    const generation = this.generation
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: CAMERA_CONSTRAINTS })
    } catch (error) {
      throw new Error(describeMediaError(error, "camera"))
    }
    if (generation !== this.generation || this.snapshot.status !== "joined") {
      for (const track of stream.getTracks()) track.stop()
      return
    }

    this.cameraTrack = stream.getVideoTracks()[0]
    this.sendTrack("video", this.cameraTrack)
    this.update({ cameraStream: stream })
    this.announceMedia()
  }

  react = (emoji: ReactionEmoji) => {
    if (this.snapshot.status === "joined") this.socket.emit("call:react", emoji)
  }

  dismissError = () => this.update({ error: null })

  // ── Signalisation ───────────────────────────────────────────────────────

  private handleParticipants = (participants: CallParticipant[]) => {
    this.update({ participants, isSynced: true })
    if (this.snapshot.status !== "joined") return

    // Ceux qui sont partis : on ferme leur liaison.
    const present = new Set(participants.map((participant) => participant.peerId))
    for (const peerId of this.links.keys()) {
      if (!present.has(peerId)) this.disconnect(peerId)
    }
  }

  private handleSignal = ({ peerId, data }: CallSignal) => {
    if (this.snapshot.status !== "joined") return
    // Un nouvel arrivant nous contacte : on lui répond par une liaison.
    const link = this.links.get(peerId) ?? this.connect(peerId, false)
    link.handleSignal(data).catch((error: unknown) => {
      console.error("Signal WebRTC rejeté", error)
    })
  }

  private handleReaction = ({ peerId, emoji }: CallReaction) => {
    if (this.snapshot.status !== "joined") return
    const reaction = { id: ++this.reactionId, peerId, emoji }
    this.update({ reactions: [...this.snapshot.reactions, reaction] })
    setTimeout(() => {
      this.update({
        reactions: this.snapshot.reactions.filter((item) => item.id !== reaction.id),
      })
    }, REACTION_LIFETIME_MS)
  }

  // ── Liaisons et médias ──────────────────────────────────────────────────

  private connect(peerId: string, initiator: boolean) {
    const selfId = this.snapshot.selfId ?? ""
    const link = new PeerLink({
      polite: selfId > peerId,
      initiator,
      tracks: { audio: this.micTrack, video: this.cameraTrack },
      sendSignal: (data) => this.socket.emit("call:signal", { peerId, data }),
      onTrack: (stream, kind) => {
        if (kind === "audio") this.meter(peerId, stream)
        const remoteStreams = new Map(this.snapshot.remoteStreams)
        remoteStreams.set(peerId, stream)
        this.update({ remoteStreams })
      },
    })
    this.links.set(peerId, link)
    return link
  }

  private disconnect(peerId: string) {
    this.links.get(peerId)?.close()
    this.links.delete(peerId)
    this.meters.get(peerId)?.disconnect()
    this.meters.delete(peerId)
    const remoteStreams = new Map(this.snapshot.remoteStreams)
    remoteStreams.delete(peerId)
    this.update({ remoteStreams })
  }

  private sendTrack(kind: "audio" | "video", track: MediaStreamTrack | null) {
    for (const link of this.links.values()) link.setTrack(kind, track)
  }

  private announceMedia() {
    this.socket.emit("call:media", { audio: !this.snapshot.isMuted, video: this.cameraTrack !== null })
  }

  /** Mesure le volume d'un flux, pour l'orbe de son participant. */
  private meter(peerId: string, stream: MediaStream) {
    if (!this.audioContext) return
    this.meters.get(peerId)?.disconnect()
    try {
      this.meters.set(peerId, createAudioMeter(this.audioContext, this.audioContext.createMediaStreamSource(stream)))
    } catch {
      // Mesure indisponible : l'orbe reste au repos, l'appel continue.
    }
  }

  /** Quitte le direct localement : liaisons fermées, micro et caméra libérés. */
  private reset(error: string | null) {
    this.generation++
    for (const peerId of [...this.links.keys()]) this.disconnect(peerId)
    for (const meter of this.meters.values()) meter.disconnect()
    this.meters.clear()
    this.micTrack?.stop()
    this.cameraTrack?.stop()
    this.micTrack = null
    this.cameraTrack = null
    if (this.audioContext) closeAudioContext(this.audioContext)
    this.audioContext = null

    this.update({
      status: "idle",
      selfId: null,
      isMuted: false,
      cameraStream: null,
      remoteStreams: new Map(),
      reactions: [],
      error,
    })
  }

  private update(patch: Partial<CallSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch }
    for (const listener of this.listeners) listener()
  }
}
