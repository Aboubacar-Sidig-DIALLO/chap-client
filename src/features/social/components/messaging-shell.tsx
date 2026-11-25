"use client"

import { Suspense } from "react"
import { usePathname } from "next/navigation"
import { SessionGate } from "@/features/auth/components/session-gate"
import { cn } from "@/lib/utils"
import { conversationKeyFromPath } from "../lib/conversation"
import { HomeSidebar, SIDEBAR_FRAME } from "./home-sidebar"

/**
 * Coque de la messagerie. Sur mobile, une page à la fois : la liste sur
 * l'accueil, la conversation sinon. Sur grand écran, les deux côte à côte :
 * la barre latérale reste en place d'une conversation à l'autre.
 *
 * Le panneau ne dépend ni de l'adresse ni de la session : il est toujours
 * prérendu (navigation instantanée), chaque conversation vérifiant la sienne.
 */
export function MessagingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-1 md:h-dvh md:flex-none md:overflow-hidden">
      <Suspense fallback={<div aria-hidden className={cn(SIDEBAR_FRAME, "max-md:hidden")} />}>
        <ShellSidebar />
      </Suspense>
      <div className="relative flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  )
}

/** Barre latérale : masquée sur mobile dès qu'une conversation est ouverte. */
function ShellSidebar() {
  const activeKey = conversationKeyFromPath(usePathname())
  const visibility = cn(activeKey !== null && "max-md:hidden")

  return (
    <SessionGate fallbackClassName={cn(SIDEBAR_FRAME, visibility)}>
      {(user) => <HomeSidebar user={user} activeKey={activeKey} className={visibility} />}
    </SessionGate>
  )
}
