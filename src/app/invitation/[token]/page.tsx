import type { Metadata } from "next"
import { InvitePage } from "@/features/invites/components/invite-page"

export const metadata: Metadata = {
  title: "Invitation",
  // Un lien d'invitation est personnel et éphémère : jamais indexé, jamais transmis
  // aux sites dont la page charge des ressources (en-tête `Referer`).
  robots: { index: false, follow: false },
  referrer: "no-referrer",
}

/** Invitation éphémère ouverte par un lien ou un QR code : devenir ami, ou rejoindre un groupe. */
export default function InvitationPage() {
  return <InvitePage />
}
