import { cn } from "@/lib/utils"
import type { ResolvedTheme, ThemePreference } from "../lib/theme"

/**
 * Miniature d'une conversation dans le thème `preference`, peinte avec les
 * vraies couleurs de l'application (`data-theme` redéfinit les variables pour
 * ce bloc seulement). Automatique : moitié claire, moitié sombre.
 */
export function ThemePreview({ preference }: { preference: ThemePreference }) {
  if (preference !== "system") return <PreviewScene theme={preference} />

  return (
    <div className="relative">
      <PreviewScene theme="light" />
      <PreviewScene theme="dark" className="absolute inset-0 [clip-path:polygon(100%_0,100%_100%,0_100%)]" />
    </div>
  )
}

function PreviewScene({ theme, className }: { theme: ResolvedTheme; className?: string }) {
  return (
    <div data-theme={theme} className={cn("flex aspect-[4/3] flex-col gap-1.5 bg-background p-2.5", className)}>
      <div className="mb-0.5 flex items-center gap-1.5">
        <span className="size-3 rounded-full bg-muted-foreground/35" />
        <span className="h-1.5 w-1/3 rounded-full bg-muted-foreground/25" />
      </div>
      <span className="h-3 w-3/5 rounded-full rounded-bl-sm bg-muted" />
      <span className="ml-auto h-3 w-1/2 rounded-full rounded-br-sm bg-voice" />
      <span className="h-3 w-2/5 rounded-full rounded-bl-sm bg-muted" />
    </div>
  )
}
