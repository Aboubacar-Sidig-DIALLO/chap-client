"use client"

import {
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Cancel01Icon,
  Search01Icon,
  SortByDown01Icon,
  SortByUp01Icon,
  SortingAZ02Icon,
  UserBlock01Icon,
  UserMultipleIcon,
  UserShield01Icon,
  Wifi01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Menu,
  MenuContent,
  MenuGroupLabel,
  MenuRadioGroup,
  MenuRadioItem,
  MenuTrigger,
} from "@/components/ui/menu"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import type { AdminStats, AdminUserFilter, AdminUserSort } from "../types"

interface FilterCard {
  filter: AdminUserFilter
  label: string
  icon: IconSvgElement
  count: (stats: AdminStats) => number
  /** Teinte de l'icône. */
  tone: string
}

const FILTER_CARDS: FilterCard[] = [
  { filter: "all", label: "Utilisateurs", icon: UserMultipleIcon, count: (s) => s.users, tone: "bg-foreground/6 text-foreground/70" },
  { filter: "online", label: "En ligne", icon: Wifi01Icon, count: (s) => s.online, tone: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300" },
  { filter: "admins", label: "Administrateurs", icon: UserShield01Icon, count: (s) => s.admins, tone: "bg-voice/12 text-voice" },
  { filter: "banned", label: "Suspendus", icon: UserBlock01Icon, count: (s) => s.banned, tone: "bg-destructive/10 text-destructive" },
]

interface StatsFiltersProps {
  stats: AdminStats | null
  filter: AdminUserFilter
  onFilterChange: (filter: AdminUserFilter) => void
}

/**
 * Les chiffres clés, qui servent aussi de filtres : toucher « Suspendus »
 * affiche les comptes suspendus.
 */
export function StatsFilters({ stats, filter, onFilterChange }: StatsFiltersProps) {
  return (
    <div role="group" aria-label="Filtrer les comptes" className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
      {FILTER_CARDS.map((card) => {
        const isActive = filter === card.filter
        return (
          <button
            key={card.filter}
            type="button"
            aria-pressed={isActive}
            onClick={() => onFilterChange(card.filter)}
            className={cn(
              "press flex flex-col gap-3 rounded-2xl border bg-card p-3.5 text-left outline-none [--press-scale:0.98] focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:p-4",
              isActive ? "border-foreground shadow-sm" : "hover:border-foreground/20"
            )}
          >
            <span className="flex items-center justify-between gap-2">
              <span className="truncate text-sm text-muted-foreground">{card.label}</span>
              <span aria-hidden className={cn("grid size-7 shrink-0 place-items-center rounded-lg", card.tone)}>
                <HugeiconsIcon icon={card.icon} size={15} strokeWidth={2} />
              </span>
            </span>
            <span className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold tracking-tight tabular-nums">
                {stats ? card.count(stats) : "–"}
              </span>
              {card.filter === "all" && stats && stats.newThisWeek > 0 && (
                <span className="truncate text-xs font-medium text-emerald-700 dark:text-emerald-300">
                  +{stats.newThisWeek} cette semaine
                </span>
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/** Tris proposés, chacun avec son icône (lisible d'un coup d'œil dans le menu). */
const SORT_OPTIONS: Record<AdminUserSort, { label: string; icon: IconSvgElement }> = {
  newest: { label: "Plus récents", icon: SortByDown01Icon },
  oldest: { label: "Plus anciens", icon: SortByUp01Icon },
  name: { label: "Nom (A → Z)", icon: SortingAZ02Icon },
}

/** Tri de la liste : bouton à l'allure des champs voisins, menu à choix unique. */
function SortMenu({ sort, onSortChange }: { sort: AdminUserSort; onSortChange: (sort: AdminUserSort) => void }) {
  const current = SORT_OPTIONS[sort]

  return (
    <Menu>
      <MenuTrigger
        aria-label={`Trier : ${current.label}`}
        className="group/sort flex h-11 w-full items-center gap-2.5 rounded-xl border border-input bg-input/30 px-3.5 text-sm outline-none transition-colors hover:bg-muted/60 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 data-popup-open:border-ring data-popup-open:bg-muted/60 sm:w-52 md:h-10"
      >
        <HugeiconsIcon icon={current.icon} size={16} strokeWidth={2} aria-hidden className="shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate text-left">{current.label}</span>
        <HugeiconsIcon
          icon={ArrowDown01Icon}
          size={16}
          strokeWidth={2}
          aria-hidden
          className="shrink-0 text-muted-foreground transition-transform duration-200 group-data-popup-open/sort:rotate-180"
        />
      </MenuTrigger>
      <MenuContent className="w-(--anchor-width) min-w-52">
        <MenuRadioGroup value={sort} onValueChange={(value: AdminUserSort) => onSortChange(value)}>
          {/* Dans le groupe (exigé par Base UI) : il en devient le nom accessible. */}
          <MenuGroupLabel>Trier par</MenuGroupLabel>
          {Object.entries(SORT_OPTIONS).map(([value, option]) => (
            <MenuRadioItem key={value} value={value}>
              <HugeiconsIcon icon={option.icon} strokeWidth={2} />
              {option.label}
            </MenuRadioItem>
          ))}
        </MenuRadioGroup>
      </MenuContent>
    </Menu>
  )
}

interface UsersToolbarProps {
  search: string
  onSearchChange: (search: string) => void
  isSearching: boolean
  sort: AdminUserSort
  onSortChange: (sort: AdminUserSort) => void
}

/** Recherche (nom ou adresse) et tri. */
export function UsersToolbar({ search, onSearchChange, isSearching, sort, onSortChange }: UsersToolbarProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <div role="search" className="relative flex-1">
        <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-muted-foreground">
          {isSearching ? <Spinner size={16} /> : <HugeiconsIcon icon={Search01Icon} size={16} strokeWidth={2} />}
        </span>
        <Input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") onSearchChange("")
          }}
          maxLength={100}
          placeholder="Rechercher par nom ou adresse"
          aria-label="Rechercher un compte par nom ou adresse"
          autoComplete="off"
          spellCheck={false}
          className="h-11 pr-11 pl-10 md:h-10 [&::-webkit-search-cancel-button]:hidden"
        />
        {search && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onSearchChange("")}
            aria-label="Effacer la recherche"
            className="absolute inset-y-0 right-1 my-auto size-9 text-muted-foreground"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={2} />
          </Button>
        )}
      </div>
      <SortMenu sort={sort} onSortChange={onSortChange} />
    </div>
  )
}

interface PaginationProps {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}

/** « 21–40 sur 134 », précédent et suivant. */
export function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  if (total === 0) return null
  const first = (page - 1) * pageSize + 1
  const last = Math.min(page * pageSize, total)

  return (
    <nav aria-label="Pages" className="flex items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground tabular-nums">
        {first}–{last} sur {total}
      </p>
      {pageCount > 1 && (
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="icon"
            aria-label="Page précédente"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="size-9"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={16} strokeWidth={2} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Page suivante"
            disabled={page >= pageCount}
            onClick={() => onPageChange(page + 1)}
            className="size-9"
          >
            <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={2} />
          </Button>
        </div>
      )}
    </nav>
  )
}
