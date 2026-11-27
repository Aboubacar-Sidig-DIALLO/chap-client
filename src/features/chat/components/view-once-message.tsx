"use client"

import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { AnimateIcon } from "@animate-ui/react/icons"
import { blur, transition, useTempoTransition } from "@animate-ui/react/utils/motion"
import {
  Attachment01Icon,
  File02Icon,
  Image01Icon,
  Mic01Icon,
  Video01Icon,
  ViewOffSlashIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import { Swap } from "@/components/motion/swap"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import { formatNameList } from "../lib/format"
import {
  loadViewOnceFiles,
  releaseViewOnceFiles,
  summarizeViewOnce,
  viewOnceModeLabel,
  type OpenedFile,
} from "../lib/view-once"
import type { ChatMessage, ViewOnce, ViewOnceKind } from "../types"
import { useOpenViewOnce } from "./message-actions"
import { ViewOnceIcon } from "./view-once-icon"
import { ViewOnceViewer } from "./view-once-viewer"
import { useVoicePlayback } from "./voice-playback"

const KIND_ICONS: Record<ViewOnceKind, IconSvgElement> = {
  voice: Mic01Icon,
  image: Image01Icon,
  video: Video01Icon,
  file: File02Icon,
}

/** Délai maximal entre la fermeture de la visionneuse et l'oubli de son contenu. */
const VIEWER_EXIT_GRACE_MS = 1500

const CARD_CLASS = "flex w-64 max-w-full items-center gap-2.5 rounded-2xl py-2 pr-3 pl-2 text-left"

interface ViewOnceMessageProps {
  message: ChatMessage & { viewOnce: ViewOnce }
  isOwn: boolean
  currentUserId: string
}

/**
 * Un message à vue unique dans la conversation. Son contenu n'y est jamais :
 * - reçu, une carte invite à l'ouvrir ; on ne l'ouvre qu'une fois, puis il
 *   ne reste que sa trace (« Photo vue ») ;
 * - envoyé, la carte dit qui l'a déjà ouvert.
 *
 * L'ouverture se fait en deux temps : le serveur la confirme (un instant,
 * sur la carte), puis la visionneuse s'ouvre et le contenu s'y dévoile une
 * fois téléchargé. Fermer pendant le téléchargement l'interrompt.
 */
export function ViewOnceMessage({ message, isOwn, currentUserId }: ViewOnceMessageProps) {
  const { viewOnce } = message
  const summary = summarizeViewOnce(viewOnce.items)
  const modeLabel = viewOnceModeLabel(summary.kind)
  const openViewOnce = useOpenViewOnce()
  const playback = useVoicePlayback()
  const fade = useTempoTransition(transition.fade)

  /** Le serveur confirme l'ouverture. */
  const [isConfirming, setIsConfirming] = useState(false)
  /** La visionneuse est demandée ouverte… */
  const [isViewerOpen, setIsViewerOpen] = useState(false)
  /** …et reste montée le temps de sa sortie. */
  const [isViewerMounted, setIsViewerMounted] = useState(false)
  /** Le contenu, en mémoire uniquement, jusqu'à la fin de sa disparition à l'écran. */
  const [files, setFiles] = useState<OpenedFile[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const loadingRef = useRef<AbortController | null>(null)

  const hasOpened = viewOnce.openedBy.some((user) => user.id === currentUserId)
  const canOpen = !isOwn && !hasOpened && message.status === "sent" && openViewOnce !== null

  // Contenu remplacé, visionneuse fermée ou message disparu : il quitte la mémoire.
  useEffect(() => (files ? () => releaseViewOnceFiles(files) : undefined), [files])

  // Message disparu pendant le téléchargement : on l'interrompt.
  useEffect(() => () => loadingRef.current?.abort(), [])

  // Filet de sécurité : fermée, la visionneuse ne garde rien au-delà de sa sortie.
  useEffect(() => {
    if (isViewerOpen || !isViewerMounted) return
    const timeout = setTimeout(unmountViewer, VIEWER_EXIT_GRACE_MS)
    return () => clearTimeout(timeout)
  }, [isViewerOpen, isViewerMounted])

  function unmountViewer() {
    setIsViewerMounted(false)
    setFiles(null)
  }

  async function open() {
    if (!canOpen || isConfirming) return
    setIsConfirming(true)
    setError(null)
    // Un seul son à la fois : le vocal en cours de lecture se met en pause.
    if (playback.nowPlaying?.isPlaying) playback.toggleNowPlaying()

    const response = await openViewOnce(message.id)
    setIsConfirming(false)
    if (!response.ok) {
      setError(response.error)
      return
    }

    const controller = new AbortController()
    loadingRef.current = controller
    setIsViewerMounted(true)
    setIsViewerOpen(true)
    try {
      setFiles(await loadViewOnceFiles(response.files, { signal: controller.signal }))
    } catch (cause) {
      // Fermée avant la fin : rien à signaler, l'utilisateur l'a voulu.
      if (controller.signal.aborted) return
      setIsViewerOpen(false)
      setError(cause instanceof Error ? cause.message : "Ouverture impossible")
    } finally {
      if (loadingRef.current === controller) loadingRef.current = null
    }
  }

  function closeViewer() {
    loadingRef.current?.abort()
    setIsViewerOpen(false)
  }

  const icon = summary.kind ? KIND_ICONS[summary.kind] : Attachment01Icon
  const state = isOwn ? "own" : hasOpened ? "opened" : "closed"

  return (
    <div
      data-status={message.status}
      className="flex max-w-[85cqw] flex-col items-start gap-1 transition-opacity data-[status=sending]:opacity-60 group-data-[align=end]/message:items-end sm:max-w-[75cqw]"
    >
      <Swap swapKey={state} className="max-w-full">
        {state === "own" && (
          <div className={cn(CARD_CLASS, "rounded-br-md bg-primary text-primary-foreground")}>
            <KindDisc icon={icon} className="bg-primary-foreground/15" />
            <CardText
              title={summary.title}
              detail={
                viewOnce.openedBy.length > 0
                  ? `${summary.copy.doneBy} ${formatNameList(viewOnce.openedBy.map((user) => user.name))}`
                  : summary.copy.pending
              }
              modeLabel={modeLabel}
            />
          </div>
        )}

        {state === "opened" && (
          <p
            className={cn(
              CARD_CLASS,
              "rounded-bl-md border border-dashed py-2.5 pl-3 text-sm text-muted-foreground"
            )}
          >
            <HugeiconsIcon icon={ViewOffSlashIcon} size={16} strokeWidth={2} aria-hidden />
            <span className="min-w-0 flex-1 truncate">
              {summary.copy.opened(viewOnce.items.length)}
            </span>
            <span className="text-[11px] opacity-80">Effacé</span>
          </p>
        )}

        {state === "closed" && (
          <AnimateIcon animateOnHover animateOnTap asChild>
            <button
              type="button"
              onClick={() => void open()}
              disabled={!canOpen || isConfirming}
              aria-busy={isConfirming}
              aria-label={`${summary.copy.open} : ${summary.title}, ${modeLabel.toLowerCase()}. Il s'effacera ensuite.`}
              className={cn(
                CARD_CLASS,
                "group/once press rounded-bl-md bg-muted outline-none [--press-scale:0.985] hover:bg-muted/80 focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-default"
              )}
            >
              <SealedDisc icon={icon} isBusy={isConfirming} />
              <CardText
                title={summary.title}
                detail={`Touchez pour ${summary.copy.open.toLowerCase()}`}
                modeLabel={modeLabel}
              />
            </button>
          </AnimateIcon>
        )}
      </Swap>

      <AnimatePresence initial={false}>
        {error && (
          <motion.p
            key="error"
            role="alert"
            initial={{ opacity: 0, filter: blur.icon }}
            animate={{ opacity: 1, filter: "blur(0px)", transition: fade }}
            exit={{ opacity: 0, filter: blur.icon, transition: fade }}
            className="px-1 text-xs text-destructive"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      {isViewerMounted && (
        <ViewOnceViewer
          files={files}
          total={viewOnce.items.length}
          author={message.author}
          modeLabel={modeLabel}
          open={isViewerOpen}
          onClose={closeViewer}
          // Évaporé à l'écran : il quitte aussi la mémoire.
          onExited={unmountViewer}
        />
      )}
    </div>
  )
}

/**
 * Le contenu, encore scellé : l'icône de son genre, entourée du cercle en
 * pointillés de la vue unique, qui tourne doucement (plus vite au survol).
 */
function SealedDisc({ icon, isBusy }: { icon: IconSvgElement; isBusy: boolean }) {
  return (
    <span className="relative grid size-10 shrink-0 place-items-center">
      <span
        aria-hidden
        className="absolute -inset-0.75 rounded-full border-[1.5px] border-dashed border-read/70 motion-safe:animate-[spin_12s_linear_infinite] motion-safe:group-hover/once:animate-[spin_4s_linear_infinite]"
      />
      <KindDisc icon={icon} isBusy={isBusy} className="bg-read text-white shadow-sm" />
    </span>
  )
}

function KindDisc({
  icon,
  isBusy = false,
  className,
}: {
  icon: IconSvgElement
  isBusy?: boolean
  className?: string
}) {
  return (
    <span className={cn("grid size-10 shrink-0 place-items-center rounded-full", className)}>
      {isBusy ? <Spinner size={18} /> : <HugeiconsIcon icon={icon} size={18} strokeWidth={2} aria-hidden />}
    </span>
  )
}

function CardText({ title, detail, modeLabel }: { title: string; detail: string; modeLabel: string }) {
  return (
    <span className="min-w-0 flex-1">
      <span className="block truncate text-sm font-medium tabular-nums">{title}</span>
      <span className="flex items-center gap-1 text-[11px] opacity-80">
        <ViewOnceIcon size={12} />
        <span className="truncate">
          {modeLabel} · {detail}
        </span>
      </span>
    </span>
  )
}
