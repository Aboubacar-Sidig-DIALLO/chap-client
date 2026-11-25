import type { Metadata } from "next"
import { ConversationPlaceholder } from "@/features/social/components/conversation-placeholder"

export const metadata: Metadata = { title: "Accueil" }

/**
 * Accueil : sur mobile, la liste des amis et groupes (barre latérale de la coque) ;
 * sur grand écran, ce panneau invite à choisir une conversation.
 */
export default function Home() {
  return <ConversationPlaceholder />
}
