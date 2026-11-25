/** Pastille du nombre de messages non lus ; rien s'il n'y en a pas. */
export function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-voice px-1.5 text-xs font-semibold text-voice-foreground tabular-nums">
      {count > 99 ? "99+" : count}
      <span className="sr-only"> nouveau{count > 1 ? "x" : ""} message{count > 1 ? "s" : ""}</span>
    </span>
  )
}
