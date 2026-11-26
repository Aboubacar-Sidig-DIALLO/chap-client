"use client"

import { AutoJoinCall } from "@/features/call/components/auto-join-call"
import { CallMini } from "@/features/call/components/call-mini"
import { CallProvider } from "@/features/call/components/call-provider"
import { CallStage } from "@/features/call/components/call-stage"
import { LiveBanner } from "@/features/call/components/live-banner"
import { LiveButton } from "@/features/call/components/live-button"
import { useAttachmentDrafts } from "../hooks/use-attachment-drafts"
import { useChat } from "../hooks/use-chat"
import { useUnreadTitle } from "../hooks/use-unread-title"
import { useVisualViewport } from "../hooks/use-visual-viewport"
import type { ChatUser, ConversationRef } from "../types"
import { ChatComposer } from "./chat-composer"
import { ChatHeader } from "./chat-header"
import { ConnectionBanner } from "./connection-banner"
import { ConversationUnavailable } from "./conversation-unavailable"
import { FileDropZone } from "./file-drop-zone"
import { FloatingPlayer } from "./floating-player"
import { MessageList } from "./message-list"
import { VoicePlaybackProvider } from "./voice-playback"

/** Titre affiché le temps que le serveur confirme la conversation. */
const PENDING_TITLE: Record<ConversationRef["type"], string> = {
  direct: "Conversation",
  group: "Groupe",
}

interface ChatRoomProps {
  currentUser: ChatUser
  /** Un ami ou un groupe. */
  conversation: ConversationRef
  /** La session n'est plus valide (expirée, révoquée) : il faut se reconnecter. */
  onSessionExpired: () => void
  /** Rejoindre l'appel en cours dès l'ouverture ; `onAutoJoinHandled` est appelé une fois fait. */
  autoJoinCall?: boolean
  onAutoJoinHandled?: () => void
}

export function ChatRoom({
  currentUser,
  conversation,
  onSessionExpired,
  autoJoinCall = false,
  onAutoJoinHandled = () => {},
}: ChatRoomProps) {
  const {
    socket,
    conversationInfo,
    unavailableReason,
    messages,
    isHistoryLoaded,
    receipts,
    unreadCount,
    latestIncomingSeq,
    onlineUsers,
    friendPresence,
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
  } = useChat(currentUser, conversation, { onUnauthorized: onSessionExpired })
  const attachments = useAttachmentDrafts()
  useUnreadTitle(unreadCount)
  useVisualViewport()

  if (unavailableReason) return <ConversationUnavailable reason={unavailableReason} />

  const title = conversationInfo?.title ?? PENDING_TITLE[conversation.type]
  const isDirect = conversation.type === "direct"
  // Entre amis : l'ami et sa présence ; en groupe : qui est là.
  const audience =
    conversation.type === "direct"
      ? { type: "direct" as const, friend: { id: conversation.userId, name: title }, friendPresence }
      : { type: "group" as const, onlineUsers }

  return (
    // L'appel (audio / vidéo) partage la connexion du chat.
    <CallProvider socket={socket} isDirect={isDirect} title={title} currentUserId={currentUser.id}>
      {autoJoinCall && <AutoJoinCall onHandled={onAutoJoinHandled} />}
      {/* L'écoute est coordonnée pour toute la conversation (un vocal à la fois, enchaînement). */}
      <VoicePlaybackProvider
        messages={messages}
        currentUserId={currentUser.id}
        liveListeners={liveListeners}
        onListeningChange={setListening}
        onListenProgress={reportListenProgress}
        onListened={markListened}
      >
        {/* Mobile : calé sur la zone visible, en-tête et saisie restent à l'écran même clavier ouvert.
            Grand écran : remplit le panneau à côté de la barre latérale.
            Les fichiers peuvent être déposés n'importe où dans la conversation. */}
        <FileDropZone
          onDropFiles={attachments.addFiles}
          className="fixed inset-x-0 top-(--viewport-offset-top) flex h-(--viewport-height) w-full flex-col overflow-hidden bg-background md:relative md:inset-auto md:h-full md:flex-1"
        >
          <ChatHeader
            {...audience}
            title={title}
            connectionStatus={connectionStatus}
            actions={<LiveButton disabled={connectionStatus !== "connected"} />}
          />
          <ConnectionBanner status={connectionStatus} />
          <LiveBanner />

          {/* Zone des messages : mini-lecteur et mini-direct flottent à l'intérieur,
              sans couvrir l'en-tête ni l'orbe. */}
          <div className="relative flex min-h-0 flex-1 flex-col">
            <MessageList
              messages={messages}
              isHistoryLoaded={isHistoryLoaded}
              currentUserId={currentUser.id}
              isDirect={isDirect}
              activeUsers={activeUsers}
              receipts={receipts}
              unreadCount={unreadCount}
              latestIncomingSeq={latestIncomingSeq}
              onRead={markAsRead}
              onRetry={retryMessage}
              onReact={toggleReaction}
            />
            <FloatingPlayer />
            <CallMini />
          </div>

          <ChatComposer
            onSend={sendMessage}
            onTyping={notifyTyping}
            onRecordingChange={setRecording}
            attachments={attachments}
          />

          {/* La scène de l'appel recouvre toute la conversation quand elle est ouverte. */}
          <CallStage />
        </FileDropZone>
      </VoicePlaybackProvider>
    </CallProvider>
  )
}
