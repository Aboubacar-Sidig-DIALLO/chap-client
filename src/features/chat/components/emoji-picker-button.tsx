"use client"

import { SmileIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { EmojiPicker, type EmojiPickerListComponents } from "frimousse"
import { buttonVariants } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

/** Rendu de la liste, défini une fois pour toutes (des composants stables, jamais remontés). */
const LIST_COMPONENTS: Partial<EmojiPickerListComponents> = {
  CategoryHeader: ({ category, ...props }) => (
    <div {...props} className="bg-popover px-3 pt-2 pb-1 text-xs font-medium text-muted-foreground">
      {category.label}
    </div>
  ),
  Row: ({ children, ...props }) => (
    <div {...props} className="scroll-my-1.5 px-1.5">
      {children}
    </div>
  ),
  Emoji: ({ emoji, ...props }) => (
    <button
      {...props}
      className="grid size-9 place-items-center rounded-lg text-2xl transition-[background-color,scale] duration-150 data-active:scale-110 data-active:bg-accent"
    >
      {emoji.emoji}
    </button>
  ),
}

interface EmojiPickerButtonProps {
  onSelect: (emoji: string) => void
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Reçoit le focus à la fermeture (le champ de saisie). */
  finalFocus: React.RefObject<HTMLElement | null>
  disabled?: boolean
  className?: string
}

/**
 * Bouton emoji du compositeur : un panneau avec recherche en français, par
 * catégories. Il reste ouvert pour en choisir plusieurs d'affilée.
 */
export function EmojiPickerButton({
  onSelect,
  open,
  onOpenChange,
  finalFocus,
  disabled,
  className,
}: EmojiPickerButtonProps) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger
        type="button"
        disabled={disabled}
        aria-label="Ajouter un emoji"
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "text-muted-foreground data-popup-open:bg-muted data-popup-open:text-foreground",
          className
        )}
      >
        <HugeiconsIcon icon={SmileIcon} size={18} strokeWidth={1.8} />
      </PopoverTrigger>

      <PopoverContent side="top" align="start" finalFocus={finalFocus} className="w-auto p-0">
        <EmojiPicker.Root
          locale="fr"
          columns={8}
          onEmojiSelect={({ emoji }) => onSelect(emoji)}
          className="isolate flex h-80 w-[min(19.5rem,calc(100vw-2rem))] flex-col"
        >
          <EmojiPicker.Search
            placeholder="Rechercher un emoji…"
            className="m-2 h-9 rounded-lg bg-muted px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
          />
          <EmojiPicker.Viewport className="relative flex-1 outline-none">
            <EmojiPicker.Loading className="absolute inset-0 grid place-items-center text-muted-foreground">
              <Spinner size={18} />
            </EmojiPicker.Loading>
            <EmojiPicker.Empty className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
              Aucun emoji trouvé
            </EmojiPicker.Empty>
            <EmojiPicker.List className="pb-2 select-none" components={LIST_COMPONENTS} />
          </EmojiPicker.Viewport>
        </EmojiPicker.Root>
      </PopoverContent>
    </Popover>
  )
}
