"use client"

import { UserAdd01Icon, UserRemove01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { Button } from "@/components/ui/button"
import { ROUTES } from "@/features/auth/lib/routes"
import { useNow } from "../hooks/use-now"
import { byPresenceThenName, formatPresence } from "../lib/presence"
import { conversationKey, type FriendsOverview } from "../types"
import { InviteButton } from "./invite-button"
import { JoinCallLink, OngoingCallLabel } from "./ongoing-call"
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
}

/** Demandes reçues en tête (elles attendent une réponse), puis les amis et les demandes envoyées. */
export function FriendsSection({ currentUserId, overview, onAdd, onRemove, onFindFriends, unreadCount }: FriendsSectionProps) {
  const { incoming, outgoing } = overview
  // Amis en ligne en tête ; « depuis 5 min » se met à jour tout seul.
  const friends = [...overview.friends].sort(byPresenceThenName)
  const now = useNow()

  return (
    <>
      {incoming.length > 0 && (
        <Section title="Demandes reçues" count={incoming.length}>
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
      )}

      <Section title="Amis" count={friends.length}>
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
            {friends.map((user) => (
              <PersonRow
                key={user.id}
                user={user}
                href={ROUTES.friend(user.id)}
                presence={user.presence}
                description={
                  user.call ? (
                    <OngoingCallLabel call={user.call} />
                  ) : (
                    <span className={user.presence.online ? "text-emerald-600 dark:text-emerald-400" : undefined}>
                      {formatPresence(user.presence, now)}
                    </span>
                  )
                }
                unreadCount={unreadCount(conversationKey({ type: "direct", userId: user.id }))}
                actions={
                  <>
                    {user.call && !user.call.participants.some((participant) => participant.id === currentUserId) && (
                      <JoinCallLink href={ROUTES.friend(user.id)} label={`Rejoindre l'appel de ${user.name}`} />
                    )}
                    <ConfirmDialog
                      trigger={<HugeiconsIcon icon={UserRemove01Icon} size={18} strokeWidth={2} />}
                      triggerLabel={`Retirer ${user.name} de vos amis`}
                      title={`Retirer ${user.name} de vos amis ?`}
                      description="Vous pourrez lui renvoyer une demande plus tard."
                      confirmLabel="Retirer"
                      onConfirm={() => void onRemove(user.id)}
                    />
                  </>
                }
              />
            ))}
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
      </Section>
    </>
  )
}
