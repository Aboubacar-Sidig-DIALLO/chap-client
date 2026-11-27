"use client"

import { useEffect, useEffectEvent, useState } from "react"
import { useParams } from "next/navigation"
import { Effect } from "@animate-ui/react/primitives/effects/effect"
import { Spinner } from "@/components/ui/spinner"
import { ApiError, getErrorMessage } from "@/lib/api"
import { PAGE_ENTRANCE } from "@/lib/motion"
import { callGuestsApi } from "../lib/api"
import { forgetClaim, readClaim, storeClaim } from "../lib/claim-storage"
import type { GuestClaim, GuestLinkPreview } from "../types"
import { GuestCallOutcome, type GuestScreen } from "./guest-call-outcome"
import { GuestCallRoom, type GuestCallOutcome as CallOutcome } from "./guest-call-room"
import { GuestLobby } from "./guest-lobby"

type Stage =
  | { name: "loading" }
  | { name: "lobby"; preview: GuestLinkPreview }
  | { name: "call"; claim: GuestClaim }
  | { name: "screen"; screen: GuestScreen; claim: GuestClaim | null }

/** Lien inconnu, déjà utilisé, expiré, appel terminé (410) ou mal recopié (400). */
function isGoneError(error: unknown): error is ApiError {
  return error instanceof ApiError && (error.status === 410 || error.status === 400)
}

/**
 * Page d'un invité d'appel de groupe, sans compte (`/appel/<lien>`) :
 * l'accueil (quel appel, sous quel nom), l'appel lui-même, puis sa fin.
 * Le lien ne sert qu'une fois ; un rechargement ramène pourtant dans
 * l'appel, grâce au laissez-passer gardé le temps de l'onglet.
 */
export function GuestCallPage() {
  const { token } = useParams<{ token: string }>()
  return <GuestCall key={token} token={token} />
}

function GuestCall({ token }: { token: string }) {
  const [stage, setStage] = useState<Stage>({ name: "loading" })
  const [isJoining, setIsJoining] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)

  // À l'ouverture : déjà entré depuis cet onglet (page rechargée) ? Sinon, l'aperçu du lien.
  const firstStage = useEffectEvent(async (): Promise<Stage> => {
    const claim = readClaim(token)
    // Le micro ne s'ouvre que sur un geste : on propose d'y revenir.
    if (claim) return { name: "screen", screen: { kind: "left", error: null }, claim }
    try {
      return { name: "lobby", preview: await callGuestsApi.preview(token) }
    } catch (error) {
      const screen: GuestScreen = isGoneError(error)
        ? { kind: "gone", message: error.message }
        : { kind: "unreachable", message: getErrorMessage(error) }
      return { name: "screen", screen, claim: null }
    }
  })
  useEffect(() => {
    let isCurrent = true
    void firstStage().then((next) => isCurrent && setStage(next))
    return () => {
      isCurrent = false
    }
  }, [])

  async function join(name: string) {
    setJoinError(null)
    setIsJoining(true)
    try {
      const claim = await callGuestsApi.claim(token, name)
      storeClaim(token, claim)
      setStage({ name: "call", claim })
    } catch (error) {
      if (isGoneError(error)) {
        setStage({ name: "screen", screen: { kind: "gone", message: error.message }, claim: null })
      } else {
        setJoinError(getErrorMessage(error))
      }
    } finally {
      setIsJoining(false)
    }
  }

  function handleOutcome(claim: GuestClaim, outcome: CallOutcome) {
    // Terminé ou retiré : le laissez-passer ne vaut plus rien, on l'oublie.
    if (outcome.reason !== "left") forgetClaim(token)
    const screen: GuestScreen =
      outcome.reason === "ended"
        ? { kind: "ended", groupName: claim.group.name }
        : outcome.reason === "removed"
          ? { kind: "removed" }
          : { kind: "left", error: outcome.error }
    setStage({ name: "screen", screen, claim: outcome.reason === "left" ? claim : null })
  }

  if (stage.name === "call") {
    return <GuestCallRoom claim={stage.claim} onOutcome={(outcome) => handleOutcome(stage.claim, outcome)} />
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-[radial-gradient(70%_50%_at_50%_20%,color-mix(in_oklch,var(--voice)_10%,transparent),transparent_70%)] px-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <Effect
        key={stage.name === "screen" ? stage.screen.kind : stage.name}
        {...PAGE_ENTRANCE}
        className="flex w-full max-w-sm flex-col items-center gap-7 text-center"
      >
        {stage.name === "loading" && <Spinner size={24} className="text-muted-foreground" />}
        {stage.name === "lobby" && (
          <GuestLobby preview={stage.preview} isJoining={isJoining} error={joinError} onJoin={(name) => void join(name)} />
        )}
        {stage.name === "screen" && (
          <GuestCallOutcome
            screen={stage.screen}
            onRetry={
              stage.claim
                ? () => stage.claim && setStage({ name: "call", claim: stage.claim })
                : stage.screen.kind === "unreachable"
                  ? () => window.location.reload()
                  : undefined
            }
          />
        )}
      </Effect>
    </main>
  )
}
