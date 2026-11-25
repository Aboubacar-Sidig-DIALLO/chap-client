"use client"

import Link from "next/link"
import { Logout01Icon, UserGroupIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { ROUTES } from "@/features/auth/lib/routes"
import { UserAvatar } from "@/features/chat/components/user-avatar"
import { conversationKey, type GroupSummary, type PublicUser } from "../types"
import { CreateGroupDialog } from "./create-group-dialog"
import { JoinCallLink, OngoingCallLabel } from "./ongoing-call"
import { Section, SectionEmpty, SectionList } from "./section"
import { UnreadBadge } from "./unread-badge"

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
}

export function GroupsSection({ currentUserId, groups, friends, onCreate, onLeave, unreadCount }: GroupsSectionProps) {
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
            return (
              <li key={group.id} className="flex min-h-16 items-center gap-1 pr-2">
                {/* Toucher le groupe ouvre sa conversation. */}
                <Link
                  href={ROUTES.group(group.id)}
                  className="flex min-w-0 flex-1 items-center gap-3 self-stretch py-2 pl-4 outline-none transition-colors hover:bg-muted/50 focus-visible:bg-muted"
                >
                  {/* Avatars superposés des premiers membres. */}
                  <div aria-hidden className="flex shrink-0 -space-x-3">
                    {(others.length > 0 ? others : group.members).slice(0, MAX_VISIBLE_AVATARS).map((member) => (
                      <UserAvatar
                        key={member.id}
                        user={{ id: member.id, name: member.name, avatarUrl: member.image ?? undefined }}
                        className="ring-2 ring-card"
                      />
                    ))}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{group.name}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {group.call ? <OngoingCallLabel call={group.call} /> : membersLabel(others)}
                    </p>
                  </div>
                  <UnreadBadge count={unreadCount(conversationKey({ type: "group", groupId: group.id }))} />
                </Link>
                {canJoinCall && (
                  <JoinCallLink href={ROUTES.group(group.id)} label={`Rejoindre l'appel du groupe ${group.name}`} />
                )}
                <ConfirmDialog
                  trigger={<HugeiconsIcon icon={Logout01Icon} size={18} strokeWidth={2} />}
                  triggerLabel={`Quitter le groupe ${group.name}`}
                  title={`Quitter « ${group.name} » ?`}
                  description="Les autres membres resteront dans le groupe ; vous n'en ferez plus partie."
                  confirmLabel="Quitter"
                  onConfirm={() => void onLeave(group.id)}
                />
              </li>
            )
          })}
        </SectionList>
      )}
    </Section>
  )
}
