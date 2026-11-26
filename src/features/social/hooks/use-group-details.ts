"use client"

import { useRef, useState } from "react"
import { ApiError } from "@/lib/api"
import { socialApi } from "../lib/api"
import type { GroupSummary, PublicUser } from "../types"
import { useSocialEvents } from "./use-social-events"

/** `missing` : le groupe n'existe plus, ou vous n'en faites plus partie. */
export type GroupDetailsStatus = "loading" | "ready" | "missing" | "error"

/**
 * Un groupe et vos amis (pour en ajouter), chargés à l'ouverture de sa fiche
 * et tenus à jour en temps réel tant qu'elle est ouverte. Les actions lèvent
 * leur erreur : la fiche l'affiche sur place.
 *
 * Le serveur vérifie chaque droit ; l'interface ne fait que masquer ce que
 * l'utilisateur ne peut pas faire.
 */
export function useGroupDetails(groupId: string) {
  const [group, setGroup] = useState<GroupSummary | null>(null)
  const [friends, setFriends] = useState<PublicUser[]>([])
  const [status, setStatus] = useState<GroupDetailsStatus>("loading")
  /** Numéro du dernier chargement lancé : une réponse dépassée est ignorée. */
  const latestLoadRef = useRef(0)

  async function reload() {
    const load = ++latestLoadRef.current
    try {
      const [nextGroup, overview] = await Promise.all([socialApi.getGroup(groupId), socialApi.getFriends()])
      if (load !== latestLoadRef.current) return
      setGroup(nextGroup)
      setFriends(overview.friends)
      setStatus("ready")
    } catch (error) {
      if (load !== latestLoadRef.current) return
      setStatus(error instanceof ApiError && error.status === 404 ? "missing" : "error")
    }
  }

  // Chargé à la connexion, puis à chaque changement (nom, photo, membres, amis).
  useSocialEvents({ onConnect: () => void reload(), onChange: () => void reload() })

  /** Applique la réponse du serveur, qui fait foi. */
  async function apply(request: Promise<GroupSummary>) {
    setGroup(await request)
  }

  return {
    group,
    friends,
    status,
    reload,
    rename: (name: string) => apply(socialApi.renameGroup(groupId, name)),
    setPhoto: (photo: Blob) => apply(socialApi.setGroupPhoto(groupId, photo)),
    removePhoto: () => apply(socialApi.removeGroupPhoto(groupId)),
    addMembers: (memberIds: string[]) => apply(socialApi.addGroupMembers(groupId, memberIds)),
    removeMember: async (userId: string) => {
      await socialApi.removeGroupMember(groupId, userId)
      setGroup((current) => current && { ...current, members: current.members.filter((member) => member.id !== userId) })
    },
    leave: () => socialApi.leaveGroup(groupId),
  }
}
