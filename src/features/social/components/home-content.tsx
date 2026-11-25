"use client"

import { Effect } from "@animate-ui/react/primitives/effects/effect"
import { Button } from "@/components/ui/button"
import type { SessionUser } from "@/features/auth/components/session-gate"
import type { useSocial } from "../hooks/use-social"
import type { useUserSearch } from "../hooks/use-user-search"
import { FriendsSection } from "./friends-section"
import { GroupsSection } from "./groups-section"
import { LoadError, SectionsSkeleton } from "./load-states"
import { SearchResults } from "./search-results"

/** Réglages d'entrée d'Animate UI (`recipes/page.md`). */
const ENTRANCE = { fade: true, blur: { initialBlur: 2 }, slide: { offset: 12 } } as const

interface HomeContentProps {
  user: SessionUser
  activeKey: string | null
  searchInput: string
  search: ReturnType<typeof useUserSearch>
  social: ReturnType<typeof useSocial>
  onAdd: (userId: string) => Promise<unknown>
  onRemove: (userId: string) => Promise<unknown>
  onFindFriends: () => void
}

/** Sous la recherche : ses résultats dès qu'on tape un nom, sinon amis et groupes. */
export function HomeContent({ user, activeKey, searchInput, search, social, onAdd, onRemove, onFindFriends }: HomeContentProps) {
  if (search.isActive) {
    return (
      <SearchResults
        query={searchInput}
        results={search.results}
        isSearching={search.isSearching}
        error={search.error}
        onAdd={onAdd}
        onRemove={onRemove}
      />
    )
  }

  if (search.needsMoreCharacters) {
    return <p className="px-1 text-sm text-muted-foreground">Encore une lettre…</p>
  }

  if (!social.overview || !social.groups) {
    if (social.error) return <LoadError message={social.error} onRetry={social.reload} />
    return <SectionsSkeleton />
  }

  return (
    <Effect {...ENTRANCE} className="flex flex-col gap-6 md:gap-5">
      {/* Échec d'une action, les listes restent affichées. */}
      {social.error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-2xl bg-destructive/10 py-2 pr-2 pl-4 text-sm text-destructive"
        >
          <span>{social.error}</span>
          <Button variant="ghost" size="sm" onClick={social.dismissError} className="shrink-0">
            OK
          </Button>
        </div>
      )}
      <FriendsSection
        currentUserId={user.id}
        overview={social.overview}
        onAdd={onAdd}
        onRemove={onRemove}
        onFindFriends={onFindFriends}
        unreadCount={social.unreadCount}
        activeKey={activeKey}
      />
      <GroupsSection
        currentUserId={user.id}
        groups={social.groups}
        friends={social.overview.friends}
        onCreate={social.createGroup}
        onLeave={social.leaveGroup}
        unreadCount={social.unreadCount}
        activeKey={activeKey}
      />
    </Effect>
  )
}
