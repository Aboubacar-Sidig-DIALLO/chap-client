import { apiFetch } from "@/lib/api"
import type { FriendsOverview, GroupSummary, Relation, SearchResult } from "../types"

/** Appels à l'API sociale (`sse/src/social`). */
export const socialApi = {
  searchUsers: (query: string, signal?: AbortSignal) =>
    apiFetch<SearchResult[]>(`/users/search?q=${encodeURIComponent(query)}`, { signal }),

  getFriends: () => apiFetch<FriendsOverview>("/friends"),

  /** Envoie une demande, ou accepte celle reçue. */
  addFriend: (userId: string) =>
    apiFetch<{ relation: Relation }>(`/friends/${encodeURIComponent(userId)}`, { method: "POST" }),

  /** Retire un ami, refuse ou annule une demande. */
  removeFriend: (userId: string) =>
    apiFetch<{ relation: Relation }>(`/friends/${encodeURIComponent(userId)}`, { method: "DELETE" }),

  getGroups: () => apiFetch<GroupSummary[]>("/groups"),

  createGroup: (input: { name: string; memberIds: string[] }) =>
    apiFetch<GroupSummary>("/groups", { method: "POST", body: input }),

  getGroup: (groupId: string) => apiFetch<GroupSummary>(groupPath(groupId)),

  /** Propriétaire uniquement, comme toutes les modifications ci-dessous. */
  renameGroup: (groupId: string, name: string) =>
    apiFetch<GroupSummary>(groupPath(groupId), { method: "PATCH", body: { name } }),

  setGroupPhoto: (groupId: string, photo: Blob) => {
    const form = new FormData()
    form.append("photo", photo, "photo.jpg")
    return apiFetch<GroupSummary>(`${groupPath(groupId)}/photo`, { method: "PUT", body: form })
  },

  removeGroupPhoto: (groupId: string) =>
    apiFetch<GroupSummary>(`${groupPath(groupId)}/photo`, { method: "DELETE" }),

  addGroupMembers: (groupId: string, memberIds: string[]) =>
    apiFetch<GroupSummary>(`${groupPath(groupId)}/members`, { method: "POST", body: { memberIds } }),

  removeGroupMember: (groupId: string, userId: string) =>
    apiFetch<void>(`${groupPath(groupId)}/members/${encodeURIComponent(userId)}`, { method: "DELETE" }),

  /** Le propriétaire qui part passe la main au membre le plus ancien. */
  leaveGroup: (groupId: string) => apiFetch<void>(`${groupPath(groupId)}/membership`, { method: "DELETE" }),
}

function groupPath(groupId: string) {
  return `/groups/${encodeURIComponent(groupId)}`
}
