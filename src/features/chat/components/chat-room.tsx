"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ROUTES } from "@/features/auth/lib/routes"
import { AutoJoinCall } from "@/features/call/components/auto-join-call"
import { CallMini } from "@/features/call/components/call-mini"
import { CallProvider } from "@/features/call/components/call-provider"
import { CallStage } from "@/features/call/components/call-stage"
import { LiveBanner } from "@/features/call/components/live-banner"
import { LiveButton } from "@/features/call/components/live-button"
import { GroupInfoDialog } from "@/features/social/components/group-info/group-info-dialog"
import { TalkieProvider } from "@/features/talkie/components/talkie-provider"
import { clearNotifications } from "@/features/push/lib/push-store"
import { conversationKey } from "@/features/social/types"
import { restrictionNotice } from "@/features/social/lib/group-rights"
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
import { MessageActionsProvider } from "./message-actions"
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
    rights,
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
    deleteMessage,
    editMessage,
    unsendMessage,
    removeAttachment,
  } = useChat(currentUser, conversation, { onUnauthorized: onSessionExpired })
  const attachments = useAttachmentDrafts()
  const router = useRouter()
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false)
  useUnreadTitle(unreadCount)
  useVisualViewport()

  // Conversation ouverte : ses notifications (messages, appel) n'ont plus lieu d'être.
  const key = conversationKey(conversation)
  useEffect(() => {
    void clearNotifications(key)
  }, [key])

  if (unavailableReason) return <ConversationUnavailable reason={unavailableReason} />

  const title = conversationInfo?.title ?? PENDING_TITLE[conversation.type]
  const isDirect = conversation.type === "direct"
  // Ce que le propriétaire du groupe vous a retiré, avec la raison en clair.
  const restrictions = {
    write: restrictionNotice(rights, "write"),
    voice: restrictionNotice(rights, "voice"),
  }
  // Entre amis : l'ami et sa présence ; en groupe : qui est là.
  const audience =
    conversation.type === "direct"
      ? { type: "direct" as const, friend: { id: conversation.userId, name: title }, friendPresence }
      : {
          type: "group" as const,
          groupId: conversation.groupId,
          photoUrl: conversationInfo?.photoUrl ?? null,
          onlineUsers,
          onOpenDetails: () => setIsGroupInfoOpen(true),
        }

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
        {/* Talkie-walkie : maintenir le micro, c'est parler en direct à ceux qui sont là. */}
        <TalkieProvider socket={socket} currentUserId={currentUser.id} onlineUsers={onlineUsers}>
          {/* Mobile : calé sur la zone visible, en-tête et saisie restent à l'écran même clavier ouvert.
              Grand écran : remplit le panneau à côté de la barre latérale.
              Les fichiers peuvent être déposés n'importe où dans la conversation. */}
          <FileDropZone
            // Déposer un fichier, c'est écrire : sans ce droit, rien n'est ajouté.
            onDropFiles={restrictions.write ? () => {} : attachments.addFiles}
            className="fixed inset-x-0 top-(--viewport-offset-top) flex h-(--viewport-height) w-full flex-col overflow-hidden bg-background md:relative md:inset-auto md:h-full md:flex-1"
          >
            <ChatHeader
              {...audience}
              title={title}
              connectionStatus={connectionStatus}
              actions={
                <LiveButton
                  disabled={connectionStatus !== "connected"}
                  restriction={restrictionNotice(rights, "call")}
                />
              }
            />
            <ConnectionBanner status={connectionStatus} />
            <LiveBanner />

            {/* Zone des messages : mini-lecteur et mini-direct flottent à l'intérieur,
                sans couvrir l'en-tête ni l'orbe. */}
            <div className="relative flex min-h-0 flex-1 flex-col">
              <MessageActionsProvider
                value={{
                  currentUserId: currentUser.id,
                  receipts,
                  canModerate: rights.moderate,
                  edit: editMessage,
                  unsend: unsendMessage,
                  removeAttachment,
                  moderate: deleteMessage,
                }}
              >
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
              </MessageActionsProvider>
              <FloatingPlayer />
              <CallMini />
            </div>

            <ChatComposer
              onSend={sendMessage}
              onTyping={notifyTyping}
              onRecordingChange={setRecording}
              attachments={attachments}
              restrictions={restrictions}
            />

            {/* La scène de l'appel recouvre toute la conversation quand elle est ouverte. */}
            <CallStage />

            {conversation.type === "group" && (
              <GroupInfoDialog
                groupId={conversation.groupId}
                currentUserId={currentUser.id}
                open={isGroupInfoOpen}
                onOpenChange={setIsGroupInfoOpen}
                // Plus membre : la conversation se ferme, on revient à l'accueil.
                onLeft={() => router.push(ROUTES.home)}
              />
            )}
          </FileDropZone>
        </TalkieProvider>
      </VoicePlaybackProvider>
    </CallProvider>
  )
}
