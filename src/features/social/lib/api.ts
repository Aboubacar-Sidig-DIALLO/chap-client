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

  leaveGroup: (groupId: string) =>
    apiFetch<void>(`/groups/${encodeURIComponent(groupId)}/membership`, { method: "DELETE" }),
}
