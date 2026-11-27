import { apiFetch } from "@/lib/api"
import type { FriendsOverview, GroupPermissions, GroupSummary, Relation, SearchResult } from "../types"

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

  /** Propriétaire uniquement, comme les modifications ci-dessous (sauf mention contraire). */
  renameGroup: (groupId: string, name: string) =>
    apiFetch<GroupSummary>(groupPath(groupId), { method: "PATCH", body: { name } }),

  setGroupPhoto: (groupId: string, photo: Blob) => {
    const form = new FormData()
    form.append("photo", photo, "photo.jpg")
    return apiFetch<GroupSummary>(`${groupPath(groupId)}/photo`, { method: "PUT", body: form })
  },

  removeGroupPhoto: (groupId: string) =>
    apiFetch<GroupSummary>(`${groupPath(groupId)}/photo`, { method: "DELETE" }),

  /** Ce que tous les simples membres peuvent faire. */
  setGroupPermissions: (groupId: string, permissions: GroupPermissions) =>
    apiFetch<GroupSummary>(`${groupPath(groupId)}/permissions`, { method: "PUT", body: permissions }),

  /** Propriétaire ou administrateur. */
  addGroupMembers: (groupId: string, memberIds: string[]) =>
    apiFetch<GroupSummary>(`${groupPath(groupId)}/members`, { method: "POST", body: { memberIds } }),

  removeGroupMember: (groupId: string, userId: string) =>
    apiFetch<void>(`${groupPath(groupId)}/members/${encodeURIComponent(userId)}`, { method: "DELETE" }),

  /** Nomme ou destitue un administrateur, ou règle les restrictions d'un membre. */
  updateGroupMember: (
    groupId: string,
    userId: string,
    update: { role: "admin" | "member" } | { permissions: GroupPermissions }
  ) =>
    apiFetch<GroupSummary>(`${groupPath(groupId)}/members/${encodeURIComponent(userId)}`, {
      method: "PATCH",
      body: update,
    }),

  /** Tout membre ; le propriétaire désigne son successeur (`successorId`) s'il reste quelqu'un. */
  leaveGroup: (groupId: string, successorId?: string) =>
    apiFetch<void>(`${groupPath(groupId)}/leave`, { method: "POST", body: { successorId } }),
}

function groupPath(groupId: string) {
  return `/groups/${encodeURIComponent(groupId)}`
}
