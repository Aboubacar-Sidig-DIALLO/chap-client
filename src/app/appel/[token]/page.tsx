import type { Metadata } from "next"
import { GuestCallPage } from "@/features/call-guests/components/guest-call-page"

export const metadata: Metadata = {
  title: "Rejoindre l'appel",
  // Lien personnel, à usage unique : jamais indexé, jamais transmis aux sites
  // dont la page charge des ressources (en-tête `Referer`).
  robots: { index: false, follow: false },
  referrer: "no-referrer",
}

/** Invité d'un appel de groupe, sans compte : l'appel, et rien d'autre, le temps qu'il dure. */
export default function GuestCallRoute() {
  return <GuestCallPage />
}
