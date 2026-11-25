"use client"

import { useRef, useState } from "react"
import { Effect } from "@animate-ui/react/primitives/effects/effect"
import { Button } from "@/components/ui/button"
import { SessionGate, type SessionUser } from "@/features/auth/components/session-gate"
import { useSocial } from "../hooks/use-social"
import { useUserSearch } from "../hooks/use-user-search"
import { FriendsSection } from "./friends-section"
import { GroupsSection } from "./groups-section"
import { HomeHeader } from "./home-header"
import { LoadError, SectionsSkeleton } from "./load-states"
import { SalonCard } from "./salon-card"
import { SearchField } from "./search-field"
import { SearchResults } from "./search-results"
import { SocialToast } from "./social-toast"

/** Réglages d'entrée d'Animate UI (`recipes/page.md`). */
const ENTRANCE = { fade: true, blur: { initialBlur: 2 }, slide: { offset: 12 } } as const

/**
 * Accueil : retrouver ses amis et ses groupes, en créer, chercher quelqu'un.
 * La recherche, en haut, remplace le contenu dès qu'on tape un nom.
 */
export function HomeScreen({ user }: { user: SessionUser }) {
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [searchInput, setSearchInput] = useState("")
  const search = useUserSearch(searchInput)
  const social = useSocial()

  async function addFriend(userId: string) {
    const relation = await social.addFriend(userId)
    if (relation) search.updateRelation(userId, relation)
  }

  async function removeFriend(userId: string) {
    const relation = await social.removeFriend(userId)
    if (relation) search.updateRelation(userId, relation)
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-5 px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
      <HomeHeader user={user} />
      <SocialToast announced={social.announced} onDismiss={social.dismissAnnounced} onAccept={addFriend} />

      {/* La recherche reste visible en défilant. */}
      <div className="sticky top-0 z-10 -mx-4 bg-background/85 px-4 py-2 backdrop-blur-lg">
        <SearchField
          ref={searchInputRef}
          value={searchInput}
          onChange={setSearchInput}
          isSearching={search.isSearching}
        />
      </div>

      {search.isActive ? (
        <SearchResults
          query={searchInput}
          results={search.results}
          isSearching={search.isSearching}
          error={search.error}
          onAdd={addFriend}
          onRemove={removeFriend}
        />
      ) : search.needsMoreCharacters ? (
        <p className="px-1 text-sm text-muted-foreground">Encore une lettre…</p>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Le salon ne dépend pas des amis : toujours accessible, même si leur chargement échoue. */}
          <SalonCard />

          {social.overview && social.groups ? (
            <Effect {...ENTRANCE} className="flex flex-col gap-6">
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
                onAdd={addFriend}
                onRemove={removeFriend}
                onFindFriends={() => searchInputRef.current?.focus()}
                unreadCount={social.unreadCount}
              />
              <GroupsSection
                currentUserId={user.id}
                groups={social.groups}
                friends={social.overview.friends}
                onCreate={social.createGroup}
                onLeave={social.leaveGroup}
                unreadCount={social.unreadCount}
              />
            </Effect>
          ) : social.error ? (
            <LoadError message={social.error} onRetry={social.reload} />
          ) : (
            <SectionsSkeleton />
          )}
        </div>
      )}
    </main>
  )
}

/** Page d'accueil, réservée aux utilisateurs connectés. */
export function HomePage() {
  return <SessionGate>{(user) => <HomeScreen user={user} />}</SessionGate>
}
