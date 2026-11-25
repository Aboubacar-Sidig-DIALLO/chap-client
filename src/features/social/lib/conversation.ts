import { ROUTES } from "@/features/auth/lib/routes"
import { conversationKey } from "../types"

/** Page de la conversation : avec l'ami, ou du groupe. */
export function conversationHref(target: { type: "direct"; userId: string } | { type: "group"; groupId: string }) {
  return target.type === "direct" ? ROUTES.friend(target.userId) : ROUTES.group(target.groupId)
}

const CONVERSATION_PATH = /^\/(amis|groupes)\/([^/]+)\/?$/

/** Clé de la conversation ouverte à cette adresse (voir `conversationKey`), `null` ailleurs. */
export function conversationKeyFromPath(pathname: string): string | null {
  const match = CONVERSATION_PATH.exec(pathname)
  if (!match) return null
  const id = decodeURIComponent(match[2])
  return match[1] === "amis"
    ? conversationKey({ type: "direct", userId: id })
    : conversationKey({ type: "group", groupId: id })
}
