"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft01Icon, Cancel01Icon, UserAdd01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Effect } from "@animate-ui/react/primitives/effects/effect"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { Reveal } from "@/components/motion/reveal"
import { Button, buttonVariants } from "@/components/ui/button"
import type { SessionUser } from "@/features/auth/components/session-gate"
import { ROUTES } from "@/features/auth/lib/routes"
import { useDebouncedValue } from "@/features/social/hooks/use-debounced-value"
import { PAGE_ENTRANCE } from "@/lib/motion"
import { useAdminStats, useAdminUsers } from "../hooks/use-admin-data"
import { AdminActionError, adminApi } from "../lib/api"
import type { AdminUser, AdminUserFilter, AdminUserSort } from "../types"
import { AdminNotice, useAdminNotice } from "./admin-notice"
import { AdminPasswordDialog } from "./admin-password-dialog"
import { BanUserDialog } from "./ban-user-dialog"
import type { UserAction } from "./user-actions-menu"
import { UserFormDialog } from "./user-form-dialog"
import { UserSessionsDialog } from "./user-sessions-dialog"
import { UsersList, UsersListSkeleton } from "./users-list"
import { Pagination, StatsFilters, UsersToolbar } from "./users-toolbar"

const SEARCH_DEBOUNCE_MS = 300

/** Fenêtre ouverte : la création d'un compte, ou une action sur l'un d'eux. */
type OpenDialog = { action: "create" } | { action: UserAction; user: AdminUser }

/**
 * Administration des comptes : chiffres clés (qui filtrent), recherche, tri,
 * liste paginée, et toutes les actions du plugin Admin de Better Auth.
 */
export function AdminScreen({ currentUser }: { currentUser: SessionUser }) {
  const [searchInput, setSearchInput] = useState("")
  const search = useDebouncedValue(searchInput.trim(), SEARCH_DEBOUNCE_MS)
  const [filter, setFilter] = useState<AdminUserFilter>("all")
  const [sort, setSort] = useState<AdminUserSort>("newest")
  const [page, setPage] = useState(1)
  // Nouvelle recherche, nouveau filtre ou nouveau tri : retour à la première page.
  const [queryKey, setQueryKey] = useState(`${search}|${filter}|${sort}`)
  if (queryKey !== `${search}|${filter}|${sort}`) {
    setQueryKey(`${search}|${filter}|${sort}`)
    setPage(1)
  }

  const users = useAdminUsers({ search, filter, sort, page })
  const { stats, reload: reloadStats } = useAdminStats()
  const { notice, show } = useAdminNotice()
  const [actionError, setActionError] = useState<string | null>(null)

  // Fenêtre gardée à la fermeture, pour qu'elle s'efface en douceur.
  const [dialog, setDialog] = useState<OpenDialog | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  function open(next: OpenDialog) {
    setActionError(null)
    setDialog(next)
    setIsDialogOpen(true)
  }

  function refresh(message: string) {
    users.reload()
    reloadStats()
    show(message)
  }

  /** Action confirmée hors formulaire : son échec s'affiche au-dessus de la liste. */
  async function run(action: () => Promise<unknown>, message: string) {
    setActionError(null)
    try {
      await action()
      refresh(message)
    } catch (error) {
      setActionError(error instanceof AdminActionError ? error.message : "L'action a échoué.")
    }
  }

  async function impersonate(user: AdminUser) {
    setActionError(null)
    try {
      await adminApi.impersonate(user.id)
      // Rechargement complet : connexions temps réel et données repartent de zéro.
      window.location.assign(ROUTES.home)
    } catch (error) {
      setActionError(error instanceof AdminActionError ? error.message : "L'action a échoué.")
    }
  }

  const isSearching = searchInput.trim() !== search || (users.isLoading && users.page !== null)

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col gap-6 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-6 md:pt-8">
      <header className="flex items-center gap-2">
        <Link
          href={ROUTES.home}
          aria-label="Retour à l'application"
          className={buttonVariants({ variant: "ghost", size: "icon", className: "-ml-2 size-10 shrink-0" })}
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={20} strokeWidth={2} />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold tracking-tight">Administration</h1>
          <p className="truncate text-sm text-muted-foreground">Comptes, rôles, suspensions et sessions</p>
        </div>
        <Button onClick={() => open({ action: "create" })} className="h-10 shrink-0 gap-2 rounded-full px-4">
          <HugeiconsIcon icon={UserAdd01Icon} size={18} strokeWidth={2} aria-hidden />
          <span className="max-sm:sr-only">Ajouter</span>
        </Button>
      </header>

      <Effect {...PAGE_ENTRANCE} className="flex flex-col gap-4">
        <StatsFilters stats={stats} filter={filter} onFilterChange={setFilter} />
        <UsersToolbar
          search={searchInput}
          onSearchChange={setSearchInput}
          isSearching={isSearching}
          sort={sort}
          onSortChange={setSort}
        />

        <Reveal show={actionError !== null} gap={16}>
          <div role="alert" className="flex items-center gap-3 rounded-2xl bg-destructive/10 py-2 pr-2 pl-4 text-sm text-destructive">
            <p className="flex-1">{actionError}</p>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Fermer"
              onClick={() => setActionError(null)}
              className="size-8 text-destructive hover:text-destructive"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={2} />
            </Button>
          </div>
        </Reveal>

        {users.page ? (
          <>
            <UsersList
              users={users.page.users}
              currentUserId={currentUser.id}
              isRefreshing={users.isLoading}
              onAction={(action, user) => open({ action, user })}
            />
            <Pagination
              page={users.page.page}
              pageSize={users.page.pageSize}
              total={users.page.total}
              onPageChange={setPage}
            />
          </>
        ) : users.error ? (
          <div role="alert" className="flex flex-col items-center gap-3 rounded-3xl border border-dashed px-6 py-10 text-center">
            <p className="text-sm text-muted-foreground">{users.error}</p>
            <Button variant="outline" onClick={users.reload}>
              Réessayer
            </Button>
          </div>
        ) : (
          <UsersListSkeleton />
        )}
      </Effect>

      {dialog && (
        <ActionDialog
          dialog={dialog}
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          run={run}
          onImpersonate={impersonate}
          onDone={refresh}
        />
      )}
      <AdminNotice notice={notice} />
    </main>
  )
}

interface ActionDialogProps {
  dialog: OpenDialog
  open: boolean
  onOpenChange: (open: boolean) => void
  run: (action: () => Promise<unknown>, message: string) => Promise<void>
  onImpersonate: (user: AdminUser) => Promise<void>
  /** Action réussie dans un formulaire : liste et chiffres rechargés, confirmation affichée. */
  onDone: (message: string) => void
}

/** La fenêtre de l'action choisie : formulaire, ou simple confirmation. */
function ActionDialog({ dialog, open, onOpenChange, run, onImpersonate, onDone }: ActionDialogProps) {
  const dialogProps = { open, onOpenChange }

  if (dialog.action === "create") {
    return (
      <UserFormDialog
        {...dialogProps}
        onSubmit={async (values) => {
          await adminApi.createUser(values)
          onDone(`Compte de ${values.name} créé`)
        }}
      />
    )
  }

  const { user } = dialog
  switch (dialog.action) {
    case "edit":
      return (
        <UserFormDialog
          {...dialogProps}
          user={user}
          onSubmit={async ({ name, email }) => {
            await adminApi.updateUser(user.id, { name, email })
            onDone("Modifications enregistrées")
          }}
        />
      )
    case "ban":
      return (
        <BanUserDialog
          {...dialogProps}
          user={user}
          onBan={async (reason, seconds) => {
            await adminApi.banUser(user.id, reason, seconds)
            onDone(`${user.name} est suspendu`)
          }}
        />
      )
    case "sessions":
      return <UserSessionsDialog {...dialogProps} user={user} onRevoked={onDone} />
    case "role":
      // Nommer administrateur exige un mot de passe ; retirer les droits le supprime.
      return user.role === "admin" ? (
        <ConfirmDialog
          {...dialogProps}
          title={`Retirer ses droits à ${user.name} ?`}
          description="Il n'aura plus accès à l'administration, et son mot de passe sera supprimé : il se connectera avec son adresse seule, comme tout utilisateur."
          confirmLabel="Retirer les droits"
          onConfirm={() =>
            void run(() => adminApi.demoteToUser(user.id), `${user.name} n'est plus administrateur`)
          }
        />
      ) : (
        <AdminPasswordDialog
          {...dialogProps}
          mode="promote"
          user={user}
          onSubmit={async (password) => {
            await adminApi.promoteToAdmin(user.id, password)
            onDone(`${user.name} est administrateur`)
          }}
        />
      )
    case "password":
      return (
        <AdminPasswordDialog
          {...dialogProps}
          mode="reset"
          user={user}
          onSubmit={async (password) => {
            await adminApi.setPassword(user.id, password)
            onDone(`Nouveau mot de passe enregistré pour ${user.name}`)
          }}
        />
      )
    case "unban":
      return (
        <ConfirmDialog
          {...dialogProps}
          tone="default"
          title={`Lever la suspension de ${user.name} ?`}
          description="Il pourra de nouveau se connecter avec son adresse."
          confirmLabel="Lever la suspension"
          onConfirm={() => void run(() => adminApi.unbanUser(user.id), `${user.name} peut de nouveau se connecter`)}
        />
      )
    case "impersonate":
      return (
        <ConfirmDialog
          {...dialogProps}
          tone="default"
          title={`Se connecter en tant que ${user.name} ?`}
          description="Vous verrez l'application exactement comme lui, conversations comprises, pendant 30 minutes au plus. Un bandeau vous permet de revenir à votre compte à tout moment. À réserver à l'assistance."
          confirmLabel="Se connecter en tant que lui"
          onConfirm={() => void onImpersonate(user)}
        />
      )
    case "delete":
      return (
        <ConfirmDialog
          {...dialogProps}
          title={`Supprimer le compte de ${user.name} ?`}
          description="C'est définitif : son compte, ses amitiés et sa place dans ses groupes disparaissent, et ses sessions se ferment."
          confirmLabel="Supprimer définitivement"
          onConfirm={() => void run(() => adminApi.removeUser(user.id), `Compte de ${user.name} supprimé`)}
        />
      )
  }
}
