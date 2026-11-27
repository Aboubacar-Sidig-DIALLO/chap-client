import { formatNameList } from "@/features/chat/lib/format"
import type { ChatUser } from "@/features/chat/types"

/** « Sarah vous entend », « Sarah et Paul vous entendent », « 4 personnes vous entendent ». */
export function formatHearers(users: ChatUser[]) {
  if (users.length > 2) return `${users.length} personnes vous entendent`
  const verb = users.length > 1 ? "entendent" : "entend"
  return `${formatNameList(users.map((user) => user.name))} vous ${verb}`
}

/** « Sarah est en mode calme », « Sarah et Paul sont en mode calme », « 3 personnes sont en mode calme ». */
export function formatQuiet(users: ChatUser[]) {
  if (users.length > 2) return `${users.length} personnes sont en mode calme`
  const verb = users.length > 1 ? "sont" : "est"
  return `${formatNameList(users.map((user) => user.name))} ${verb} en mode calme`
}

/** « Sarah est là », « Sarah et Paul sont là », « 4 personnes sont là ». */
export function formatPresent(users: ChatUser[]) {
  if (users.length > 2) return `${users.length} personnes sont là`
  const verb = users.length > 1 ? "sont" : "est"
  return `${formatNameList(users.map((user) => user.name))} ${verb} là`
}
