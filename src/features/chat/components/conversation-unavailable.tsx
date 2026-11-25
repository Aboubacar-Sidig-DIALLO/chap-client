import Link from "next/link"
import { LockIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { buttonVariants } from "@/components/ui/button"
import { ROUTES } from "@/features/auth/lib/routes"
import type { ConversationUnavailableReason } from "../types"

const COPY: Record<ConversationUnavailableReason, { title: string; description: string }> = {
  forbidden: {
    title: "Conversation indisponible",
    description: "Vous ne pouvez écrire qu'à vos amis et aux groupes dont vous faites partie.",
  },
  closed: {
    title: "Conversation fermée",
    description: "Vous n'êtes plus amis, ou vous avez quitté ce groupe : cette conversation n'est plus accessible.",
  },
}

/** Conversation refusée ou fermée en cours de route : on l'explique et on ramène à l'accueil. */
export function ConversationUnavailable({ reason }: { reason: ConversationUnavailableReason }) {
  const { title, description } = COPY[reason]

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 px-6 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <HugeiconsIcon icon={LockIcon} size={26} strokeWidth={2} />
      </span>
      <div className="max-w-xs space-y-1.5">
        <h1 className="text-lg font-semibold">{title}</h1>
        <p className="text-sm text-balance text-muted-foreground">{description}</p>
      </div>
      <Link href={ROUTES.home} className={buttonVariants({ size: "lg", className: "h-11" })}>
        Retour à l&apos;accueil
      </Link>
    </main>
  )
}
