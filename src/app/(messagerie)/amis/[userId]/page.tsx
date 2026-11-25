import type { Metadata } from "next"
import { ConversationPage } from "@/features/chat/components/conversation-page"

export const metadata: Metadata = { title: "Conversation" }

/** Conversation privée avec un ami (le serveur vérifie l'amitié). */
export default function FriendConversationPage() {
  return <ConversationPage type="direct" />
}
