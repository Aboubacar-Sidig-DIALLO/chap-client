import type { Metadata } from "next"
import { ConversationPage } from "@/features/chat/components/conversation-page"

export const metadata: Metadata = { title: "Groupe" }

/** Conversation d'un groupe (le serveur vérifie l'appartenance). */
export default function GroupConversationPage() {
  return <ConversationPage type="group" />
}
