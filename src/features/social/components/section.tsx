import { useId } from "react"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"

interface SectionProps {
  title: string
  /** Icône qui identifie la section d'un coup d'œil (amis, groupes…). */
  icon?: IconSvgElement
  /** Affiché à côté du titre (ex. nombre d'amis). */
  count?: number
  /** Action principale de la section (ex. « Nouveau groupe »). */
  action?: React.ReactNode
  children: React.ReactNode
}

/** Bloc titré de l'accueil ; le contenu est une carte arrondie. */
export function Section({ title, icon, count, action, children }: SectionProps) {
  const titleId = useId()

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-2">
      <div className="flex min-h-9 items-center justify-between gap-3 px-1 md:min-h-8 md:px-2">
        <h2
          id={titleId}
          className="flex items-center gap-2 text-sm font-semibold text-muted-foreground md:text-xs md:font-medium md:tracking-wider md:uppercase"
        >
          {icon && (
            <span
              aria-hidden
              className="grid size-6 shrink-0 place-items-center rounded-lg bg-foreground/6 text-foreground/70 md:size-5 md:rounded-md"
            >
              <HugeiconsIcon icon={icon} strokeWidth={2} className="size-3.5 md:size-3" />
            </span>
          )}
          {title}
          {count !== undefined && count > 0 && (
            <span className="rounded-full bg-foreground/6 px-1.5 py-px text-xs font-medium tracking-normal tabular-nums">
              {count}
            </span>
          )}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}

/** Liste de lignes : une carte à filets sur mobile, des lignes libres dans la barre latérale. */
export function SectionList({ children }: { children: React.ReactNode }) {
  return (
    <ul className="divide-y overflow-hidden rounded-3xl border bg-card md:flex md:flex-col md:gap-0.5 md:divide-y-0 md:overflow-visible md:rounded-none md:border-0 md:bg-transparent">
      {children}
    </ul>
  )
}

/** Invitation affichée quand une section est vide ; plus compacte dans la barre latérale. */
export function SectionEmpty({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed px-6 py-8 text-center md:rounded-2xl md:border-solid md:bg-background/60 md:px-5 md:py-6">
      <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground md:size-10 md:rounded-xl md:[&_svg]:size-5">
        {icon}
      </span>
      <div className="space-y-1">
        <p className="font-medium md:text-sm">{title}</p>
        <p className="text-sm text-balance text-muted-foreground md:text-xs md:leading-relaxed">{description}</p>
      </div>
      {action}
    </div>
  )
}
