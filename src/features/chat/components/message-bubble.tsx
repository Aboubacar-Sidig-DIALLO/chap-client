import { cn } from "@/lib/utils"
import type { MessageStatus } from "../types"

interface MessageBubbleProps extends React.ComponentProps<"div"> {
  isOwn: boolean
  status?: MessageStatus
}

export function MessageBubble({
  isOwn,
  status,
  className,
  ...props
}: MessageBubbleProps) {
  return (
    <div
      data-slot="message-bubble"
      data-variant={isOwn ? "own" : "other"}
      data-status={status}
      className={cn(
        // 15 px sur mobile : confort de lecture des messageries natives.
        // Largeur max. relative à la colonne des messages (`@container` du message).
        "w-fit max-w-[85cqw] rounded-2xl px-3.5 py-2 text-[15px] leading-snug whitespace-pre-wrap wrap-break-word sm:max-w-[75cqw] sm:text-sm sm:leading-relaxed",
        // L'entrée est animée par le message (Motion) ; ici, seul le changement de statut.
        "transition-[opacity,background-color,color]",
        "data-[variant=other]:rounded-bl-md data-[variant=other]:bg-muted",
        "data-[variant=own]:rounded-br-md data-[variant=own]:bg-primary data-[variant=own]:text-primary-foreground",
        "data-[status=sending]:opacity-60",
        "data-[status=failed]:bg-destructive/10 data-[status=failed]:text-destructive",
        className
      )}
      {...props}
    />
  )
}
