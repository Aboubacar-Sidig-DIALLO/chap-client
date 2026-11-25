import {
  Attachment01Icon,
  BubbleChatIcon,
  HeadsetIcon,
  HourglassIcon,
  Mic01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

const FEATURES = [
  { icon: Mic01Icon, label: "Messages vocaux" },
  { icon: HeadsetIcon, label: "Appels en direct" },
  { icon: Attachment01Icon, label: "Photos et fichiers" },
] as const

/** Panneau de droite sur grand écran, tant qu'aucune conversation n'est ouverte (sur mobile, la liste suffit). */
export function ConversationPlaceholder() {
  return (
    <main className="hidden flex-1 flex-col md:flex items-center justify-center gap-8 bg-[radial-gradient(80%_60%_at_50%_35%,color-mix(in_oklch,var(--voice)_9%,transparent),transparent_70%)] px-8 text-center">
      <span className="flex size-18 items-center justify-center rounded-[1.75rem] bg-voice/10 text-voice ring-1 ring-voice/20">
        <HugeiconsIcon icon={BubbleChatIcon} size={34} strokeWidth={1.8} aria-hidden />
      </span>

      <div className="max-w-sm space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Choisissez une conversation</h2>
        <p className="text-sm text-balance text-muted-foreground">
          Écrivez à un ami ou à un groupe depuis la liste, ou recherchez quelqu&apos;un par son nom.
        </p>
      </div>

      <ul aria-label="Dans chaque conversation" className="flex flex-wrap justify-center gap-2">
        {FEATURES.map(({ icon, label }) => (
          <li
            key={label}
            className="flex items-center gap-1.5 rounded-full border bg-background/60 px-3 py-1.5 text-xs font-medium text-muted-foreground"
          >
            <HugeiconsIcon icon={icon} size={14} strokeWidth={2} aria-hidden />
            {label}
          </li>
        ))}
      </ul>

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <HugeiconsIcon icon={HourglassIcon} size={13} strokeWidth={2} aria-hidden />
        Les messages disparaissent une heure après leur envoi.
      </p>
    </main>
  )
}
