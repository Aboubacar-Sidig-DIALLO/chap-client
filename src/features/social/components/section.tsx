import { useId } from "react"

interface SectionProps {
  title: string
  /** Affiché à côté du titre (ex. nombre d'amis). */
  count?: number
  /** Action principale de la section (ex. « Nouveau groupe »). */
  action?: React.ReactNode
  children: React.ReactNode
}

/** Bloc titré de l'accueil ; le contenu est une carte arrondie. */
export function Section({ title, count, action, children }: SectionProps) {
  const titleId = useId()

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-2">
      <div className="flex min-h-9 items-center justify-between gap-3 px-1 md:min-h-8 md:px-2">
        <h2 id={titleId} className="text-sm font-semibold text-muted-foreground">
          {title}
          {count !== undefined && count > 0 && <span className="ml-1.5 font-normal tabular-nums">{count}</span>}
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

/** Invitation affichée quand une section est vide. */
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
    <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed px-6 py-8 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        {icon}
      </span>
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        <p className="text-sm text-balance text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  )
}
