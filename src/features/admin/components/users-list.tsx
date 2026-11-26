"use client"

import { UserSearch01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { UserAvatar } from "@/features/chat/components/user-avatar"
import { cn } from "@/lib/utils"
import { formatDate } from "../lib/format"
import type { AdminUser } from "../types"
import { type UserAction, UserActionsMenu } from "./user-actions-menu"
import { RoleBadge, StatusBadge } from "./user-badges"

interface UsersListProps {
  users: AdminUser[]
  currentUserId: string
  /** Rechargement en cours : la liste reste affichée, estompée. */
  isRefreshing: boolean
  onAction: (action: UserAction, user: AdminUser) => void
}

/**
 * Les comptes : un tableau sur grand écran (on compare d'un coup d'œil),
 * des cartes sur mobile (lisibles au doigt).
 */
export function UsersList({ users, currentUserId, isRefreshing, onAction }: UsersListProps) {
  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed px-6 py-12 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
          <HugeiconsIcon icon={UserSearch01Icon} size={22} strokeWidth={2} />
        </span>
        <div className="space-y-1">
          <p className="font-medium">Aucun compte trouvé</p>
          <p className="text-sm text-muted-foreground">Essayez une autre recherche ou un autre filtre.</p>
        </div>
      </div>
    )
  }

  const rowProps = (user: AdminUser) => ({ user, isSelf: user.id === currentUserId, onAction })

  return (
    <div aria-busy={isRefreshing} className={cn("transition-opacity", isRefreshing && "opacity-60")}>
      {/* Grand écran : tableau. */}
      <div className="hidden overflow-hidden rounded-2xl border bg-card md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-2.5 font-medium">
                Utilisateur
              </th>
              <th scope="col" className="px-4 py-2.5 font-medium">
                Rôle
              </th>
              <th scope="col" className="px-4 py-2.5 font-medium">
                Statut
              </th>
              <th scope="col" className="px-4 py-2.5 font-medium">
                Inscription
              </th>
              <th scope="col" className="w-12 px-2 py-2.5">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((user) => (
              <UserTableRow key={user.id} {...rowProps(user)} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile : cartes. */}
      <ul className="divide-y overflow-hidden rounded-3xl border bg-card md:hidden">
        {users.map((user) => (
          <UserCard key={user.id} {...rowProps(user)} />
        ))}
      </ul>
    </div>
  )
}

interface UserRowProps {
  user: AdminUser
  isSelf: boolean
  onAction: (action: UserAction, user: AdminUser) => void
}

function UserIdentity({ user, isSelf }: Pick<UserRowProps, "user" | "isSelf">) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <UserAvatar
        user={{ id: user.id, name: user.name, avatarUrl: user.image ?? undefined }}
        className={cn(user.banned && "opacity-50 grayscale")}
      />
      <div className="min-w-0">
        <p className="truncate font-medium">
          {user.name}
          {isSelf && <span className="font-normal text-muted-foreground"> (vous)</span>}
        </p>
        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
      </div>
    </div>
  )
}

function UserTableRow({ user, isSelf, onAction }: UserRowProps) {
  return (
    <tr className="transition-colors hover:bg-muted/30">
      <td className="max-w-72 px-4 py-2.5">
        <UserIdentity user={user} isSelf={isSelf} />
      </td>
      <td className="px-4 py-2.5">
        <RoleBadge role={user.role} />
      </td>
      <td className="px-4 py-2.5">
        <StatusBadge user={user} />
      </td>
      <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">{formatDate(user.createdAt)}</td>
      <td className="px-2 py-2.5 text-right">
        <UserActionsMenu user={user} isSelf={isSelf} onAction={onAction} />
      </td>
    </tr>
  )
}

function UserCard({ user, isSelf, onAction }: UserRowProps) {
  return (
    <li className="flex items-start gap-2 py-3 pr-2 pl-4">
      <div className="min-w-0 flex-1 space-y-2">
        <UserIdentity user={user} isSelf={isSelf} />
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-11">
          {user.role === "admin" && <RoleBadge role={user.role} />}
          <StatusBadge user={user} />
        </div>
      </div>
      <UserActionsMenu user={user} isSelf={isSelf} onAction={onAction} />
    </li>
  )
}

/** Silhouette de la liste au premier chargement. */
export function UsersListSkeleton() {
  return (
    <div aria-busy aria-label="Chargement des comptes" className="divide-y overflow-hidden rounded-2xl border bg-card">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="flex items-center gap-3 px-4 py-3">
          <div className="size-8 animate-pulse rounded-full bg-muted" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 w-36 animate-pulse rounded-full bg-muted" />
            <div className="h-3 w-52 animate-pulse rounded-full bg-muted" />
          </div>
        </div>
      ))}
    </div>
  )
}
