"use client"

import { useSyncExternalStore } from "react"
import { Effect } from "@animate-ui/react/primitives/effects/effect"
import {
  Attachment01Icon,
  BubbleChatIcon,
  HeadsetIcon,
  HourglassIcon,
  Mic01Icon,
  Search01Icon,
  Share08Icon,
  Tick02Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import { Kbd } from "@/components/ui/kbd"
import { authClient } from "@/lib/auth-client"
import { PAGE_ENTRANCE } from "@/lib/motion"
import { sendHomeCommand } from "../hooks/use-home-commands"
import { useInvite } from "../hooks/use-invite"
import { useSearchShortcutLabel } from "../hooks/use-search-shortcut"
import { greetingFor } from "../lib/greeting"

const FEATURES = [
  { icon: Mic01Icon, label: "Messages vocaux" },
  { icon: HeadsetIcon, label: "Appels en direct" },
  { icon: Attachment01Icon, label: "Photos et fichiers" },
] as const

/**
 * Panneau de droite sur grand écran, tant qu'aucune conversation n'est ouverte
 * (sur mobile, la liste suffit) : une salutation et de quoi démarrer en un clic.
 */
export function WelcomePanel() {
  const shortcutLabel = useSearchShortcutLabel()
  const { invite, isCopied, label: inviteLabel } = useInvite()

  return (
    <main className="@container hidden flex-1 overflow-y-auto bg-[radial-gradient(70%_55%_at_50%_30%,color-mix(in_oklch,var(--voice)_8%,transparent),transparent_70%)] md:flex">
      {/* `m-auto` centre le contenu tout en le laissant défiler sur une fenêtre basse. */}
      <Effect {...PAGE_ENTRANCE} className="m-auto flex w-full max-w-3xl flex-col items-center gap-10 px-8 py-12 text-center">
        <header className="flex flex-col items-center gap-5">
          <span
            aria-hidden
            className="flex size-16 items-center justify-center rounded-[1.4rem] bg-voice/10 text-voice ring-1 ring-voice/20"
          >
            <HugeiconsIcon icon={BubbleChatIcon} size={30} strokeWidth={1.8} />
          </span>
          <div className="space-y-2">
            <WelcomeTitle />
            <p className="text-balance text-muted-foreground">
              Choisissez une conversation dans la liste, ou démarrez-en une nouvelle.
            </p>
          </div>
        </header>

        <ul aria-label="Pour commencer" className="grid w-full max-w-md gap-3 @2xl:max-w-none @2xl:grid-cols-3">
          <li>
            <WelcomeAction
              icon={Search01Icon}
              title="Nouvelle discussion"
              description="Trouvez quelqu'un par son nom"
              hint={shortcutLabel}
              onClick={() => sendHomeCommand("search")}
            />
          </li>
          <li>
            <WelcomeAction
              icon={UserGroupIcon}
              title="Créer un groupe"
              description="Réunissez plusieurs amis"
              onClick={() => sendHomeCommand("create-group")}
            />
          </li>
          <li>
            <WelcomeAction
              icon={isCopied ? Tick02Icon : Share08Icon}
              title={inviteLabel}
              description="Partagez le lien d'inscription"
              onClick={invite}
              aria-live="polite"
            />
          </li>
        </ul>

        <footer className="flex flex-col items-center gap-3 text-xs text-muted-foreground">
          <ul aria-label="Dans chaque conversation" className="flex flex-wrap justify-center gap-2">
            {FEATURES.map(({ icon, label }) => (
              <li key={label} className="flex items-center gap-1.5 rounded-full border bg-background/60 px-3 py-1.5 font-medium">
                <HugeiconsIcon icon={icon} size={14} strokeWidth={2} aria-hidden />
                {label}
              </li>
            ))}
          </ul>
          <p className="flex items-center gap-1.5">
            <HugeiconsIcon icon={HourglassIcon} size={13} strokeWidth={2} aria-hidden />
            Les messages disparaissent une heure après leur envoi.
          </p>
        </footer>
      </Effect>
    </main>
  )
}

const subscribeNever = () => () => {}

/**
 * « Bonsoir, Léa ». L'heure et le nom ne sont connus que du navigateur : rien
 * n'est écrit au rendu serveur (pas d'écart à l'hydratation), la place est réservée.
 */
function WelcomeTitle() {
  const { data: session } = authClient.useSession()
  const isClient = useSyncExternalStore(subscribeNever, () => true, () => false)
  const title = isClient && session ? greetingFor(session.user.name) : null

  return (
    <h1 className="text-3xl font-semibold tracking-tight text-balance">
      {title ?? <span className="invisible">Bonjour</span>}
    </h1>
  )
}

interface WelcomeActionProps extends Omit<React.ComponentProps<"button">, "title"> {
  icon: IconSvgElement
  title: string
  description: string
  /** Raccourci clavier équivalent, affiché à droite du titre. */
  hint?: string | null
}

/** Carte d'action : en ligne quand la place manque, en colonne sur trois cartes sinon. */
function WelcomeAction({ icon, title, description, hint, ...props }: WelcomeActionProps) {
  return (
    <button
      type="button"
      className="press group/action flex size-full items-center gap-4 rounded-2xl border bg-card/80 p-4 text-left shadow-xs outline-none [--press-scale:0.985] hover:border-voice/30 hover:bg-card hover:shadow-sm focus-visible:ring-[3px] focus-visible:ring-ring/50 @2xl:flex-col @2xl:items-start @2xl:gap-3"
      {...props}
    >
      <span
        aria-hidden
        className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-voice/10 text-voice transition-colors group-hover/action:bg-voice group-hover/action:text-voice-foreground"
      >
        <HugeiconsIcon icon={icon} size={20} strokeWidth={2} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 @2xl:w-full">
        <span className="flex items-center justify-between gap-2">
          <span className="truncate font-medium">{title}</span>
          {hint && <Kbd className="shrink-0">{hint}</Kbd>}
        </span>
        <span className="text-sm text-muted-foreground">{description}</span>
      </span>
    </button>
  )
}
