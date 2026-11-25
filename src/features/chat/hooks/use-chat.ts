"use client"

import { useEffect, useEffectEvent, useRef, useState } from "react"
import {
  EXPIRY_CHECK_INTERVAL_MS,
  MESSAGE_TTL_MS,
  type ReactionEmoji,
} from "../lib/config"
import { createId } from "../lib/id"
import {
  countUnread,
  getLatestIncomingSeq,
  mergeReceipts,
} from "../lib/receipts"
import { createChatSocket, listen, type ChatSocket } from "../lib/socket"
import type {
  ActiveUser,
  Attachment,
  ChatMessage,
  ChatUser,
  ConnectionStatus,
  ConversationInfo,
  ConversationRef,
  ConversationUnavailableReason,
  LiveListener,
  ReadReceipt,
  SendStatus,
  ServerMessage,
  UserActivity,
} from "../types"

/** Délai au-delà duquel un message sans accusé de réception est considéré en échec. */
const ACK_TIMEOUT_MS = 5000
/** Délai d'inactivité après lequel on signale la fin de frappe. */
const TYPING_IDLE_MS = 2500

function toChatMessage(message: ServerMessage): ChatMessage {
  return { ...message, status: "sent" }
}

/**
 * Fusionne l'historique serveur avec les messages locaux pas encore confirmés
 * (en cours d'envoi ou en échec), pour ne rien perdre lors d'une reconnexion.
 */
function mergeHistory(history: ServerMessage[], local: ChatMessage[]) {
  const confirmedIds = new Set(history.map((message) => message.id))
  const pending = local.filter(
    (message) => message.status !== "sent" && !confirmedIds.has(message.id)
  )
  return [...history.map(toChatMessage), ...pending]
}

/** Messages encore valides : un message expiré disparaît de l'écran. */
function withoutExpired(messages: ChatMessage[], now: number) {
  const kept = messages.filter((message) => Date.parse(message.expiresAt) > now)
  return kept.length === messages.length ? messages : kept
}

interface UseChatOptions {
  /** Le serveur a refusé la connexion : session expirée ou révoquée. */
  onUnauthorized?: () => void
}

/**
 * Une conversation en temps réel, avec un ami ou dans un groupe.
 * Rien n'est conservé sur l'appareil : les messages vivent en mémoire, une heure au plus.
 */
export function useChat(
  currentUser: ChatUser,
  conversation: ConversationRef,
  { onUnauthorized }: UseChatOptions = {}
) {
  /** Nom et type de la conversation, connus une fois l'accès vérifié par le serveur. */
  const [conversationInfo, setConversationInfo] = useState<ConversationInfo | null>(null)
  const [unavailableReason, setUnavailableReason] =
    useState<ConversationUnavailableReason | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [onlineUsers, setOnlineUsers] = useState<ChatUser[]>([])
  /** Participants qui écrivent ou enregistrent un vocal. */
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([])
  /** Participants qui écoutent un vocal en ce moment. */
  const [liveListeners, setLiveListeners] = useState<LiveListener[]>([])
  const [receipts, setReceipts] = useState<ReadReceipt[]>([])
  /** Passe à `true` à la réception du premier historique. */
  const [isHistoryLoaded, setIsHistoryLoaded] = useState(false)
  /** Dernier `seq` signalé comme lu par cet onglet. */
  const [readSeq, setReadSeq] = useState(0)
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("connecting")

  // Une connexion par conversation (`ChatRoom` est remonté pour chacune),
  // partagée avec le direct (`useCall`).
  const [socket] = useState<ChatSocket>(() => createChatSocket(conversation))
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  /** Vocal écouté en ce moment par cet onglet, ré-annoncé après une reconnexion. */
  const listeningRef = useRef<string | null>(null)
  /** Dernière progression d'écoute envoyée, par message (évite les envois en double). */
  const sentProgressRef = useRef(new Map<string, number>())

  const userId = currentUser.id
  const reportUnauthorized = useEffectEvent(() => onUnauthorized?.())

  useEffect(() => {
    function setActivity(user: ChatUser, activity: UserActivity | null) {
      setActiveUsers((current) => {
        const others = current.filter((item) => item.user.id !== user.id)
        return activity ? [...others, { user, activity }] : others
      })
    }

    /** Accuse réception de tous les messages jusqu'à `seq`. */
    function acknowledge(seq: number) {
      if (seq > 0) socket.emit("messages:delivered", seq)
    }

    function markReconnecting() {
      setConnectionStatus("reconnecting")
    }

    const unlisten = listen(socket, {
      connect: () => {
        setConnectionStatus("connected")
        if (listeningRef.current) socket.emit("voice:listening", listeningRef.current)
      },
      disconnect: () => {
        setConnectionStatus("disconnected")
        setActiveUsers([])
        setLiveListeners([])
      },
      connect_error: (error) => {
        setConnectionStatus("disconnected")
        if (error.message === "UNAUTHORIZED") reportUnauthorized()
        // Pas (ou plus) d'accès : inutile de réessayer.
        if (error.message === "FORBIDDEN" || error.message === "BAD_REQUEST") {
          socket.disconnect()
          setUnavailableReason("forbidden")
        }
      },
      "conversation:ready": setConversationInfo,
      "conversation:closed": () => setUnavailableReason("closed"),
      "chat:history": (history) => {
        setMessages((local) => mergeHistory(history, local))
        setIsHistoryLoaded(true)
        // Après une reconnexion, la lecture sera signalée à nouveau (le serveur ignore les doublons).
        setReadSeq(0)
        acknowledge(getLatestIncomingSeq(history, userId))
      },
      "message:new": (message) => {
        setMessages((previous) => [...previous, toChatMessage(message)])
        setActivity(message.author, null)
        acknowledge(message.seq)
      },
      "voice:listened": ({ messageId, user }) =>
        setMessages((previous) =>
          previous.map((message) =>
            message.id === messageId &&
            !message.listenedBy.some((listener) => listener.id === user.id)
              ? { ...message, listenedBy: [...message.listenedBy, user] }
              : message
          )
        ),
      "voice:progress": ({ messageId, user, percent }) =>
        setMessages((previous) =>
          previous.map((message) =>
            message.id === messageId
              ? {
                  ...message,
                  listenProgress: [
                    ...message.listenProgress.filter((item) => item.user.id !== user.id),
                    { user, percent },
                  ],
                }
              : message
          )
        ),
      "message:reactions": ({ messageId, reactions }) =>
        setMessages((previous) =>
          previous.map((message) =>
            message.id === messageId ? { ...message, reactions } : message
          )
        ),
      "voice:listening": ({ messageId, user }) =>
        setLiveListeners((current) => {
          const others = current.filter((item) => item.user.id !== user.id)
          return messageId ? [...others, { user, messageId }] : others
        }),
      "receipts:update": (updates) =>
        setReceipts((current) => mergeReceipts(current, updates)),
      "users:online": setOnlineUsers,
      activity: ({ user, activity }) => {
        if (user.id !== userId) setActivity(user, activity)
      },
    })
    socket.io.on("reconnect_attempt", markReconnecting)
    socket.connect()

    return () => {
      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = undefined
      unlisten()
      socket.io.off("reconnect_attempt", markReconnecting)
      socket.disconnect()
    }
  }, [socket, userId])

  // Application de l'instant : chaque message disparaît une heure après son envoi.
  useEffect(() => {
    const interval = setInterval(
      () => setMessages((current) => withoutExpired(current, Date.now())),
      EXPIRY_CHECK_INTERVAL_MS
    )
    return () => clearInterval(interval)
  }, [])

  function updateMessage(id: string, update: Partial<ChatMessage>) {
    setMessages((previous) =>
      previous.map((message) =>
        message.id === id ? { ...message, ...update } : message
      )
    )
  }

  function setMessageStatus(id: string, status: SendStatus) {
    updateMessage(id, { status })
  }

  function deliver(message: ChatMessage) {
    // Hors connexion, l'envoi attend la reconnexion ; sans réponse à temps, il est en échec.
    socket
      .timeout(ACK_TIMEOUT_MS)
      .emit(
        "message:send",
        {
          id: message.id,
          content: message.content,
          attachmentIds: message.attachments.map((attachment) => attachment.id),
        },
        (error, response) => {
          if (error || !response.ok) {
            setMessageStatus(message.id, "failed")
            return
          }
          // La version serveur fait foi (horodatage notamment).
          updateMessage(message.id, toChatMessage(response.message))
        }
      )
  }

  function stopTyping() {
    if (!typingTimeoutRef.current) return

    clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = undefined
    socket.emit("activity", null)
  }

  /** À appeler à chaque frappe : émet « début » une seule fois, puis « fin » après inactivité. */
  function notifyTyping() {
    if (!socket.connected) return

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    else socket.emit("activity", "typing")

    typingTimeoutRef.current = setTimeout(stopTyping, TYPING_IDLE_MS)
  }

  /** Signale aux autres qu'un vocal est en cours d'enregistrement (ou terminé). */
  function setRecording(isRecording: boolean) {
    stopTyping()
    socket.emit("activity", isRecording ? "recording" : null)
  }

  /** Signale le vocal écouté à l'instant (ou `null`) ; seuls les changements sont envoyés. */
  function setListening(messageId: string | null) {
    if (listeningRef.current === messageId) return
    listeningRef.current = messageId
    socket.emit("voice:listening", messageId)
  }

  /**
   * Signale jusqu'où un vocal reçu a été écouté. Seule une avancée est envoyée
   * (au plus une fois par point de pourcentage), le serveur ignorant tout recul.
   */
  function reportListenProgress(messageId: string, percent: number) {
    const sent = sentProgressRef.current.get(messageId) ?? 0
    if (percent <= sent) return
    sentProgressRef.current.set(messageId, percent)
    socket.emit("voice:progress", { messageId, percent })
  }

  /** Signale un vocal reçu écouté jusqu'au bout (une seule fois par message). */
  function markListened(message: ChatMessage) {
    const alreadyListened = message.listenedBy.some((user) => user.id === userId)
    if (message.author.id === userId || alreadyListened) return

    // Mise à jour immédiate : le vocal cesse aussitôt d'être « non écouté ».
    updateMessage(message.id, {
      listenedBy: [...message.listenedBy, currentUser],
    })
    socket.emit("voice:listened", message.id)
  }

  /**
   * Réagit à un message : un emoji différent remplace sa réaction, le même la
   * retire. Affiché tout de suite, puis confirmé par le serveur (diffusion à tous).
   */
  function toggleReaction(message: ChatMessage, emoji: ReactionEmoji) {
    const current = message.reactions.find((item) => item.user.id === userId)
    const next = current?.emoji === emoji ? null : emoji
    const others = message.reactions.filter((item) => item.user.id !== userId)

    updateMessage(message.id, {
      reactions: next ? [...others, { user: currentUser, emoji: next }] : others,
    })
    socket.emit("message:react", { messageId: message.id, emoji: next })
  }

  /** Les pièces jointes doivent déjà avoir été envoyées (`uploadAttachment`). */
  function sendMessage(content: string, attachments: Attachment[] = []) {
    const now = Date.now()
    const message: ChatMessage = {
      id: createId(),
      author: currentUser,
      content,
      attachments,
      createdAt: new Date(now).toISOString(),
      // Provisoire : le serveur fixe la date d'expiration définitive à la réception.
      expiresAt: new Date(now + MESSAGE_TTL_MS).toISOString(),
      listenedBy: [],
      listenProgress: [],
      reactions: [],
      status: "sending",
    }

    stopTyping()
    setMessages((previous) => [...previous, message])
    deliver(message)
  }

  function retryMessage(id: string) {
    const message = messages.find((item) => item.id === id)
    if (!message) return

    setMessageStatus(id, "sending")
    deliver(message)
  }

  /** Signale que l'utilisateur a vu tous les messages jusqu'à `seq` inclus. */
  function markAsRead(seq: number) {
    if (seq <= readSeq) return

    setReadSeq(seq)
    socket.emit("messages:read", seq)
  }

  // Lectures faites ici ou dans un autre onglet du même utilisateur.
  const ownReceipt = receipts.find((receipt) => receipt.user.id === userId)
  const unreadCount = countUnread(
    messages,
    userId,
    Math.max(readSeq, ownReceipt?.readSeq ?? 0)
  )

  return {
    /** Connexion partagée avec le direct (`useCall`). */
    socket,
    conversationInfo,
    unavailableReason,
    messages,
    isHistoryLoaded,
    receipts,
    unreadCount,
    /** `seq` du dernier message reçu d'un autre participant. */
    latestIncomingSeq: getLatestIncomingSeq(messages, userId),
    onlineUsers,
    activeUsers,
    liveListeners,
    connectionStatus,
    sendMessage,
    retryMessage,
    notifyTyping,
    setRecording,
    markAsRead,
    setListening,
    reportListenProgress,
    markListened,
    toggleReaction,
  }
}
