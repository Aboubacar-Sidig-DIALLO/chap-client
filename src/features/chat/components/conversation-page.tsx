"use client"

import { Suspense } from "react"
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation"
import { JOIN_CALL_PARAM } from "@/features/auth/lib/routes"
import type { ConversationRef } from "../types"
import { ChatApp } from "./chat-app"

/**
 * Lit l'identifiant de l'URL (`/amis/[userId]`, `/groupes/[groupId]`) et ouvre la
 * conversation. Avec `?rejoindre=appel`, rejoint aussi son appel en cours.
 */
function ConversationFromUrl({ type }: { type: "direct" | "group" }) {
  const params = useParams<{ userId?: string; groupId?: string }>()
  const router = useRouter()
  const pathname = usePathname()
  const autoJoinCall = useSearchParams().has(JOIN_CALL_PARAM)
  const conversation: ConversationRef =
    type === "direct"
      ? { type: "direct", userId: params.userId ?? "" }
      : { type: "group", groupId: params.groupId ?? "" }

  // `key` : changer d'ami ou de groupe ouvre une nouvelle connexion, avec un état vierge.
  return (
    <ChatApp
      key={`${type}:${params.userId ?? params.groupId}`}
      conversation={conversation}
      autoJoinCall={autoJoinCall}
      // Une fois fait, l'URL redevient celle de la conversation : recharger ne rappelle pas.
      onAutoJoinHandled={() => router.replace(pathname, { scroll: false })}
    />
  )
}

export function ConversationPage({ type }: { type: "direct" | "group" }) {
  return (
    <Suspense>
      <ConversationFromUrl type={type} />
    </Suspense>
  )
}
