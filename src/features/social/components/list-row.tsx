import Link from "next/link"
import { cn } from "@/lib/utils"
import { UnreadBadge } from "./unread-badge"

/**
 * Actions secondaires d'une ligne (retirer, quitter) : avec une souris, elles
 * n'apparaissent qu'au survol ou au clavier, pour une liste plus calme.
 */
export const REVEAL_ON_HOVER =
  "pointer-fine:opacity-0 pointer-fine:group-hover/row:opacity-100 pointer-fine:group-focus-within/row:opacity-100 pointer-fine:data-popup-open:opacity-100"

interface ListRowProps {
  /** Avatar (ou avatars superposés). */
  leading: React.ReactNode
  title: string
  description?: React.ReactNode
  /** Rend la ligne cliquable (ex. ouvrir la conversation). */
  href?: string
  /** Conversation actuellement ouverte : la ligne est mise en avant. */
  isActive?: boolean
  /** Messages reçus pas encore lus. */
  unreadCount?: number
  /** Boutons à droite. */
  actions?: React.ReactNode
}

/**
 * Ligne d'une liste de l'accueil : carte tactile sur mobile, ligne arrondie
 * de barre latérale sur grand écran, où la conversation ouverte se détache
 * comme une carte posée sur le fond.
 */
export function ListRow({ leading, title, description, href, isActive = false, unreadCount = 0, actions }: ListRowProps) {
  const identity = (
    <>
      {leading}
      <div className="min-w-0 flex-1">
        <p className={cn("truncate font-medium", unreadCount > 0 && "font-semibold")}>{title}</p>
        {description && <div className="truncate text-sm text-muted-foreground">{description}</div>}
      </div>
      <UnreadBadge count={unreadCount} />
    </>
  )

  return (
    <li
      data-active={isActive || undefined}
      className="group/row flex min-h-16 items-center gap-1 pr-2 md:min-h-14 md:rounded-xl md:transition-[background-color,box-shadow] md:hover:bg-foreground/4 md:data-active:bg-card md:data-active:shadow-xs md:data-active:ring-1 md:data-active:ring-border md:dark:data-active:bg-muted"
    >
      {href ? (
        <Link
          href={href}
          aria-current={isActive ? "page" : undefined}
          className="flex min-w-0 flex-1 items-center gap-3 self-stretch py-2 pl-4 outline-none transition-colors hover:bg-muted/50 focus-visible:bg-muted md:rounded-xl md:pl-2 md:hover:bg-transparent md:focus-visible:bg-transparent md:focus-visible:ring-[3px] md:focus-visible:ring-ring/50"
        >
          {identity}
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3 py-2 pl-4 md:pl-2">{identity}</div>
      )}
      {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
    </li>
  )
}
