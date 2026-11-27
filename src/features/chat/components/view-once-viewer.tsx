/* eslint-disable @next/next/no-img-element -- contenu en mémoire (`blob:`), non optimisable par next/image. */
"use client"

import { useEffect, useRef, useState } from "react"
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
  type PanInfo,
  type Variants,
} from "motion/react"
import { Dialog } from "@animate-ui/react/primitives/base-ui/dialog"
import { AnimateIcon } from "@animate-ui/react/icons"
import {
  blur,
  ReducedMotionConfig,
  scale,
  spring,
  transition,
  useTempoTransition,
} from "@animate-ui/react/utils/motion"
import { ArrowLeft01Icon, ArrowRight01Icon, ViewOffSlashIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Cancel01 } from "@/components/animate-ui/icons/hugeicons/cancel-01"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { OpenedFile } from "../lib/view-once"
import type { ChatUser } from "../types"
import { UserAvatar } from "./user-avatar"
import { ViewOnceIcon } from "./view-once-icon"
import { OpeningStage, ViewOnceStage } from "./view-once-stages"

/** Glisser vers le bas au-delà de cette distance (px), ou assez vite, ferme la visionneuse. */
const DISMISS_OFFSET = 120
const DISMISS_VELOCITY = 600

/** Boutons ronds de la visionneuse (fermer, précédent, suivant) : les couleurs du thème. */
const ROUND_BUTTON_CLASS =
  "size-11 rounded-full bg-muted/80 text-foreground backdrop-blur-md hover:bg-muted"

/** Pas de menu « Enregistrer l'image », ni de glisser-déposer hors de la visionneuse. */
function preventSaving(event: React.SyntheticEvent) {
  event.preventDefault()
}

/**
 * Entrée : le contenu sort du flou. Sortie : il s'évapore (flou, fondu, léger
 * agrandissement) — on voit qu'il disparaît, pas seulement qu'on le ferme.
 */
const STAGE_VARIANTS: Variants = {
  hidden: { opacity: 0, scale: 0.96, filter: "blur(12px)" },
  shown: { opacity: 1, scale: 1, filter: "blur(0px)" },
  gone: { opacity: 0, scale: 1.04, filter: "blur(18px)" },
}

interface ViewOnceViewerProps {
  /** Le contenu en mémoire ; `null` le temps de son téléchargement. */
  files: OpenedFile[] | null
  /** Nombre de pièces annoncées : les segments sont là dès l'ouverture. */
  total: number
  author: ChatUser
  /** « Écoute unique » ou « Vue unique ». */
  modeLabel: string
  /** `false` : la visionneuse se ferme (et son contenu s'évapore). */
  open: boolean
  /** Demande de fermeture : bouton, Échap, glissement, fin du dernier vocal. */
  onClose: () => void
  /** La sortie est jouée : le contenu peut quitter la mémoire. */
  onExited: () => void
}

/**
 * Le contenu d'un message à vue unique, en plein écran, le temps d'un
 * regard, aux couleurs de l'application (thème clair ou sombre, halo
 * « voix » comme la scène du direct). Elle s'ouvre aussitôt et le contenu
 * s'y dévoile dès qu'il est arrivé. Plusieurs pièces se suivent comme des
 * « stories » : toucher un bord passe à la voisine, glisser vers le bas
 * ferme. Rien n'est gardé : tout vivait en mémoire.
 */
export function ViewOnceViewer({
  files,
  total,
  author,
  modeLabel,
  open,
  onClose,
  onExited,
}: ViewOnceViewerProps) {
  const [index, setIndex] = useState(0)
  const segmentsRef = useRef<HTMLDivElement>(null)
  const rise = useTempoTransition(spring.entrance)
  const fade = useTempoTransition(transition.fade)
  const swap = useTempoTransition(transition.swap)

  const file = files?.[index] ?? null
  const count = files?.length ?? total
  const isLast = index === count - 1
  const hasSeveral = count > 1

  // Glisser vers le bas : le contenu suit le doigt et s'estompe.
  const dragY = useMotionValue(0)
  const dragOpacity = useTransform(dragY, [0, 320], [1, 0.35])

  /** Avancée de la pièce en cours (0 à 1), pour son segment, sans re-rendu. */
  function reportProgress(ratio: number) {
    segmentsRef.current?.style.setProperty("--item-progress", String(ratio))
  }

  // Chaque pièce repart de zéro ; une photo ou un fichier est vu d'emblée.
  useEffect(() => {
    reportProgress(file?.kind === "image" || file?.kind === "file" ? 1 : 0)
  }, [file])

  function go(next: number) {
    if (files && next >= 0 && next < files.length) setIndex(next)
  }

  function showNext() {
    if (isLast) onClose()
    else go(index + 1)
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowRight") go(index + 1)
    if (event.key === "ArrowLeft") go(index - 1)
  }

  function handleDragEnd(_: unknown, { offset, velocity }: PanInfo) {
    if (offset.y > DISMISS_OFFSET || velocity.y > DISMISS_VELOCITY) onClose()
  }

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-background" />
        <Dialog.Popup
          onKeyDown={handleKeyDown}
          onContextMenu={preventSaving}
          className="fixed inset-0 z-50 overflow-hidden bg-background text-foreground outline-none select-none"
        >
          <ReducedMotionConfig>
            <Ambience file={file} index={index} />

            <motion.div
              variants={STAGE_VARIANTS}
              initial="hidden"
              animate="shown"
              exit="gone"
              transition={{ ...rise, opacity: fade, filter: fade }}
              onAnimationComplete={(name) => {
                if (name === "gone") onExited()
              }}
              className="relative h-full"
            >
              <motion.div
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0.05, bottom: 0.7 }}
                onDragEnd={handleDragEnd}
                style={{ y: dragY, opacity: dragOpacity }}
                className="flex h-full touch-none flex-col"
              >
                <header className="flex flex-col gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
                  {hasSeveral && <Segments ref={segmentsRef} count={count} index={index} />}

                  <div className="flex items-center gap-3">
                    <UserAvatar user={author} className="size-10 ring-2 ring-border" />
                    <div className="min-w-0 flex-1">
                      <Dialog.Title className="truncate text-sm font-semibold">{author.name}</Dialog.Title>
                      <Dialog.Description className="mt-0.5 inline-flex items-center gap-1.5 rounded-full bg-voice/10 px-2 py-0.5 text-[11px] font-medium text-voice">
                        <ViewOnceIcon size={12} />
                        {modeLabel}
                      </Dialog.Description>
                    </div>
                    <AnimateIcon animateOnHover animateOnTap asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        aria-label="Fermer et effacer"
                        className={ROUND_BUTTON_CLASS}
                      >
                        <Cancel01 size={20} />
                      </Button>
                    </AnimateIcon>
                  </div>
                </header>

                <main className="relative flex min-h-0 flex-1 items-center justify-center px-6 py-6">
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.div
                      // L'attente, puis chaque pièce : chacune remplace la précédente sur place.
                      key={file ? index : "opening"}
                      initial={{ opacity: 0, scale: scale.action, filter: blur.icon }}
                      animate={{ opacity: 1, scale: 1, filter: "blur(0px)", transition: swap }}
                      exit={{ opacity: 0, scale: scale.action, filter: blur.icon, transition: swap }}
                      className="flex size-full items-center justify-center"
                    >
                      {file ? (
                        <ViewOnceStage
                          file={file}
                          author={author}
                          onProgress={reportProgress}
                          onEnded={showNext}
                        />
                      ) : (
                        <OpeningStage />
                      )}
                    </motion.div>
                  </AnimatePresence>

                  {files && hasSeveral && (
                    <>
                      <EdgeZone direction="previous" disabled={index === 0} onClick={() => go(index - 1)} />
                      <EdgeZone direction="next" disabled={isLast} onClick={() => go(index + 1)} />
                      <StepButton direction="previous" disabled={index === 0} onClick={() => go(index - 1)} />
                      <StepButton direction="next" disabled={isLast} onClick={() => go(index + 1)} />
                    </>
                  )}
                </main>

                <footer className="flex items-center justify-center gap-1.5 px-6 pb-[max(1rem,env(safe-area-inset-bottom))] text-center text-xs text-muted-foreground">
                  <HugeiconsIcon icon={ViewOffSlashIcon} size={14} strokeWidth={2} aria-hidden />
                  <span>
                    {file?.kind === "voice"
                      ? "Se referme à la fin · ne pourra pas être réécouté"
                      : "Fermez pour l'effacer définitivement"}
                    <span className="hidden pointer-coarse:inline"> · ou glissez vers le bas</span>
                  </span>
                </footer>
              </motion.div>
            </motion.div>
          </ReducedMotionConfig>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

/**
 * Le fond, qui donne sa lumière à la pièce affichée : la photo elle-même,
 * très floue et discrète ; sinon le halo « voix » de la scène du direct.
 */
function Ambience({ file, index }: { file: OpenedFile | null; index: number }) {
  const fade = useTempoTransition(transition.fade)
  const image = file?.kind === "image" ? file : null

  return (
    <AnimatePresence initial={false}>
      <motion.div
        key={image ? index : "halo"}
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: fade }}
        exit={{ opacity: 0, transition: fade }}
        className="pointer-events-none absolute inset-0"
      >
        {image ? (
          <img
            src={image.objectUrl}
            alt=""
            className="size-full scale-125 object-cover opacity-25 blur-3xl saturate-150 dark:opacity-35"
          />
        ) : (
          <div className="size-full bg-[radial-gradient(120%_60%_at_50%_0%,color-mix(in_oklch,var(--voice)_16%,transparent),transparent_70%)]" />
        )}
      </motion.div>
    </AnimatePresence>
  )
}

/** Un segment par pièce, comme des « stories » : vues, en cours, à venir. */
function Segments({
  ref,
  count,
  index,
}: {
  ref: React.Ref<HTMLDivElement>
  count: number
  index: number
}) {
  return (
    <div ref={ref} aria-hidden className="flex gap-1 [--item-progress:0]">
      {Array.from({ length: count }, (_, position) => (
        <span key={position} className="h-0.75 flex-1 overflow-hidden rounded-full bg-foreground/15">
          <span
            className="block h-full origin-left rounded-full bg-voice transition-transform duration-200 ease-linear"
            style={{
              transform:
                position < index
                  ? "scaleX(1)"
                  : position === index
                    ? "scaleX(var(--item-progress))"
                    : "scaleX(0)",
            }}
          />
        </span>
      ))}
    </div>
  )
}

interface StepProps {
  direction: "previous" | "next"
  disabled: boolean
  onClick: () => void
}

/**
 * Au doigt, comme des « stories » : toucher le bord gauche ou droit passe à
 * la pièce voisine. Doublé, au clavier et à la souris, par les flèches.
 */
function EdgeZone({ direction, disabled, onClick }: StepProps) {
  if (disabled) return null
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-hidden
      onClick={onClick}
      className={cn(
        "absolute inset-y-0 hidden w-1/5 pointer-coarse:block",
        direction === "next" ? "right-0" : "left-0"
      )}
    />
  )
}

/** Flèches visibles à la souris ; au doigt, les bords (`EdgeZone`) les remplacent. */
function StepButton({ direction, disabled, onClick }: StepProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      disabled={disabled}
      onClick={onClick}
      aria-label={direction === "next" ? "Suivant" : "Précédent"}
      className={cn(
        ROUND_BUTTON_CLASS,
        "absolute top-1/2 -translate-y-1/2 transition-opacity disabled:opacity-0 pointer-coarse:sr-only",
        direction === "next" ? "right-3" : "left-3"
      )}
    >
      <HugeiconsIcon icon={direction === "next" ? ArrowRight01Icon : ArrowLeft01Icon} size={20} strokeWidth={2} />
    </Button>
  )
}
