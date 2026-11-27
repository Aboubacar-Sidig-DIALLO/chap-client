import { listen, type ChatSocket, type TalkStartAck } from "@/features/chat/lib/socket"
import type { ChatUser, ServerMessage } from "@/features/chat/types"
import type { OutgoingTalk, TalkieSnapshot } from "../types"
import { startCapture } from "./capture"
import {
  HEARD_RATIO,
  MAX_PENDING_CHUNKS,
  MUTED_STORAGE_KEY,
  START_TIMEOUT_MS,
} from "./config"
import { LivePlayer } from "./live-player"

const INITIAL_SNAPSHOT: TalkieSnapshot = {
  outgoing: null,
  incoming: null,
  isMuted: false,
  needsTap: false,
  audience: [],
  isSuppressed: false,
}

function readMuted() {
  try {
    return localStorage.getItem(MUTED_STORAGE_KEY) === "1"
  } catch {
    return false
  }
}

function storeMuted(isMuted: boolean) {
  try {
    if (isMuted) localStorage.setItem(MUTED_STORAGE_KEY, "1")
    else localStorage.removeItem(MUTED_STORAGE_KEY)
  } catch {
    // Stockage indisponible (navigation privée) : la préférence vaut pour la session.
  }
}

/** Ce qu'affiche une parole refusée (`null` : pas de réponse du serveur). */
function refusal(response: Extract<TalkStartAck, { ok: false }> | null) {
  const none = { speaker: null, deferred: [] }
  if (response?.reason === "busy") return { ...none, status: "busy" as const, speaker: response.speaker }
  if (response?.reason === "alone") return { ...none, status: "alone" as const }
  // Heures calmes : le talkie bascule en vocal différé.
  if (response?.reason === "quiet") return { ...none, status: "quiet" as const, deferred: response.users }
  return { ...none, status: "unavailable" as const }
}

/** Ce qu'on retient de la voix reçue, pour décider si elle a été entendue. */
interface IncomingTally {
  receivedBytes: number
  playedBytes: number
  /** Le vocal correspondant est déjà arrivé (avant la fin du direct). */
  hasMessage: boolean
}

/**
 * Talkie-walkie d'une conversation, indépendant de React.
 *
 * Envoi : pendant qu'on maintient le micro, la voix part en direct vers ceux
 * qui ont la conversation ouverte (une voix à la fois). Le même
 * enregistrement part ensuite comme vocal, avec le même id.
 *
 * Réception : la voix est jouée au fil de l'eau ; entendue presque en entier,
 * le vocal qui suit est aussitôt marqué « écouté ».
 */
export class TalkieSession {
  private snapshot: TalkieSnapshot = INITIAL_SNAPSHOT
  private readonly listeners = new Set<() => void>()
  private readonly player = new LivePlayer()
  private readonly socket: ChatSocket
  private readonly currentUserId: string

  /** Son capté avant l'accord du serveur. */
  private pending: ArrayBuffer[] = []
  /** Relâché avant l'accord du serveur : la fin sera envoyée à sa réponse. */
  private lateEnd: { id: string; cancelled: boolean } | null = null
  private releaseCapture: (() => void) | null = null

  private tally: IncomingTally = { receivedBytes: 0, playedBytes: 0, hasMessage: false }
  /** Directs entendus dont le vocal n'est pas encore arrivé. */
  private readonly heardIds = new Set<string>()

  constructor(socket: ChatSocket, currentUserId: string) {
    this.socket = socket
    this.currentUserId = currentUserId
    this.player.onStateChange = () => this.update({})
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

  /** Volume (0 à 1) de la voix reçue en direct, lu à chaque image. */
  getIncomingLevel = () => this.player.getLevel()

  /** Écoute la connexion ; renvoie de quoi tout arrêter. */
  attach = () => {
    this.update({ isMuted: readMuted() })

    // Le son n'est permis qu'après un geste : le premier appui, n'importe où, le débloque.
    // Déjà un geste sur la page (le clic qui a ouvert la conversation) : prêt tout de suite.
    const wake = () => this.player.wake()
    if (navigator.userActivation?.hasBeenActive) wake()
    window.addEventListener("pointerdown", wake, true)
    window.addEventListener("keydown", wake, true)

    const unlisten = listen(this.socket, {
      disconnect: () => {
        this.player.stop()
        this.interruptOutgoing()
        this.update({ incoming: null })
      },
      "talkie:started": ({ id, user }) => {
        if (user.id === this.currentUserId) return
        this.player.stop()
        this.tally = { receivedBytes: 0, playedBytes: 0, hasMessage: false }
        this.update({ incoming: { id, user } })
      },
      "talkie:chunk": ({ id, audio }) => {
        if (this.snapshot.incoming?.id !== id) return
        this.tally.receivedBytes += audio.byteLength
        if (this.canHear() && this.player.play(audio)) {
          this.tally.playedBytes += audio.byteLength
        }
      },
      "talkie:ended": ({ id, user, cancelled }) => {
        // Coupé par le serveur (débit, droits retirés…) : l'enregistrement continue en vocal.
        if (user.id === this.currentUserId) {
          if (this.snapshot.outgoing?.id === id) this.interruptOutgoing()
          return
        }
        if (this.snapshot.incoming?.id !== id) return

        const { receivedBytes, playedBytes, hasMessage } = this.tally
        const wasHeard = !cancelled && receivedBytes > 0 && playedBytes / receivedBytes >= HEARD_RATIO
        if (wasHeard) {
          if (hasMessage) this.acknowledgeHeard(id)
          else this.heardIds.add(id)
        }
        // La fin déjà programmée se joue jusqu'au bout.
        this.update({ incoming: null })
      },
      "message:new": (message: ServerMessage) => {
        if (this.heardIds.delete(message.id)) this.acknowledgeHeard(message.id)
        else if (this.snapshot.incoming?.id === message.id) this.tally.hasMessage = true
      },
    })

    return () => {
      unlisten()
      window.removeEventListener("pointerdown", wake, true)
      window.removeEventListener("keydown", wake, true)
      this.stopCapture()
      this.player.close()
    }
  }

  // ── Réglages venus de la conversation ───────────────────────────────────

  /** Qui a la conversation ouverte (vous compris). */
  setOnlineUsers = (users: ChatUser[]) => {
    const audience = users.filter((user) => user.id !== this.currentUserId)
    const current = this.snapshot.audience
    const isSame =
      audience.length === current.length &&
      audience.every((user, index) => user.id === current[index].id && user.name === current[index].name)
    if (!isSame) this.update({ audience })
  }

  /** En appel : le direct passe par l'appel, le talkie-walkie se met en retrait. */
  setSuppressed = (isSuppressed: boolean) => {
    if (isSuppressed === this.snapshot.isSuppressed) return
    if (isSuppressed) this.player.stop()
    this.update({ isSuppressed })
  }

  setMuted = (isMuted: boolean) => {
    storeMuted(isMuted)
    if (isMuted) this.player.stop()
    this.update({ isMuted })
  }

  /** « Touchez pour écouter » : à appeler dans le geste. */
  resume = () => this.player.wake()

  // ── Prendre la parole ───────────────────────────────────────────────────

  /**
   * Le doigt se pose sur le micro : demande la parole pour le vocal `id`.
   * Sans auditeur, hors ligne ou en appel, l'enregistrement reste un vocal classique.
   */
  begin = (id: string) => {
    if (this.snapshot.outgoing) return

    const { audience, isSuppressed } = this.snapshot
    if (!this.socket.connected || isSuppressed || audience.length === 0) {
      this.setOutgoing({ id, status: "alone", listeners: [], deferred: [], speaker: null })
      return
    }

    this.pending = []
    this.lateEnd = null
    this.setOutgoing({ id, status: "requesting", listeners: [], deferred: [], speaker: null })

    this.socket.timeout(START_TIMEOUT_MS).emit("talkie:start", { id }, (error, response) => {
      const isCurrent = this.snapshot.outgoing?.id === id
      const lateEnd = this.lateEnd?.id === id ? this.lateEnd : null
      this.lateEnd = null

      if (error || !response.ok) {
        this.pending = []
        if (!isCurrent) return
        this.stopCapture()
        this.setOutgoing({ id, listeners: [], ...refusal(error || response.ok ? null : response) })
        return
      }

      // Le début de la voix, capté pendant l'attente, part d'abord.
      for (const chunk of this.pending) this.socket.emit("talkie:chunk", chunk)
      this.pending = []

      if (isCurrent) {
        this.setOutgoing({
          id,
          status: "live",
          listeners: response.listeners,
          deferred: response.deferred,
          speaker: null,
        })
      } else if (lateEnd) {
        this.socket.emit("talkie:end", { cancelled: lateEnd.cancelled })
      }
    })
  }

  /**
   * Branche la voix sur le micro ouvert par l'enregistrement. Sans effet si
   * la parole n'est pas (ou plus) demandée. Renvoie de quoi la débrancher.
   */
  capture = (stream: MediaStream) => {
    const outgoing = this.snapshot.outgoing
    if (!outgoing || (outgoing.status !== "requesting" && outgoing.status !== "live")) {
      return () => {}
    }

    const { id } = outgoing
    let stop: (() => void) | null = null
    let isReleased = false

    startCapture(stream, (chunk) => this.sendChunk(id, chunk))
      .then((stopCapture) => {
        if (isReleased) stopCapture()
        else stop = stopCapture
      })
      .catch(() => {
        // Capture impossible (navigateur trop ancien) : on rend la parole, le vocal suit.
        if (this.snapshot.outgoing?.id === id) this.end({ cancelled: false, keepStatus: "unavailable" })
      })

    const release = () => {
      isReleased = true
      stop?.()
      if (this.releaseCapture === release) this.releaseCapture = null
    }
    this.releaseCapture = release
    return release
  }

  /**
   * Le micro est relâché (ou l'enregistrement annulé) : la parole est rendue.
   * `keepStatus` garde la prise de parole affichée avec cet état (direct interrompu).
   */
  end = ({
    cancelled,
    keepStatus,
  }: {
    cancelled: boolean
    keepStatus?: OutgoingTalk["status"]
  }) => {
    const outgoing = this.snapshot.outgoing
    if (!outgoing) return

    this.stopCapture()
    if (outgoing.status === "live") this.socket.emit("talkie:end", { cancelled })
    // Réponse du serveur encore attendue : la fin partira avec elle.
    if (outgoing.status === "requesting") this.lateEnd = { id: outgoing.id, cancelled }

    this.setOutgoing(keepStatus ? { ...outgoing, status: keepStatus, listeners: [] } : null)
  }

  // ── Interne ─────────────────────────────────────────────────────────────

  private sendChunk(id: string, chunk: ArrayBuffer) {
    const outgoing = this.snapshot.outgoing
    if (outgoing?.id !== id) return

    if (outgoing.status === "live") this.socket.emit("talkie:chunk", chunk)
    else if (outgoing.status === "requesting" && this.pending.length < MAX_PENDING_CHUNKS) {
      this.pending.push(chunk)
    }
  }

  private stopCapture() {
    this.releaseCapture?.()
    this.releaseCapture = null
  }

  /** Le direct s'arrête (coupure, serveur) ; l'enregistrement continue en vocal. */
  private interruptOutgoing() {
    const outgoing = this.snapshot.outgoing
    if (!outgoing || (outgoing.status !== "live" && outgoing.status !== "requesting")) return
    this.stopCapture()
    this.pending = []
    this.setOutgoing({ ...outgoing, status: "unavailable", listeners: [] })
  }

  private canHear() {
    return !this.snapshot.isMuted && !this.snapshot.isSuppressed
  }

  /** Un direct entendu vaut écoute du vocal qui le suit. */
  private acknowledgeHeard(messageId: string) {
    this.socket.emit("voice:progress", { messageId, percent: 100 })
    this.socket.emit("voice:listened", messageId)
  }

  private setOutgoing(outgoing: OutgoingTalk | null) {
    this.update({ outgoing })
  }

  private update(changes: Partial<TalkieSnapshot>) {
    const next = { ...this.snapshot, ...changes }
    next.needsTap = next.incoming !== null && !next.isMuted && !next.isSuppressed && !this.player.isRunning
    this.snapshot = next
    for (const listener of this.listeners) listener()
  }
}
