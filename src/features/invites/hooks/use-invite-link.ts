"use client"

import { useEffect, useEffectEvent, useState } from "react"
import { useNow } from "@/features/social/hooks/use-now"
import { getErrorMessage } from "@/lib/api"
import { invitesApi, inviteUrl } from "../lib/api"
import type { CreatedInvite, InviteTarget } from "../types"

/** Où en est le lien affiché. */
export type InviteLinkState =
  | { status: "loading" }
  | { status: "ready"; invite: CreatedInvite }
  /** Désactivé par son auteur : il ne marche plus. */
  | { status: "revoked" }
  | { status: "error"; message: string }

/**
 * L'invitation de l'utilisateur vers `target`, telle qu'on la montre : le
 * lien, le temps qu'il lui reste (rafraîchi chaque seconde), et de quoi en
 * générer un nouveau ou le désactiver. À monter à l'ouverture de la fenêtre :
 * elle réaffiche l'invitation encore valable, ou en crée une.
 */
export function useInviteLink(target: InviteTarget) {
  const [state, setState] = useState<InviteLinkState>({ status: "loading" })
  const [isBusy, setIsBusy] = useState(false)
  const now = useNow(1000)

  /** Demande l'invitation (`renew` : une nouvelle, l'ancien lien cesse de marcher). */
  async function request(renew: boolean) {
    try {
      setState({ status: "ready", invite: await invitesApi.create(target, renew) })
    } catch (error) {
      setState({ status: "error", message: getErrorMessage(error) })
    }
  }

  // À l'ouverture : l'invitation encore valable, ou une nouvelle. Une réponse
  // arrivée après la fermeture (ou un changement de cible) est ignorée.
  const fetchCurrent = useEffectEvent(() => invitesApi.create(target))
  const targetKey = target.type === "group" ? `group:${target.groupId}` : "friend"
  useEffect(() => {
    let isCurrent = true
    fetchCurrent().then(
      (invite) => isCurrent && setState({ status: "ready", invite }),
      (error: unknown) => isCurrent && setState({ status: "error", message: getErrorMessage(error) })
    )
    return () => {
      isCurrent = false
    }
  }, [targetKey])

  async function run(action: () => Promise<void>) {
    setIsBusy(true)
    await action()
    setIsBusy(false)
  }

  const invite = state.status === "ready" ? state.invite : null
  const remainingMs = invite ? Math.max(0, Date.parse(invite.expiresAt) - now) : 0

  return {
    state,
    /** Lien complet à partager ; `null` sans invitation valable. */
    url: invite && remainingMs > 0 ? inviteUrl(invite.token) : null,
    token: invite?.token ?? null,
    remainingMs,
    isExpired: invite !== null && remainingMs === 0,
    /** Une demande (nouveau lien, désactivation) est en cours. */
    isBusy,
    renew: () => run(() => request(true)),
    revoke: () =>
      run(async () => {
        if (!invite) return
        try {
          await invitesApi.revoke(invite.token)
          setState({ status: "revoked" })
        } catch (error) {
          setState({ status: "error", message: getErrorMessage(error) })
        }
      }),
  }
}
