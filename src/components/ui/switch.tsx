"use client"

import { Switch as SwitchPrimitive } from "@animate-ui/react/primitives/base-ui/switch"
import { cn } from "@/lib/utils"

/**
 * Interrupteur (activé / désactivé) : rôle `switch`, clavier (Espace) et
 * glissement du curseur fournis par Base UI et Animate UI.
 */
function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent bg-input p-0.5 outline-none transition-colors",
        "focus-visible:ring-[3px] focus-visible:ring-ring/50 data-checked:bg-foreground data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="block size-4 rounded-full bg-background shadow-sm data-checked:ml-auto" />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
