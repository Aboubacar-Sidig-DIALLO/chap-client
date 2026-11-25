"use client"

import { useRef, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { AnimateIcon } from "@animate-ui/react/icons"
import { ScrollFade } from "@animate-ui/react/primitives/effects/scroll-fade"
import {
  blur,
  ReducedMotionConfig,
  scale,
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
import { useIsTouchDevice } from "../hooks/use-media-query"
import type { Attachment } from "../types"
import { AttachmentDraftList } from "./attachment-draft-list"
import { EmojiPickerButton } from "./emoji-picker-button"
import { SelfieDialog } from "./selfie-dialog"
import { VoiceDock } from "./voice-dock"

/** Cibles tactiles de 40 px sur mobile, plus compactes à la souris. */
const ICON_BUTTON_CLASS = "size-10 sm:size-9"

interface ChatComposerProps {
  onSend: (content: string, attachments: Attachment[]) => void
  onTyping?: () => void
  /** Prévient les autres participants qu'un vocal s'enregistre. */
  onRecordingChange?: (isRecording: boolean) => void
  /** Pièces jointes en cours, gérées par le parent (qui accepte aussi le glisser-déposer). */
  attachments: AttachmentDrafts
  disabled?: boolean
}

/**
 * Compositeur « la voix d'abord » : au repos, le dock vocal et son orbe ; le
 * clavier s'ouvre à la demande et rend la main à la voix dès qu'il n'y a plus
 * rien à envoyer.
 */
export function ChatComposer({
  onSend,
  onTyping,
  onRecordingChange,
  attachments,
  disabled,
}: ChatComposerProps) {
  const [value, setValue] = useState("")
  /** Incrémenté à chaque envoi (clic ou Entrée) pour faire s'envoler la flèche. */
  const [sentCount, setSentCount] = useState(0)
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false)
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isTouchDevice = useIsTouchDevice()
  const swap = useTempoTransition(transition.swap)

  const hasContent = value.trim().length > 0 || attachments.attachments.length > 0
  const canSend =
    !disabled && hasContent && !attachments.isUploading && !attachments.hasFailures
  // Le texte prend la place de la voix tant qu'il y a quelque chose en cours d'écriture
  // (le panneau d'emojis prend le focus hors du champ : il garde aussi le mode texte).
  const view =
    isKeyboardOpen ||
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

  function submit() {
    if (!canSend) return

    onSend(value.trim(), attachments.attachments)
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

  const attachButtons = (
    <>
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
        onSend={onSend}
        disabled={disabled}
        className={cn(ICON_BUTTON_CLASS, "text-muted-foreground")}
      />
    </>
  )

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
      className={cn(
        "relative px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-4 sm:pb-3",
        // En mode vocal, la barre se fond dans la page : l'orbe flotte au-dessus.
        view === "voice"
          ? "bg-linear-to-t from-background via-background to-background/0 pt-3"
          : "border-t bg-background pt-2 sm:pt-3"
      )}
    >
      <ReducedMotionConfig>
        <AnimatePresence mode="popLayout" initial={false}>
          {view === "voice" ? (
            <motion.div
              key="voice"
              initial={{ opacity: 0, filter: blur.icon }}
              animate={{ opacity: 1, filter: "blur(0px)", transition: swap }}
              exit={{ opacity: 0, filter: blur.icon, transition: swap }}
            >
              <VoiceDock
                onSend={onSend}
                onRecordingChange={onRecordingChange}
                onOpenKeyboard={() => setIsKeyboardOpen(true)}
                leading={attachButtons}
                disabled={disabled}
              />
            </motion.div>
          ) : (
            <motion.div
              key="text"
              initial={{ opacity: 0, filter: blur.icon }}
              animate={{ opacity: 1, filter: "blur(0px)", transition: swap }}
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
                  sentCount={sentCount}
                  onBackToVoice={() => setIsKeyboardOpen(false)}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </ReducedMotionConfig>

      <ComposerHint view={view} hasFailures={attachments.hasFailures} />
    </form>
  )
}

interface SendButtonProps {
  hasContent: boolean
  canSend: boolean
  disabled?: boolean
  isUploading: boolean
  sentCount: number
  /** Champ vide : le bouton ramène au dock vocal. */
  onBackToVoice: () => void
}

function SendButton({
  hasContent,
  canSend,
  disabled,
  isUploading,
  sentCount,
  onBackToVoice,
}: SendButtonProps) {
  const showMic = !hasContent && !isUploading

  return (
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
  )
}

/** Aide contextuelle, utile avec un clavier et une souris (ou en cas d'échec). */
function ComposerHint({
  view,
  hasFailures,
}: {
  view: "voice" | "text"
  hasFailures: boolean
}) {
  if (hasFailures) {
    return (
      <p role="alert" className="mt-1.5 px-3 text-xs text-destructive sm:px-4 sm:text-[11px]">
        Réessayez ou retirez les fichiers en échec pour envoyer le message.
      </p>
    )
  }

  const kbd = "font-sans font-medium"
  return (
    <p className="mt-2 hidden px-4 text-center text-[11px] text-muted-foreground pointer-fine:block">
      {view === "text" ? (
        <>
          <kbd className={kbd}>Entrée</kbd> pour envoyer ·{" "}
          <kbd className={kbd}>Maj + Entrée</kbd> pour un saut de ligne · glissez ou
          collez des fichiers pour les joindre
        </>
      ) : (
        <>
          Maintenez le micro pour parler, relâchez pour envoyer · glissez vers le haut pour
          verrouiller, vers la gauche pour annuler · <kbd className={kbd}>Échap</kbd> annule
        </>
      )}
    </p>
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
