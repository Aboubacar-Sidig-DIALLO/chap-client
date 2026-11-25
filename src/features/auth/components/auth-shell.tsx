import { Mic } from "@/components/animate-ui/icons/hugeicons/mic"
import { VoiceHalo } from "@/features/chat/components/voice-halo"

interface AuthShellProps {
  title: string
  description: React.ReactNode
  /** Lien vers l'autre parcours (connexion ↔ inscription). */
  footer?: React.ReactNode
  children?: React.ReactNode
}

/**
 * Cadre commun des pages d'authentification, pensé d'abord pour le mobile :
 * contenu centré, zones tactiles larges, marges qui respectent l'encoche.
 * Le disque « voix » rappelle d'emblée l'esprit de l'application.
 */
export function AuthShell({ title, description, footer, children }: AuthShellProps) {
  return (
    <main className="flex min-h-dvh flex-col items-center px-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-7 text-center">
        <VoiceHalo size={88} tone="voice" isBreathing className="my-3">
          <Mic size={38} animate="wiggle" animateOnHover="wiggle" />
        </VoiceHalo>

        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-balance">{title}</h1>
          <p className="text-sm text-balance text-muted-foreground">{description}</p>
        </div>

        {children}
      </div>

      {footer && <footer className="pt-6 text-sm text-muted-foreground">{footer}</footer>}
    </main>
  )
}
