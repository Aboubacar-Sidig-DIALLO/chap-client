"use client"

import { useId, useState } from "react"
import {
  ArrowRight01Icon,
  SlidersHorizontalIcon,
  UserRemove01Icon,
  UserShield01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { Swap } from "@/components/motion/swap"
import { Switch } from "@/components/ui/switch"
import { UserAvatar } from "@/features/chat/components/user-avatar"
import { cn } from "@/lib/utils"
import { GROUP_ACTIONS } from "../../lib/group-rights"
import type { GroupAction, GroupMember, GroupPermissions, GroupSummary } from "../../types"
import { toAvatarUser, ViewHeader, type RunAction } from "./shared"

/** Résumé des autorisations du groupe, en une ligne. */
function describePermissions(permissions: GroupPermissions) {
  const restricted = GROUP_ACTIONS.filter(({ action }) => !permissions[action])
  if (restricted.length === 0) return "Tout le monde peut écrire, envoyer des vocaux et appeler"
  if (restricted.length === GROUP_ACTIONS.length) return "Seuls les administrateurs peuvent participer"
  return `Réservé aux administrateurs : ${restricted.map(({ label }) => label.toLowerCase()).join(", ")}`
}

/** Propriétaire : accès aux autorisations de tous les membres, avec leur résumé. */
export function PermissionsRow({ group, onClick }: { group: GroupSummary; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="-mx-2 flex min-h-14 items-center gap-3 rounded-2xl px-2 text-left transition-colors outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-foreground/70">
        <HugeiconsIcon icon={SlidersHorizontalIcon} size={16} strokeWidth={2} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-medium">Autorisations des membres</span>
        <span className="truncate text-sm text-muted-foreground">{describePermissions(group.permissions)}</span>
      </span>
      <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={2} aria-hidden className="shrink-0 text-muted-foreground" />
    </button>
  )
}

interface GroupPermissionsViewProps {
  group: GroupSummary
  run: RunAction
  error: React.ReactNode
  onSave: (permissions: GroupPermissions) => Promise<void>
  onBack: () => void
}

/** Ce que tous les simples membres peuvent faire, d'un geste. */
export function GroupPermissionsView({ group, run, error, onSave, onBack }: GroupPermissionsViewProps) {
  return (
    <>
      <ViewHeader title="Autorisations" description="Pour tous les membres du groupe" onBack={onBack} />
      <PermissionSwitches
        values={group.permissions}
        run={run}
        onSave={onSave}
        hint={(action) => (group.permissions[action] ? "Tous les membres" : "Administrateurs seulement")}
      />
      {error}
      <p className="px-1 text-sm text-muted-foreground">
        Vous et les administrateurs gardez toujours tous les droits. Pour une seule personne, touchez son nom
        dans la liste des membres.
      </p>
    </>
  )
}

interface MemberSettingsViewProps {
  group: GroupSummary
  member: GroupMember
  run: RunAction
  error: React.ReactNode
  onRoleChange: (role: "admin" | "member") => Promise<void>
  onPermissionsChange: (permissions: GroupPermissions) => Promise<void>
  onRemove: () => Promise<void>
  onBack: () => void
}

/** Propriétaire : le rôle d'un membre, ses autorisations, son retrait du groupe. */
export function MemberSettingsView({
  group,
  member,
  run,
  error,
  onRoleChange,
  onPermissionsChange,
  onRemove,
  onBack,
}: MemberSettingsViewProps) {
  const [isSavingRole, setIsSavingRole] = useState(false)
  const isAdmin = member.role === "admin"

  async function toggleAdmin(next: boolean) {
    setIsSavingRole(true)
    await run(() => onRoleChange(next ? "admin" : "member"))
    setIsSavingRole(false)
  }

  return (
    <>
      <ViewHeader title={member.name} description={`Membre de « ${group.name} »`} onBack={onBack} />
      <div className="flex justify-center">
        <UserAvatar user={toAvatarUser(member)} className="size-20 text-2xl" />
      </div>

      <section aria-label="Rôle" className="flex flex-col gap-1.5">
        <SettingRow
          icon={UserShield01Icon}
          label="Administrateur"
          hint="Ajoute des membres et supprime des messages"
          checked={isAdmin}
          disabled={isSavingRole}
          onCheckedChange={(next) => void toggleAdmin(next)}
          tone="voice"
        />
      </section>

      <section aria-labelledby="member-permissions" className="flex flex-col gap-1.5">
        <h3 id="member-permissions" className="px-1 text-sm font-medium">
          Autorisations
        </h3>
        {/* Nommé ou destitué : les autorisations et leur explication se fondent l'une dans l'autre. */}
        <Swap swapKey={isAdmin ? "admin" : "member"}>
        {isAdmin ? (
          <p className="rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">
            Un administrateur n&apos;est jamais restreint.
          </p>
        ) : (
          <PermissionSwitches
            values={member.permissions}
            run={run}
            onSave={onPermissionsChange}
            // Réservée aux administrateurs pour tout le groupe : rien à régler pour lui seul.
            lockedHint={(action) => (group.permissions[action] ? null : "Réservé aux administrateurs pour tout le groupe")}
          />
        )}
        </Swap>
      </section>
      {error}

      <ConfirmDialog
        trigger={
          <>
            <HugeiconsIcon icon={UserRemove01Icon} size={18} strokeWidth={2} aria-hidden />
            <span className="truncate">Retirer {member.name} du groupe</span>
          </>
        }
        triggerLabel={`Retirer ${member.name} du groupe`}
        triggerClassName="h-11 w-full sm:h-11 sm:w-full justify-center gap-2 rounded-2xl px-4 text-destructive hover:bg-destructive/10 hover:text-destructive"
        title={`Retirer ${member.name} ?`}
        description={`${member.name} ne fera plus partie de « ${group.name} » et n'aura plus accès à ses messages.`}
        confirmLabel="Retirer"
        onConfirm={() => {
          void run(onRemove).then((isRemoved) => {
            if (isRemoved) onBack()
          })
        }}
      />
    </>
  )
}

interface PermissionSwitchesProps {
  values: GroupPermissions
  run: RunAction
  onSave: (permissions: GroupPermissions) => Promise<void>
  /** Précision sous chaque action (ex. qui peut la faire). */
  hint?: (action: GroupAction) => string | null
  /** Action réglée ailleurs (pour tout le groupe) : interrupteur bloqué, avec sa raison. */
  lockedHint?: (action: GroupAction) => string | null
}

/** Un interrupteur par action ; chaque bascule s'enregistre aussitôt. */
function PermissionSwitches({ values, run, onSave, hint, lockedHint }: PermissionSwitchesProps) {
  const [savingAction, setSavingAction] = useState<GroupAction | null>(null)

  async function toggle(action: GroupAction, next: boolean) {
    setSavingAction(action)
    await run(() => onSave({ ...values, [action]: next }))
    setSavingAction(null)
  }

  return (
    <ul className="flex flex-col gap-1.5">
      {GROUP_ACTIONS.map(({ action, label, icon }) => {
        const locked = lockedHint?.(action) ?? null
        return (
          <li key={action}>
            <SettingRow
              icon={icon}
              label={label}
              hint={locked ?? hint?.(action) ?? null}
              checked={locked ? false : values[action]}
              disabled={locked !== null || savingAction !== null}
              onCheckedChange={(next) => void toggle(action, next)}
            />
          </li>
        )
      })}
    </ul>
  )
}

interface SettingRowProps {
  icon: IconSvgElement
  label: string
  hint: string | null
  checked: boolean
  disabled: boolean
  onCheckedChange: (checked: boolean) => void
  tone?: "default" | "voice"
}

/** Une ligne de réglage : toute la ligne bascule l'interrupteur (cible tactile large). */
function SettingRow({ icon, label, hint, checked, disabled, onCheckedChange, tone = "default" }: SettingRowProps) {
  const labelId = useId()
  const hintId = useId()

  return (
    <label
      className={cn(
        "flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border bg-card px-3 py-2.5 transition-colors hover:bg-muted/50",
        disabled && "cursor-not-allowed"
      )}
    >
      <span
        aria-hidden
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-full",
          tone === "voice" ? "bg-voice/12 text-voice" : "bg-muted text-foreground/70"
        )}
      >
        <HugeiconsIcon icon={icon} size={16} strokeWidth={2} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span id={labelId} className="font-medium">
          {label}
        </span>
        {hint && (
          <span id={hintId} className="text-sm text-muted-foreground">
            {hint}
          </span>
        )}
      </span>
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
        aria-labelledby={labelId}
        aria-describedby={hint ? hintId : undefined}
      />
    </label>
  )
}

