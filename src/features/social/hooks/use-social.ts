"use client"

import { useRef, useState } from "react"
import { playSound } from "@/components/ui-sounds"
import { getErrorMessage } from "@/lib/api"
import { socialApi } from "../lib/api"
import {
  conversationKey,
  type FriendsOverview,
  type GroupSummary,
  type MessageNotice,
  type Relation,
  type SocialNotice,
} from "../types"
import { useSocialEvents } from "./use-social-events"

const CONNECTION_ERROR = "Connexion au serveur impossible. Nouvel essai en cours…"

/** Amis et groupes, chargés en parallèle. */
async function fetchSocial() {
  const [overview, groups] = await Promise.all([socialApi.getFriends(), socialApi.getGroups()])
  return { overview, groups }
}

/** Ce qui peut être annoncé sur l'accueil : un événement social ou un nouveau message. */
export type HomeNotice = SocialNotice | ({ type: "message" } & MessageNotice)

/** Annonce affichée à l'écran ; `id` distingue deux annonces successives identiques. */
export interface AnnouncedNotice {
  id: number
  notice: HomeNotice
}

/**
 * Amis, demandes et groupes de l'utilisateur connecté, avec les actions qui
 * les modifient. Tenus à jour en temps réel : une demande reçue apparaît
 * aussitôt, sans recharger la page.
 *
 * `activeKey` : conversation ouverte à l'écran ; ses messages sont lus sur place,
 * ils ne sont ni comptés ni annoncés.
 */
export function useSocial(activeKey: string | null = null) {
  const [overview, setOverview] = useState<FriendsOverview | null>(null)
  const [groups, setGroups] = useState<GroupSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [announced, setAnnounced] = useState<AnnouncedNotice | null>(null)
  /** Messages reçus depuis l'arrivée sur l'accueil, par conversation (voir `conversationKey`). */
  const [unread, setUnread] = useState<Readonly<Record<string, number>>>({})
  // Ouvrir une conversation la marque comme lue (état ajusté pendant le rendu).
  const [openedKey, setOpenedKey] = useState(activeKey)
  if (activeKey !== openedKey) {
    setOpenedKey(activeKey)
    if (activeKey && unread[activeKey]) setUnread((current) => ({ ...current, [activeKey]: 0 }))
  }
  /** Numéro du dernier chargement lancé : une réponse dépassée est ignorée. */
  const latestLoadRef = useRef(0)
  const noticeCountRef = useRef(0)

  async function reload() {
    const load = ++latestLoadRef.current
    try {
      const data = await fetchSocial()
      if (load !== latestLoadRef.current) return
      setOverview(data.overview)
      setGroups(data.groups)
      setError(null)
    } catch (loadError) {
      if (load === latestLoadRef.current) setError(getErrorMessage(loadError))
    }
  }

  function announce(notice: HomeNotice) {
    setAnnounced({ id: ++noticeCountRef.current, notice })
    playSound("pop")
  }

  useSocialEvents({
    onConnect: () => void reload(),
    onChange: (notice) => {
      void reload()
      if (notice) announce(notice)
    },
    onMessage: (notice) => {
      const key = conversationKey(notice.conversation)
      if (key === activeKey) return
      setUnread((current) => ({ ...current, [key]: (current[key] ?? 0) + 1 }))
      announce({ type: "message", ...notice })
    },
    // Présence d'un ami : mise à jour sur place, sans recharger les listes.
    onPresence: ({ userId, online, lastSeenAt }) => {
      setOverview((current) =>
        current && {
          ...current,
          friends: current.friends.map((friend) =>
            friend.id === userId ? { ...friend, presence: { online, lastSeenAt } } : friend
          ),
        }
      )
    },
    // Appel commencé, rejoint, quitté ou terminé : la ligne de l'ami ou du groupe suit.
    onCallChanged: ({ conversation, call }) => {
      if (conversation.type === "group") {
        setGroups((current) =>
          current && current.map((group) => (group.id === conversation.groupId ? { ...group, call } : group))
        )
      } else {
        setOverview((current) =>
          current && {
            ...current,
            friends: current.friends.map((friend) =>
              friend.id === conversation.userId ? { ...friend, call } : friend
            ),
          }
        )
      }
    },
    // Sans données à afficher, on explique l'attente ; sinon les listes restent visibles.
    onConnectError: () => {
      if (!overview) setError(CONNECTION_ERROR)
    },
  })

  /** Exécute une action ; en cas d'échec, l'erreur s'affiche et rien n'est levé. */
  async function run<T>(action: () => Promise<T>): Promise<T | undefined> {
    try {
      const result = await action()
      setError(null)
      return result
    } catch (actionError) {
      setError(getErrorMessage(actionError))
      return undefined
    }
  }

  /** Envoie une demande, ou accepte celle reçue. Renvoie le nouveau lien. */
  async function addFriend(userId: string): Promise<Relation | undefined> {
    const result = await run(() => socialApi.addFriend(userId))
    await reload()
    return result?.relation
  }

  /** Retire un ami, refuse ou annule une demande. */
  async function removeFriend(userId: string): Promise<Relation | undefined> {
    const result = await run(() => socialApi.removeFriend(userId))
    await reload()
    return result?.relation
  }

  /** Crée un groupe ; lève l'erreur pour que le formulaire l'affiche sur place. */
  async function createGroup(input: { name: string; memberIds: string[] }) {
    const group = await socialApi.createGroup(input)
    setGroups((current) => [group, ...(current ?? [])])
    return group
  }

  return {
    overview,
    groups,
    error,
    dismissError: () => setError(null),
    /** Dernier événement à annoncer (demande reçue, acceptée, ajout à un groupe). */
    announced,
    dismissAnnounced: () => setAnnounced(null),
    /** Nombre de messages non lus d'une conversation reçus sur l'accueil. */
    unreadCount: (key: string) => unread[key] ?? 0,
    reload,
    addFriend,
    removeFriend,
    createGroup,
  }
}
