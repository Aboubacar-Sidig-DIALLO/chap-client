"use client"

import { Tick02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Menu as MenuPrimitive } from "@animate-ui/react/primitives/base-ui/menu"
import { cn } from "@/lib/utils"

/**
 * Menu d'actions (bouton « … ») : navigation au clavier, fermeture à
 * l'extérieur et retour du focus fournis par Base UI.
 */
function Menu(props: MenuPrimitive.Root.Props) {
  return <MenuPrimitive.Root data-slot="menu" {...props} />
}

function MenuTrigger(props: MenuPrimitive.Trigger.Props) {
  return <MenuPrimitive.Trigger data-slot="menu-trigger" {...props} />
}

function MenuContent({
  className,
  side = "bottom",
  align = "end",
  sideOffset = 6,
  ...props
}: MenuPrimitive.Popup.Props & Pick<MenuPrimitive.Positioner.Props, "side" | "align" | "sideOffset">) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner side={side} align={align} sideOffset={sideOffset} className="z-50">
        <MenuPrimitive.Popup
          data-slot="menu-content"
          className={cn(
            "min-w-52 origin-(--transform-origin) rounded-xl border bg-popover p-1 text-sm text-popover-foreground shadow-lg outline-none",
            className
          )}
          {...props}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  )
}

interface MenuItemProps extends MenuPrimitive.Item.Props {
  /** `destructive` pour ce qui supprime ou suspend. */
  tone?: "default" | "destructive"
}

function MenuItem({ className, tone = "default", ...props }: MenuItemProps) {
  return (
    <MenuPrimitive.Item
      data-slot="menu-item"
      className={cn(
        "flex min-h-9 cursor-default items-center gap-2.5 rounded-lg px-2.5 py-1.5 outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-muted [&_svg]:size-4 [&_svg]:shrink-0",
        tone === "destructive"
          ? "text-destructive data-highlighted:bg-destructive/10 [&_svg]:text-destructive"
          : "[&_svg]:text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

/** Choix unique (ex. un tri) : `value` et `onValueChange` sur le groupe. */
function MenuRadioGroup(props: MenuPrimitive.RadioGroup.Props) {
  return <MenuPrimitive.RadioGroup data-slot="menu-radio-group" {...props} />
}

/** Option d'un choix unique : coche à droite quand elle est choisie ; le menu se ferme au choix. */
function MenuRadioItem({ className, children, ...props }: MenuPrimitive.RadioItem.Props) {
  return (
    <MenuPrimitive.RadioItem
      data-slot="menu-radio-item"
      closeOnClick
      className={cn(
        "flex min-h-9 cursor-default items-center gap-2.5 rounded-lg px-2.5 py-1.5 outline-none select-none data-checked:font-medium data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-muted [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground",
        className
      )}
      {...props}
    >
      {children}
      <MenuPrimitive.RadioItemIndicator className="ml-auto flex">
        <HugeiconsIcon icon={Tick02Icon} strokeWidth={2.5} className="text-foreground!" />
      </MenuPrimitive.RadioItemIndicator>
    </MenuPrimitive.RadioItem>
  )
}

function MenuSeparator({ className, ...props }: MenuPrimitive.Separator.Props) {
  return <MenuPrimitive.Separator className={cn("-mx-1 my-1 h-px bg-border", className)} {...props} />
}

function MenuGroupLabel({ className, ...props }: MenuPrimitive.GroupLabel.Props) {
  return (
    <MenuPrimitive.GroupLabel
      className={cn("px-2.5 pt-1.5 pb-1 text-xs font-medium text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Menu,
  MenuContent,
  MenuGroupLabel,
  MenuItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuTrigger,
}
export const MenuGroup = MenuPrimitive.Group
