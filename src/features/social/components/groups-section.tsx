"use client"

import { useState } from "react"
import { InformationCircleIcon, UserGroupIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@/components/ui/button"
import { ROUTES } from "@/features/auth/lib/routes"
import { conversationKey, type GroupSummary, type PublicUser } from "../types"
import { CreateGroupDialog, type DialogState } from "./create-group-dialog"
import { GroupAvatar } from "./group-avatar"
import { GroupInfoDialog } from "./group-info-dialog"
import { ListRow, REVEAL_ON_HOVER } from "./list-row"
import { JoinCallLink, OngoingCallLabel } from "./ongoing-call"
import { Section, SectionEmpty, SectionList } from "./section"

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
  /** Messages non lus reçus d'une conversation (voir `conversationKey`). */
  unreadCount: (key: string) => number
  /** Conversation ouverte à l'écran (voir `conversationKey`). */
  activeKey: string | null
  createGroupDialog: DialogState
}

export function GroupsSection({
  currentUserId,
  groups,
  friends,
  onCreate,
  unreadCount,
  activeKey,
  createGroupDialog,
}: GroupsSectionProps) {
  /** Groupe de la fiche, gardé à la fermeture pour qu'elle s'efface en douceur. */
  const [infoGroupId, setInfoGroupId] = useState<string | null>(null)
  const [isInfoOpen, setIsInfoOpen] = useState(false)

  return (
    <>
    <Section
      title="Groupes"
      icon={UserGroupIcon}
      count={groups.length}
      action={<CreateGroupDialog {...createGroupDialog} friends={friends} onCreate={onCreate} />}
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
                leading={<GroupAvatar group={group} />}
                description={group.call ? <OngoingCallLabel call={group.call} /> : membersLabel(others)}
                unreadCount={unreadCount(key)}
                actions={
                  <>
                    {canJoinCall && (
                      <JoinCallLink href={ROUTES.group(group.id)} label={`Rejoindre l'appel du groupe ${group.name}`} />
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Infos du groupe ${group.name}`}
                      onClick={() => {
                        setInfoGroupId(group.id)
                        setIsInfoOpen(true)
                      }}
                      className={`size-10 text-muted-foreground sm:size-8 ${REVEAL_ON_HOVER}`}
                    >
                      <HugeiconsIcon icon={InformationCircleIcon} size={18} strokeWidth={2} />
                    </Button>
                  </>
                }
              />
            )
          })}
        </SectionList>
      )}
    </Section>
    {infoGroupId && (
      <GroupInfoDialog
        groupId={infoGroupId}
        currentUserId={currentUserId}
        open={isInfoOpen}
        onOpenChange={setIsInfoOpen}
      />
    )}
    </>
  )
}
