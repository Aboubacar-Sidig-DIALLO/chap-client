"use client"

import { UserAdd01Icon, UserMultipleIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { AutoHeight } from "@/components/motion/auto-height"
import { Reveal } from "@/components/motion/reveal"
import { Swap } from "@/components/motion/swap"
import { Button } from "@/components/ui/button"
import { useNow } from "../hooks/use-now"
import { byPresenceThenName } from "../lib/presence"
import { conversationKey, type FriendsOverview } from "../types"
import { FriendRow } from "./friend-row"
import { InviteButton } from "./invite-button"
import { PersonRow } from "./person-row"
import { RelationActions } from "./relation-actions"
import { Section, SectionEmpty, SectionList } from "./section"

interface FriendsSectionProps {
  currentUserId: string
  overview: FriendsOverview
  onRemove: (userId: string) => Promise<unknown>
  onAdd: (userId: string) => Promise<unknown>
  /** Place le curseur dans la recherche, pour trouver ses premiers amis. */
  onFindFriends: () => void
  /** Messages non lus reçus d'une conversation (voir `conversationKey`). */
  unreadCount: (key: string) => number
  /** Conversation ouverte à l'écran (voir `conversationKey`). */
  activeKey: string | null
}

/** Demandes reçues en tête (elles attendent une réponse), puis les amis et les demandes envoyées. */
export function FriendsSection({
  currentUserId,
  overview,
  onAdd,
  onRemove,
  onFindFriends,
  unreadCount,
  activeKey,
}: FriendsSectionProps) {
  const { incoming, outgoing } = overview
  // Amis en ligne en tête ; « depuis 5 min » se met à jour tout seul.
  const friends = [...overview.friends].sort(byPresenceThenName)
  const now = useNow()

  return (
    <>
      {/* Les demandes reçues se déplient en tête, puis se replient une fois traitées. */}
      <Reveal show={incoming.length > 0} gap="var(--home-gap)" gapSide="after">
        <Section title="Demandes reçues" icon={UserAdd01Icon} count={incoming.length}>
          <SectionList>
            {incoming.map((user) => (
              <PersonRow
                key={user.id}
                user={user}
                description="Veut devenir votre ami"
                actions={
                  <RelationActions
                    name={user.name}
                    relation="incoming"
                    onAdd={() => onAdd(user.id)}
                    onRemove={() => onRemove(user.id)}
                  />
                }
              />
            ))}
          </SectionList>
        </Section>
      </Reveal>

      <Section title="Amis" icon={UserMultipleIcon} count={friends.length}>
        {/* Premier ami, dernier ami parti : la liste et l'invitation se fondent l'une dans l'autre. */}
        <AutoHeight>
        <Swap swapKey={friends.length === 0 && outgoing.length === 0 ? "empty" : "list"}>
        {friends.length === 0 && outgoing.length === 0 ? (
          <SectionEmpty
            icon={<HugeiconsIcon icon={UserAdd01Icon} strokeWidth={2} />}
            title="Pas encore d'amis"
            description="Recherchez vos proches par leur nom, ou invitez-les à vous rejoindre s'ils n'ont pas encore de compte."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button onClick={onFindFriends}>Trouver des amis</Button>
                <InviteButton />
              </div>
            }
          />
        ) : (
          <SectionList>
            {friends.map((friend) => {
              const key = conversationKey({ type: "direct", userId: friend.id })
              return (
                <FriendRow
                  key={friend.id}
                  friend={friend}
                  currentUserId={currentUserId}
                  now={now}
                  isActive={key === activeKey}
                  unreadCount={unreadCount(key)}
                  onRemove={onRemove}
                />
              )
            })}
            {outgoing.map((user) => (
              <PersonRow
                key={user.id}
                user={user}
                description="Demande envoyée"
                actions={
                  <RelationActions
                    name={user.name}
                    relation="outgoing"
                    onAdd={() => onAdd(user.id)}
                    onRemove={() => onRemove(user.id)}
                  />
                }
              />
            ))}
          </SectionList>
        )}
        </Swap>
        </AutoHeight>
      </Section>
    </>
  )
}
