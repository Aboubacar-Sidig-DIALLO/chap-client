import Link from "next/link"
import { ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Mic } from "@/components/animate-ui/icons/hugeicons/mic"
import { ROUTES } from "@/features/auth/lib/routes"

/** Entrée vers le salon ouvert à tous, avec le disque « voix » de l'application. */
export function SalonCard() {
  return (
    <Link
      href={ROUTES.salon}
      className="group press flex items-center gap-4 rounded-3xl bg-voice p-4 pr-5 text-voice-foreground shadow-lg shadow-voice/25 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-voice-foreground/15">
        <Mic size={24} animateOnHover="wiggle" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">Salon général</p>
        <p className="text-sm text-voice-foreground/80">Ouvert à tous : venez dire bonjour.</p>
      </div>
      <HugeiconsIcon
        icon={ArrowRight01Icon}
        size={20}
        strokeWidth={2}
        className="shrink-0 transition-transform group-hover:translate-x-0.5"
      />
    </Link>
  )
}
