"use client"

import { Logout01Icon, UserGroupIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { ROUTES } from "@/features/auth/lib/routes"
import { UserAvatar } from "@/features/chat/components/user-avatar"
import { conversationKey, type GroupSummary, type PublicUser } from "../types"
import { CreateGroupDialog } from "./create-group-dialog"
import { ListRow, REVEAL_ON_HOVER } from "./list-row"
import { JoinCallLink, OngoingCallLabel } from "./ongoing-call"
import { Section, SectionEmpty, SectionList } from "./section"

const MAX_VISIBLE_AVATARS = 3

/** « Vous et Léa », « Vous, Léa et Tom », « Vous, Léa, Tom et 3 autres ». */
function membersLabel(others: PublicUser[]) {
  const names = others.map((member) => member.name.split(" ")[0])
  if (names.length === 0) return "Vous seul·e"
  if (names.length === 1) return `Vous et ${names[0]}`
  if (names.length === 2) return `Vous, ${names[0]} et ${names[1]}`
  const rest = names.length - 2
  return `Vous, ${names[0]}, ${names[1]} et ${rest} autre${rest > 1 ? "s" : ""}`
}

interface GroupsSectionProps {
  currentUserId: string
  groups: GroupSummary[]
  friends: PublicUser[]
  onCreate: (input: { name: string; memberIds: string[] }) => Promise<unknown>
  onLeave: (groupId: string) => Promise<unknown>
  /** Messages non lus reçus d'une conversation (voir `conversationKey`). */
  unreadCount: (key: string) => number
  /** Conversation ouverte à l'écran (voir `conversationKey`). */
  activeKey: string | null
}

/** Avatars superposés des premiers membres. */
function GroupAvatars({ members }: { members: PublicUser[] }) {
  return (
    <div aria-hidden className="flex shrink-0 -space-x-3">
      {members.slice(0, MAX_VISIBLE_AVATARS).map((member) => (
        <UserAvatar
          key={member.id}
          user={{ id: member.id, name: member.name, avatarUrl: member.image ?? undefined }}
          className="ring-2 ring-card md:ring-sidebar"
        />
      ))}
    </div>
  )
}

export function GroupsSection({
  currentUserId,
  groups,
  friends,
  onCreate,
  onLeave,
  unreadCount,
  activeKey,
}: GroupsSectionProps) {
  return (
    <Section
      title="Groupes"
      count={groups.length}
      action={<CreateGroupDialog friends={friends} onCreate={onCreate} />}
    >
      {groups.length === 0 ? (
        <SectionEmpty
          icon={<HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} />}
          title="Aucun groupe"
          description="Réunissez vos amis dans un groupe : la famille, les collègues, l'équipe du dimanche…"
        />
      ) : (
        <SectionList>
          {groups.map((group) => {
            const others = group.members.filter((member) => member.id !== currentUserId)
            // Un appel en cours se voit (et se rejoint) d'ici, sans entrer dans le groupe.
            const canJoinCall = group.call && !group.call.participants.some((user) => user.id === currentUserId)
            const key = conversationKey({ type: "group", groupId: group.id })
            return (
              <ListRow
                key={group.id}
                href={ROUTES.group(group.id)}
                isActive={key === activeKey}
                title={group.name}
                leading={<GroupAvatars members={others.length > 0 ? others : group.members} />}
                description={group.call ? <OngoingCallLabel call={group.call} /> : membersLabel(others)}
                unreadCount={unreadCount(key)}
                actions={
                  <>
                    {canJoinCall && (
                      <JoinCallLink href={ROUTES.group(group.id)} label={`Rejoindre l'appel du groupe ${group.name}`} />
                    )}
                    <ConfirmDialog
                      trigger={<HugeiconsIcon icon={Logout01Icon} size={18} strokeWidth={2} />}
                      triggerLabel={`Quitter le groupe ${group.name}`}
                      triggerClassName={REVEAL_ON_HOVER}
                      title={`Quitter « ${group.name} » ?`}
                      description="Les autres membres resteront dans le groupe ; vous n'en ferez plus partie."
                      confirmLabel="Quitter"
                      onConfirm={() => void onLeave(group.id)}
                    />
                  </>
                }
              />
            )
          })}
        </SectionList>
      )}
    </Section>
  )
}
