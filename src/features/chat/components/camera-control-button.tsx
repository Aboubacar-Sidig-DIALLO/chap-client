import { cn } from "@/lib/utils"

/** Bouton rond translucide, lisible par-dessus l'image de la caméra ; il s'enfonce à l'appui (`press`). */
export const cameraControlClass = cn(
  "press grid size-11 shrink-0 place-items-center rounded-full bg-white/15 text-white backdrop-blur-md outline-none",
  "hover:bg-white/25 focus-visible:ring-2 focus-visible:ring-white/60",
  "disabled:pointer-events-none disabled:opacity-40",
  "aria-pressed:bg-white aria-pressed:text-black"
)

export function CameraControlButton({
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button type="button" className={cn(cameraControlClass, className)} {...props} />
  )
}
