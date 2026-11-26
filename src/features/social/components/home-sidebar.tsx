"use client"

import { useRef, useState } from "react"
import type { SessionUser } from "@/features/auth/components/session-gate"
import { cn } from "@/lib/utils"
import { useHomeCommands } from "../hooks/use-home-commands"
import { useSearchShortcut } from "../hooks/use-search-shortcut"
import { useSocial } from "../hooks/use-social"
import { useUserSearch } from "../hooks/use-user-search"
import { HomeContent } from "./home-content"
import { HomeHeader } from "./home-header"
import { SearchField } from "./search-field"
import { AccountBar, SidebarBrand } from "./sidebar-chrome"
import { SocialToast } from "./social-toast"

/** Place de la barre latérale : toute la largeur sur mobile, une colonne sur grand écran. */
export const SIDEBAR_FRAME = "w-full md:h-dvh md:w-80 md:shrink-0 md:border-r md:bg-sidebar lg:w-96"

interface HomeSidebarProps {
  user: SessionUser
  /** Conversation ouverte à côté (voir `conversationKey`), `null` sur l'accueil. */
  activeKey: string | null
  className?: string
}

/**
 * Amis et groupes, recherche de personnes : toute la page d'accueil sur mobile
 * (la page entière défile), la barre latérale permanente sur grand écran
 * (marque en haut, compte en bas, seules les listes défilent).
 */
export function HomeSidebar({ user, activeKey, className }: HomeSidebarProps) {
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [searchInput, setSearchInput] = useState("")
  const [isCreatingGroup, setIsCreatingGroup] = useState(false)
  const search = useUserSearch(searchInput)
  const social = useSocial(activeKey)

  const focusSearch = () => searchInputRef.current?.select()
  useSearchShortcut(focusSearch)

  // Actions lancées depuis le panneau de bienvenue.
  useHomeCommands((command) => {
    switch (command) {
      case "search":
        focusSearch()
        break
      case "create-group":
        // Les groupes ne s'affichent qu'en dehors d'une recherche.
        setSearchInput("")
        setIsCreatingGroup(true)
        break
    }
  })

  async function addFriend(userId: string) {
    const relation = await social.addFriend(userId)
    if (relation) search.updateRelation(userId, relation)
  }

  async function removeFriend(userId: string) {
    const relation = await social.removeFriend(userId)
    if (relation) search.updateRelation(userId, relation)
  }

  return (
    <>
      <SocialToast announced={social.announced} onDismiss={social.dismissAnnounced} onAccept={addFriend} />

      <aside aria-label="Amis et groupes" className={cn(SIDEBAR_FRAME, "flex flex-col", className)}>
        <SidebarBrand />

        <div className="scrollbar-subtle flex flex-1 flex-col md:min-h-0 md:overflow-y-auto md:overscroll-contain">
          <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] md:max-w-none md:gap-3 md:px-3 md:pt-1 md:pb-4">
            <HomeHeader user={user} isPageTitle={activeKey === null} />

            {/* La recherche reste visible en défilant. */}
            <div className="sticky top-0 z-10 -mx-4 bg-background/85 px-4 py-2 backdrop-blur-lg md:-mx-3 md:bg-sidebar/85 md:px-3 md:pt-3">
              <SearchField
                ref={searchInputRef}
                value={searchInput}
                onChange={setSearchInput}
                isSearching={search.isSearching}
              />
            </div>

            <HomeContent
              user={user}
              activeKey={activeKey}
              searchInput={searchInput}
              search={search}
              social={social}
              onAdd={addFriend}
              onRemove={removeFriend}
              onFindFriends={() => searchInputRef.current?.focus()}
              createGroupDialog={{ open: isCreatingGroup, onOpenChange: setIsCreatingGroup }}
            />
          </div>
        </div>

        <AccountBar user={user} />
      </aside>
    </>
  )
}
