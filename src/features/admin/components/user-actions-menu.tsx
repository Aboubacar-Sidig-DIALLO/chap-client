"use client"

import {
  ComputerPhoneSyncIcon,
  Delete02Icon,
  Login03Icon,
  MoreHorizontalIcon,
  ResetPasswordIcon,
  UserBlock01Icon,
  UserEdit01Icon,
  UserIcon,
  UserShield01Icon,
  UserUnlock01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { buttonVariants } from "@/components/ui/button"
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/ui/menu"
import type { AdminUser } from "../types"

/** Ce qu'un administrateur peut faire sur un compte. */
export type UserAction = "edit" | "role" | "password" | "sessions" | "impersonate" | "ban" | "unban" | "delete"

interface UserActionsMenuProps {
  user: AdminUser
  /** Le compte de l'administrateur lui-même : ni rôle, ni suspension, ni suppression. */
  isSelf: boolean
  onAction: (action: UserAction, user: AdminUser) => void
}

/**
 * Actions d'un compte, du plus courant au plus grave. Ce que le serveur
 * refuserait (agir sur soi-même, se connecter en tant qu'un administrateur)
 * n'est pas proposé.
 */
export function UserActionsMenu({ user, isSelf, onAction }: UserActionsMenuProps) {
  const act = (action: UserAction) => () => onAction(action, user)
  const isAdmin = user.role === "admin"

  return (
    <Menu>
      <MenuTrigger
        aria-label={`Actions pour ${user.name}`}
        className={buttonVariants({
          variant: "ghost",
          size: "icon",
          className: "size-9 text-muted-foreground data-popup-open:bg-muted",
        })}
      >
        <HugeiconsIcon icon={MoreHorizontalIcon} size={18} strokeWidth={2} />
      </MenuTrigger>
      <MenuContent>
        <MenuItem onClick={act("edit")}>
          <HugeiconsIcon icon={UserEdit01Icon} strokeWidth={2} />
          Modifier le nom ou l&apos;adresse
        </MenuItem>
        <MenuItem onClick={act("sessions")}>
          <HugeiconsIcon icon={ComputerPhoneSyncIcon} strokeWidth={2} />
          Voir les sessions
        </MenuItem>
        {!isSelf && (
          <>
            <MenuItem onClick={act("role")}>
              <HugeiconsIcon icon={isAdmin ? UserIcon : UserShield01Icon} strokeWidth={2} />
              {isAdmin ? "Retirer les droits d'administration" : "Nommer administrateur…"}
            </MenuItem>
            {/* Son propre mot de passe se change dans le profil. */}
            {isAdmin && (
              <MenuItem onClick={act("password")}>
                <HugeiconsIcon icon={ResetPasswordIcon} strokeWidth={2} />
                Définir un nouveau mot de passe…
              </MenuItem>
            )}
            {!isAdmin && !user.banned && (
              <MenuItem onClick={act("impersonate")}>
                <HugeiconsIcon icon={Login03Icon} strokeWidth={2} />
                Se connecter en tant que…
              </MenuItem>
            )}
            <MenuSeparator />
            {user.banned ? (
              <MenuItem onClick={act("unban")}>
                <HugeiconsIcon icon={UserUnlock01Icon} strokeWidth={2} />
                Lever la suspension
              </MenuItem>
            ) : (
              <MenuItem tone="destructive" onClick={act("ban")}>
                <HugeiconsIcon icon={UserBlock01Icon} strokeWidth={2} />
                Suspendre…
              </MenuItem>
            )}
            <MenuItem tone="destructive" onClick={act("delete")}>
              <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
              Supprimer le compte…
            </MenuItem>
          </>
        )}
      </MenuContent>
    </Menu>
  )
}
