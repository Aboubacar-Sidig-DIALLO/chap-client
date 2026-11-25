import { ROUTES } from "@/features/auth/lib/routes"

/** Page de la conversation : avec l'ami, ou du groupe. */
export function conversationHref(target: { type: "direct"; userId: string } | { type: "group"; groupId: string }) {
  return target.type === "direct" ? ROUTES.friend(target.userId) : ROUTES.group(target.groupId)
}
