"use client"

import {
  Alert02Icon,
  ArrowReloadHorizontalIcon,
  Copy01Icon,
  HourglassIcon,
  Share08Icon,
  Tick02Icon,
  Unlink02Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import { Swap } from "@/components/motion/swap"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { formatDuration } from "@/features/chat/lib/format"
import { cn } from "@/lib/utils"
import { useInviteLink } from "../hooks/use-invite-link"
import { useShareLink } from "../hooks/use-share-link"
import { INVITE_ENDING_MS, INVITE_TTL_MS } from "../lib/config"
import type { InviteTarget } from "../types"
import { QrCode } from "./qr-code"

interface InvitePanelProps {
  target: InviteTarget
  /** Texte qui accompagne le lien partagé (« Rejoins-moi sur… »). */
  shareText: string
}

/**
 * Invitation éphémère, prête à être scannée ou partagée : le QR code, le
 * temps qu'il reste (une minute au plus), le lien, et de quoi en générer
 * un nouveau ou le désactiver. Expiré ou désactivé, le code s'efface derrière
 * un voile qui propose un nouveau lien.
 */
export function InvitePanel({ target, shareText }: InvitePanelProps) {
  const link = useInviteLink(target)
  const { canShare, share, copy, copyFeedback } = useShareLink()
  const { state, url, token, remainingMs, isExpired, isBusy } = link

  const veil: Veil | null =
    state.status === "error"
      ? { icon: Alert02Icon, title: "Lien indisponible", description: state.message, action: "Réessayer" }
      : state.status === "revoked"
        ? { icon: Unlink02Icon, title: "Lien désactivé", description: "Il ne fonctionne plus.", action: "Nouveau lien" }
        : isExpired
          ? { icon: HourglassIcon, title: "Lien expiré", description: "Comme les messages, il a disparu.", action: "Nouveau lien" }
          : null

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Toujours clair, même en thème sombre : c'est ce que les appareils photo lisent le mieux. */}
      <div className="relative w-full max-w-60 overflow-hidden rounded-[2rem] bg-white p-3 shadow-sm ring-1 ring-black/5">
        <Swap swapKey={token ?? state.status} className="aspect-square">
          {token ? (
            <QrCode
              value={url ?? ""}
              label="QR code de l'invitation : à scanner avec l'appareil photo"
              className={cn("size-full transition-[filter,opacity] duration-300", veil && "opacity-30 blur-[3px]")}
            />
          ) : (
            <div className="grid size-full place-items-center">
              {state.status === "loading" && <Spinner size={24} className="text-neutral-400" />}
            </div>
          )}
        </Swap>

        {veil && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/70 p-4 text-center text-neutral-900">
            <HugeiconsIcon icon={veil.icon} size={24} strokeWidth={2} aria-hidden className="text-neutral-500" />
            <p role="status" className="space-y-0.5">
              <span className="block font-semibold">{veil.title}</span>
              <span className="block text-xs text-pretty text-neutral-600">{veil.description}</span>
            </p>
            <Button size="sm" onClick={link.renew} disabled={isBusy} className="mt-1">
              {isBusy ? <Spinner size={14} /> : <HugeiconsIcon icon={ArrowReloadHorizontalIcon} strokeWidth={2} data-icon="inline-start" />}
              {veil.action}
            </Button>
          </div>
        )}
      </div>

      <Countdown remainingMs={url ? remainingMs : 0} isActive={url !== null} />

      <div className="flex w-full flex-col gap-2">
        <div className="flex items-center gap-2">
          <Button
            size="lg"
            className="flex-1"
            disabled={!url}
            onClick={() => url && (canShare ? share(url, shareText) : copy(url))}
          >
            <HugeiconsIcon
              icon={canShare ? Share08Icon : copyFeedback === "copied" ? Tick02Icon : Copy01Icon}
              strokeWidth={2}
              data-icon="inline-start"
            />
            {canShare ? "Partager le lien" : copyFeedback === "copied" ? "Lien copié" : "Copier le lien"}
          </Button>
          {/* Avec la feuille de partage, la copie reste à portée d'un appui. */}
          {canShare && (
            <Button
              variant="outline"
              size="icon-lg"
              disabled={!url}
              onClick={() => url && copy(url)}
              aria-label={copyFeedback === "copied" ? "Lien copié" : "Copier le lien"}
            >
              <HugeiconsIcon icon={copyFeedback === "copied" ? Tick02Icon : Copy01Icon} strokeWidth={2} />
            </Button>
          )}
        </div>
        <p aria-live="polite" className="min-h-4 text-center text-xs text-destructive">
          {copyFeedback === "failed" && "Copie impossible : partagez plutôt le QR code."}
        </p>

        {/* Une fois le lien donné, on peut le couper ou en refaire un, plus frais. */}
        {url && (
          <div className="flex justify-center gap-1">
            <Button variant="ghost" size="sm" onClick={link.renew} disabled={isBusy} className="text-muted-foreground">
              <HugeiconsIcon icon={ArrowReloadHorizontalIcon} strokeWidth={2} data-icon="inline-start" />
              Nouveau lien
            </Button>
            <Button variant="ghost" size="sm" onClick={link.revoke} disabled={isBusy} className="text-muted-foreground">
              <HugeiconsIcon icon={Unlink02Icon} strokeWidth={2} data-icon="inline-start" />
              Désactiver
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

interface Veil {
  icon: IconSvgElement
  title: string
  description: string
  action: string
}

/** « Expire dans 4:32 », avec une jauge qui se vide ; la dernière minute, en ambre. */
function Countdown({ remainingMs, isActive }: { remainingMs: number; isActive: boolean }) {
  const isEnding = isActive && remainingMs <= INVITE_ENDING_MS
  const ratio = remainingMs / INVITE_TTL_MS

  return (
    <div
      role="timer"
      aria-label={isActive ? `Le lien expire dans ${formatDuration(remainingMs)}` : "Aucun lien actif"}
      className={cn(
        "flex w-full max-w-60 flex-col items-center gap-2 transition-opacity",
        !isActive && "opacity-40"
      )}
    >
      <span
        className={cn(
          "flex items-center gap-1.5 text-sm font-medium tabular-nums transition-colors",
          isEnding ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
        )}
      >
        <HugeiconsIcon icon={HourglassIcon} size={15} strokeWidth={2} aria-hidden />
        {isActive ? `Expire dans ${formatDuration(remainingMs)}` : "Lien inactif"}
      </span>
      <span aria-hidden className="h-1 w-full overflow-hidden rounded-full bg-muted">
        <span
          className={cn(
            "block h-full origin-left rounded-full transition-[scale,background-color] duration-1000 ease-linear",
            isEnding ? "bg-amber-500" : "bg-voice"
          )}
          style={{ scale: `${ratio} 1` }}
        />
      </span>
    </div>
  )
}
