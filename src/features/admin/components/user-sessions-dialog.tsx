"use client"

import { useEffect, useState } from "react"
import { ComputerPhoneSyncIcon, Delete02Icon, UserSwitchIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { AdminActionError, adminApi } from "../lib/api"
import { describeDevice, formatDateTime } from "../lib/format"
import type { AdminSession, AdminUser } from "../types"
import { AdminSheet, FormError } from "./admin-sheet"

interface UserSessionsDialogProps {
  user: AdminUser
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Une ou plusieurs sessions ont été fermées. */
  onRevoked: (message: string) => void
}

/** Sessions ouvertes d'un compte (appareils), à fermer une à une ou toutes. */
export function UserSessionsDialog({ user, open, onOpenChange, onRevoked }: UserSessionsDialogProps) {
  return (
    <AdminSheet
      open={open}
      onOpenChange={onOpenChange}
      title={`Sessions de ${user.name}`}
      description="Chaque session est un appareil ou un navigateur connecté. La fermer déconnecte la personne de cet appareil."
    >
      <SessionList user={user} onRevoked={onRevoked} />
    </AdminSheet>
  )
}

function SessionList({ user, onRevoked }: Pick<UserSessionsDialogProps, "user" | "onRevoked">) {
  const [sessions, setSessions] = useState<AdminSession[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pendingToken, setPendingToken] = useState<string | null>(null)

  useEffect(() => {
    let isCurrent = true
    adminApi
      .listSessions(user.id)
      .then((result) => {
        if (isCurrent) setSessions(sortByActivity(result))
      })
      .catch((loadError: unknown) => {
        if (isCurrent) setError(messageOf(loadError))
      })
    return () => {
      isCurrent = false
    }
  }, [user.id])

  async function revoke(session: AdminSession) {
    setPendingToken(session.token)
    setError(null)
    try {
      await adminApi.revokeSession(session.token)
      setSessions((current) => current?.filter((item) => item.id !== session.id) ?? null)
      onRevoked("Session fermée")
    } catch (revokeError) {
      setError(messageOf(revokeError))
    }
    setPendingToken(null)
  }

  async function revokeAll() {
    setError(null)
    try {
      await adminApi.revokeAllSessions(user.id)
      setSessions([])
      onRevoked(`${user.name} est déconnecté de tous ses appareils`)
    } catch (revokeError) {
      setError(messageOf(revokeError))
    }
  }

  if (!sessions) {
    return error ? (
      <FormError message={error} />
    ) : (
      <p role="status" className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
        <Spinner size={16} /> Chargement des sessions…
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {sessions.length === 0 ? (
        <p className="rounded-2xl bg-muted px-4 py-6 text-center text-sm text-muted-foreground">
          Aucune session ouverte : {user.name} n&apos;est connecté sur aucun appareil.
        </p>
      ) : (
        <ul className="divide-y overflow-hidden rounded-2xl border">
          {sessions.map((session) => (
            <li key={session.id} className="flex items-center gap-3 px-3 py-2.5">
              <span
                aria-hidden
                className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground"
              >
                <HugeiconsIcon
                  icon={session.impersonatedBy ? UserSwitchIcon : ComputerPhoneSyncIcon}
                  size={18}
                  strokeWidth={1.8}
                />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {describeDevice(session.userAgent)}
                  {session.impersonatedBy && (
                    <span className="font-normal text-muted-foreground"> · par un administrateur</span>
                  )}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  Active le {formatDateTime(session.updatedAt)}
                  {session.ipAddress && ` · ${session.ipAddress}`}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Fermer la session ${describeDevice(session.userAgent)}`}
                disabled={pendingToken !== null}
                onClick={() => void revoke(session)}
                className="size-9 text-muted-foreground hover:text-destructive"
              >
                {pendingToken === session.token ? (
                  <Spinner size={14} />
                ) : (
                  <HugeiconsIcon icon={Delete02Icon} size={18} strokeWidth={2} />
                )}
              </Button>
            </li>
          ))}
        </ul>
      )}

      <FormError message={error} />

      {sessions.length > 1 && (
        <RevokeAllButton name={user.name} count={sessions.length} onConfirm={() => void revokeAll()} />
      )}
    </div>
  )
}

function RevokeAllButton({ name, count, onConfirm }: { name: string; count: number; onConfirm: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="outline" size="lg" onClick={() => setOpen(true)} className="h-11 text-destructive hover:text-destructive">
        Fermer les {count} sessions
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Déconnecter ${name} partout ?`}
        description="Toutes ses sessions se ferment ; il pourra se reconnecter avec son adresse."
        confirmLabel="Tout fermer"
        onConfirm={onConfirm}
      />
    </>
  )
}

/** Session la plus récemment active d'abord. */
function sortByActivity(sessions: AdminSession[]) {
  return [...sessions].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
}

function messageOf(error: unknown) {
  return error instanceof AdminActionError ? error.message : "Impossible de joindre le serveur."
}
