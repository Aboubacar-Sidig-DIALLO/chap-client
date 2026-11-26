import { cn } from "@/lib/utils"

/** Touche de clavier (ex. « Ctrl K »), purement indicative. */
export function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      aria-hidden
      className={cn(
        "inline-flex h-6 items-center rounded-md border bg-muted/60 px-1.5 font-sans text-[11px] font-medium text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}
