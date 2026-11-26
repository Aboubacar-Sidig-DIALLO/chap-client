import type { Metadata } from "next"
import { WelcomePanel } from "@/features/social/components/welcome-panel"

export const metadata: Metadata = { title: "Accueil" }

/**
 * Accueil : sur mobile, la liste des amis et groupes (barre latérale de la coque) ;
 * sur grand écran, ce panneau salue l'utilisateur et propose de quoi démarrer.
 */
export default function Home() {
  return <WelcomePanel />
}
