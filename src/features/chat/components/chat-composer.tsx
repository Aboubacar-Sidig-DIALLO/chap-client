"use client"

import { useRef, useState } from "react"
import { LockIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { AnimatePresence, LayoutGroup, motion } from "motion/react"
import { AnimateIcon } from "@animate-ui/react/icons"
import { ScrollFade } from "@animate-ui/react/primitives/effects/scroll-fade"
import {
  blur,
  ReducedMotionConfig,
  scale,
  spring,
  transition,
  useTempoTransition,
} from "@animate-ui/react/utils/motion"
import { ArrowUp02 } from "@/components/animate-ui/icons/hugeicons/arrow-up-02"
import { Attachment01 } from "@/components/animate-ui/icons/hugeicons/attachment-01"
import { Mic } from "@/components/animate-ui/icons/hugeicons/mic"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { AttachmentDrafts } from "../hooks/use-attachment-drafts"
import { useElementHeight } from "@/hooks/use-element-height"
import { useIsTouchDevice } from "../hooks/use-media-query"
import { COMPOSER_LAYOUT_IDS } from "../lib/composer-layout"
import type { Attachment, SendOptions } from "../types"
import { AttachmentDraftList } from "./attachment-draft-list"
import { EmojiPickerButton } from "./emoji-picker-button"
import { SelfieDialog } from "./selfie-dialog"
import { ViewOnceIcon, ViewOnceToggle } from "./view-once-icon"
import { VoiceDock } from "./voice-dock"

/** Cibles tactiles de 40 px sur mobile, plus compactes à la souris. */
const ICON_BUTTON_CLASS = "size-10 sm:size-9"

interface ChatComposerProps {
  onSend: (content: string, attachments: Attachment[], options?: SendOptions) => void
  onTyping?: () => void
  /** Prévient les autres participants qu'un vocal s'enregistre. */
  onRecordingChange?: (isRecording: boolean) => void
  /** Pièces jointes en cours, gérées par le parent (qui accepte aussi le glisser-déposer). */
  attachments: AttachmentDrafts
  disabled?: boolean
  /**
   * Ce que l'utilisateur ne peut pas envoyer dans ce groupe, avec la raison
   * en clair : l'écrit (texte, fichiers, selfie) ou les vocaux.
   */
  restrictions?: { write: string | null; voice: string | null }
}

const NO_RESTRICTIONS = { write: null, voice: null }

/**
 * Compositeur « la voix d'abord » : au repos, le dock vocal et son orbe ; le
 * clavier s'ouvre à la demande et rend la main à la voix dès qu'il n'y a plus
 * rien à envoyer.
 *
 * Le passage d'un mode à l'autre est une seule transformation, sans saut : la
 * hauteur suit en douceur, le fond de la barre apparaît en fondu, l'orbe se
 * rétracte en bouton d'envoi et les boutons de pièce jointe glissent à leur
 * nouvelle place.
 */
export function ChatComposer({
  onSend,
  onTyping,
  onRecordingChange,
  attachments,
  disabled,
  restrictions = NO_RESTRICTIONS,
}: ChatComposerProps) {
  const [value, setValue] = useState("")
  /** Incrémenté à chaque envoi (clic ou Entrée) pour faire s'envoler la flèche. */
  const [sentCount, setSentCount] = useState(0)
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false)
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false)
  /** Vue unique armée : le prochain vocal, photo, vidéo ou fichier ne s'ouvrira qu'une fois. */
  const [isViewOnce, setIsViewOnce] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isTouchDevice = useIsTouchDevice()
  const [contentRef, contentHeight] = useElementHeight<HTMLDivElement>()
  const swap = useTempoTransition(transition.swap)
  const fade = useTempoTransition(transition.fade)
  const resize = useTempoTransition(spring.height)
  const morph = useTempoTransition(spring.morph)

  const hasContent = value.trim().length > 0 || attachments.attachments.length > 0
  const canSend =
    !disabled && hasContent && !attachments.isUploading && !attachments.hasFailures
  const canWrite = restrictions.write === null
  const canSendVoice = restrictions.voice === null
  // Le texte prend la place de la voix tant qu'il y a quelque chose en cours d'écriture
  // (le panneau d'emojis prend le focus hors du champ : il garde aussi le mode texte).
  // Une seule des deux permise : elle seule s'affiche.
  const view = !canSendVoice
    ? "text"
    : !canWrite
      ? "voice"
      : isKeyboardOpen ||
          isEmojiPickerOpen ||
          value.length > 0 ||
          attachments.drafts.length > 0
        ? "text"
        : "voice"

  /** Insère l'emoji à la place du curseur (ou de la sélection), et place le curseur après. */
  function insertEmoji(emoji: string) {
    const textarea = textareaRef.current
    const start = textarea?.selectionStart ?? value.length
    const end = textarea?.selectionEnd ?? value.length
    const caret = start + emoji.length

    setValue(value.slice(0, start) + emoji + value.slice(end))
    onTyping?.()
    requestAnimationFrame(() => textarea?.setSelectionRange(caret, caret))
  }

  function handleEmojiPickerOpenChange(open: boolean) {
    setIsEmojiPickerOpen(open)
    // À la fermeture, le focus revient au champ : on reste en mode texte.
    if (!open) setIsKeyboardOpen(true)
  }

  /**
   * Tout envoi passe par ici (texte, fichiers, vocal, selfie). Vue unique
   * armée : elle s'applique aux pièces jointes (un éventuel texte part à
   * côté, normalement), puis se désarme.
   */
  function send(content: string, files: Attachment[], options: SendOptions = {}) {
    if (!isViewOnce || files.length === 0) {
      onSend(content, files, options)
      return
    }
    if (content) onSend(content, [])
    onSend("", files, { ...options, viewOnce: true })
    setIsViewOnce(false)
  }

  function submit() {
    if (!canSend) return

    send(value.trim(), attachments.attachments)
    setSentCount((count) => count + 1)
    setValue("")
    attachments.clear()
    // On reste en mode texte pour enchaîner ; sur mobile, garder le focus évite
    // que le clavier se ferme puis se rouvre.
    setIsKeyboardOpen(true)
    textareaRef.current?.focus()
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Au clavier physique : Entrée envoie, Maj + Entrée insère un saut de ligne.
    // Sur écran tactile (pas de touche Maj), Entrée insère un saut de ligne et
    // l'envoi se fait par le bouton, comme dans les messageries mobiles.
    // `isComposing` évite d'envoyer pendant une saisie IME (accents, emoji…).
    if (
      !isTouchDevice &&
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault()
      submit()
    }
  }

  function handlePaste(event: React.ClipboardEvent<HTMLTextAreaElement>) {
    const { files, types } = event.clipboardData
    // Un copier depuis un traitement de texte contient aussi une image du texte :
    // dans ce cas, on garde le comportement normal (coller le texte).
    if (files.length === 0 || types.includes("text/plain")) return

    event.preventDefault()
    attachments.addFiles(files)
  }

  // Ni écrit ni vocal : à la place de la saisie, la raison.
  if (!canWrite && !canSendVoice) return <RestrictedComposer notice={restrictions.write} />

  // Fichiers et selfie comptent comme de l'écrit. Présents dans les deux modes,
  // ils glissent d'une place à l'autre (même `layoutId`).
  const attachButtons = canWrite && (
    <motion.div layoutId={COMPOSER_LAYOUT_IDS.attachments} transition={morph} className="flex items-center gap-0.5 sm:gap-1">
      <AnimateIcon animateOnHover animateOnTap asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled || !attachments.canAddMore}
          aria-label="Joindre des fichiers"
          onClick={() => fileInputRef.current?.click()}
          className={cn(ICON_BUTTON_CLASS, "text-muted-foreground")}
        >
          <Attachment01 size={18} />
        </Button>
      </AnimateIcon>
      <SelfieDialog
        onSend={send}
        disabled={disabled}
        className={cn(ICON_BUTTON_CLASS, "text-muted-foreground")}
      />
    </motion.div>
  )

  // Vaut pour un vocal comme pour des fichiers : au repos, toujours là ;
  // en mode texte, seulement quand des fichiers attendent.
  const viewOnceToggle = (
    <ViewOnceToggle
      pressed={isViewOnce}
      onPressedChange={setIsViewOnce}
      disabled={disabled}
      className={ICON_BUTTON_CLASS}
    />
  )

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
      // En mode vocal, la barre se fond dans la page : l'orbe flotte au-dessus.
      className="relative isolate bg-linear-to-t from-background via-background to-background/0 px-2 pt-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-4 sm:pb-3 md:px-(--reading-gutter) md:pb-4"
    >
      {/* Unique, hors des boutons (présents en double le temps d'une transition). */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        hidden
        tabIndex={-1}
        onChange={(event) => {
          attachments.addFiles(event.target.files ?? [])
          // Permet de sélectionner à nouveau le même fichier.
          event.target.value = ""
        }}
      />

      <ReducedMotionConfig>
        {/* En mode texte, la barre devient pleine et bordée : en fondu, sans saut. */}
        <motion.div
          aria-hidden
          initial={false}
          animate={{ opacity: view === "text" ? 1 : 0 }}
          transition={fade}
          className="absolute inset-0 -z-10 border-t bg-background"
        />

        {/* La hauteur suit le mode affiché (et le texte qui s'allonge), en douceur. */}
        <motion.div initial={false} animate={{ height: contentHeight ?? "auto" }} transition={resize}>
          <div ref={contentRef} className="relative">
            <LayoutGroup id="composer">
              <AnimatePresence mode="popLayout" initial={false}>
                {view === "voice" ? (
                  <motion.div
                    key="voice"
                    initial={{ opacity: 0, filter: blur.icon }}
                    animate={{ opacity: 1, filter: "blur(0px)", transition: swap }}
                    exit={{ opacity: 0, filter: blur.icon, transition: swap }}
                  >
                    <VoiceDock
                      onSend={send}
                      onRecordingChange={onRecordingChange}
                      onOpenKeyboard={canWrite ? () => setIsKeyboardOpen(true) : undefined}
                      leading={
                        <>
                          {attachButtons}
                          {viewOnceToggle}
                        </>
                      }
                      isViewOnce={isViewOnce}
                      disabled={disabled}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="text"
                    // Le champ se déploie légèrement depuis le bas, là où était l'orbe.
                    initial={{ opacity: 0, y: 8, filter: blur.icon }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)", transition: { ...morph, opacity: swap, filter: swap } }}
                    exit={{ opacity: 0, filter: blur.icon, transition: swap }}
                    className="flex flex-col rounded-3xl border bg-input/30 transition-[border-color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50"
                  >
                    <AttachmentDraftList
                      drafts={attachments.drafts}
                      notice={attachments.notice}
                      onRemove={attachments.removeDraft}
                      onRetry={attachments.retryDraft}
                    />

                    <div className="flex items-end gap-0.5 p-1 sm:gap-1 sm:p-1.5">
                      {attachButtons}
                      {attachments.drafts.length > 0 && viewOnceToggle}
                      <EmojiPickerButton
                        open={isEmojiPickerOpen}
                        onOpenChange={handleEmojiPickerOpenChange}
                        onSelect={insertEmoji}
                        finalFocus={textareaRef}
                        disabled={disabled}
                        className={ICON_BUTTON_CLASS}
                      />

                      {/* Long message : les bords du champ s'estompent au lieu d'une barre de défilement. */}
                      <ScrollFade asChild size={16} shrink={0} blur={0}>
                        <Textarea
                          ref={textareaRef}
                          value={value}
                          rows={1}
                          disabled={disabled}
                          autoFocus={isKeyboardOpen}
                          aria-label="Message"
                          placeholder={disabled ? "Connexion perdue…" : "Message"}
                          enterKeyHint={isTouchDevice ? "enter" : "send"}
                          autoCapitalize="sentences"
                          onChange={(event) => {
                            setValue(event.target.value)
                            onTyping?.()
                          }}
                          // Quitter le champ (ailleurs que dans le compositeur) rend la main à la voix.
                          onBlur={(event) => {
                            if (!event.currentTarget.form?.contains(event.relatedTarget)) {
                              setIsKeyboardOpen(false)
                            }
                          }}
                          onKeyDown={handleKeyDown}
                          onPaste={handlePaste}
                          className="max-h-40 min-h-0 flex-1 self-center rounded-none border-0 bg-transparent px-1 py-1.5 focus-visible:ring-0 dark:bg-transparent"
                        />
                      </ScrollFade>

                      <SendButton
                        hasContent={hasContent}
                        canSend={canSend}
                        disabled={disabled}
                        isUploading={attachments.isUploading}
                        canSendVoice={canSendVoice}
                        sentCount={sentCount}
                        onBackToVoice={() => setIsKeyboardOpen(false)}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </LayoutGroup>
          </div>
        </motion.div>
      </ReducedMotionConfig>

      <ComposerHint
        view={view}
        isViewOnce={isViewOnce}
        hasFailures={attachments.hasFailures}
        notice={restrictions.write ?? restrictions.voice}
      />
    </form>
  )
}

interface SendButtonProps {
  hasContent: boolean
  canSend: boolean
  disabled?: boolean
  isUploading: boolean
  /** Sans droit aux vocaux, le bouton reste une flèche d'envoi. */
  canSendVoice: boolean
  sentCount: number
  /** Champ vide : le bouton ramène au dock vocal. */
  onBackToVoice: () => void
}

function SendButton({
  hasContent,
  canSend,
  disabled,
  isUploading,
  canSendVoice,
  sentCount,
  onBackToVoice,
}: SendButtonProps) {
  const showMic = canSendVoice && !hasContent && !isUploading
  const morph = useTempoTransition(spring.morph)

  // Même `layoutId` que l'orbe du dock vocal : l'un devient l'autre.
  return (
    <motion.div layoutId={COMPOSER_LAYOUT_IDS.primary} transition={morph} className="shrink-0 rounded-full">
      <Button
        type={showMic ? "button" : "submit"}
        size="icon"
        disabled={showMic ? disabled : !canSend}
        onClick={showMic ? onBackToVoice : undefined}
        className={ICON_BUTTON_CLASS}
        aria-label={
          showMic
            ? "Revenir au message vocal"
            : isUploading
              ? "Envoi des fichiers en cours…"
              : "Envoyer le message"
        }
      >
        <SendIcon
          mode={isUploading ? "uploading" : showMic ? "mic" : "send"}
          sentCount={sentCount}
        />
      </Button>
    </motion.div>
  )
}

/** Le propriétaire du groupe ne vous laisse rien envoyer : la raison, à la place de la saisie. */
function RestrictedComposer({ notice }: { notice: string | null }) {
  return (
    <div className="border-t bg-background px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-(--reading-gutter) md:pb-4">
      <p
        role="status"
        className="flex min-h-12 items-center justify-center gap-2 rounded-3xl bg-muted px-4 py-3 text-center text-sm text-muted-foreground"
      >
        <HugeiconsIcon icon={LockIcon} size={16} strokeWidth={2} aria-hidden className="shrink-0" />
        {notice}
      </p>
    </div>
  )
}

/**
 * Aide contextuelle, utile avec un clavier et une souris ; en cas d'échec ou
 * de restriction, l'explication, visible partout.
 */
function ComposerHint({
  view,
  isViewOnce,
  hasFailures,
  notice,
}: {
  view: "voice" | "text"
  /** Vue unique armée : on rappelle ce qu'elle fera. */
  isViewOnce: boolean
  hasFailures: boolean
  /** Ce que vous ne pouvez pas envoyer ici, et pourquoi. */
  notice: string | null
}) {
  const swap = useTempoTransition(transition.swap)
  const kbd = "font-sans font-medium"

  // Une seule consigne à la fois, choisie par ordre d'importance.
  const hint = hasFailures
    ? {
        key: "failures",
        role: "alert",
        className: "text-xs text-destructive sm:text-[11px]",
        content: "Réessayez ou retirez les fichiers en échec pour envoyer le message.",
      }
    : isViewOnce
      ? {
          key: "view-once",
          role: "status",
          className: "flex items-center justify-center gap-1.5 text-xs text-read sm:text-[11px]",
          content: (
            <>
              <ViewOnceIcon size={12} />
              Vue unique · le prochain envoi s&apos;effacera dès qu&apos;il aura été ouvert
            </>
          ),
        }
      : notice
      ? {
          key: "notice",
          role: "status",
          className: "flex items-center justify-center gap-1.5 text-xs text-muted-foreground sm:text-[11px]",
          content: (
            <>
              <HugeiconsIcon icon={LockIcon} size={12} strokeWidth={2} aria-hidden className="shrink-0" />
              {notice}
            </>
          ),
        }
      : {
          key: view,
          role: undefined,
          // Utile au clavier et à la souris seulement.
          className: "hidden text-[11px] text-muted-foreground pointer-fine:block",
          content:
            view === "text" ? (
              <>
                <kbd className={kbd}>Entrée</kbd> pour envoyer ·{" "}
                <kbd className={kbd}>Maj + Entrée</kbd> pour un saut de ligne · glissez ou
                collez des fichiers pour les joindre
              </>
            ) : (
              <>
                Maintenez le micro pour parler (en direct si quelqu&apos;un est là), relâchez pour
                envoyer · glissez vers le haut pour verrouiller, vers la gauche pour annuler ·{" "}
                <kbd className={kbd}>Échap</kbd> annule
              </>
            ),
        }

  return (
    // Les deux consignes partagent la même case le temps du fondu : rien ne bouge autour.
    <div className="grid px-3 text-center sm:px-4">
      <AnimatePresence initial={false}>
        <motion.p
          key={hint.key}
          role={hint.role}
          initial={{ opacity: 0, filter: blur.icon }}
          animate={{ opacity: 1, filter: "blur(0px)", transition: swap }}
          exit={{ opacity: 0, filter: blur.icon, transition: swap }}
          className={cn("col-start-1 row-start-1 mt-2", hint.className)}
        >
          {hint.content}
        </motion.p>
      </AnimatePresence>
    </div>
  )
}

interface SendIconProps {
  mode: "send" | "mic" | "uploading"
  sentCount: number
}

/**
 * Micro ↔ flèche d'envoi ↔ chargement, échangés sur place (Animate UI, `recipes/swap.md`).
 * À chaque envoi, la flèche s'envole puis revient par le bas (animation « out »).
 */
function SendIcon({ mode, sentCount }: SendIconProps) {
  const swap = useTempoTransition(transition.swap)

  return (
    <span className="relative inline-flex">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={mode}
          className="inline-flex"
          initial={{ opacity: 0, scale: scale.icon, filter: blur.icon }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)", transition: swap }}
          exit={{ opacity: 0, scale: scale.icon, filter: blur.icon, transition: swap }}
        >
          {mode === "uploading" && <Spinner size={18} />}
          {mode === "mic" && <Mic size={18} animateOnHover animateOnTap />}
          {mode === "send" && (
            // Remonté à chaque envoi : l'animation « out » se rejoue.
            <ArrowUp02 key={sentCount} size={18} animate={sentCount > 0 ? "out" : false} />
          )}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}
