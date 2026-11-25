import { MessagingShell } from "@/features/social/components/messaging-shell"

/** Amis, groupes et conversations partagent la même coque : la barre latérale reste en place. */
export default function MessagingLayout({ children }: { children: React.ReactNode }) {
  return <MessagingShell>{children}</MessagingShell>
}
