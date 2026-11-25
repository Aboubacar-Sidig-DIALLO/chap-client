import type { Metadata } from "next"
import { ChatApp } from "@/features/chat/components/chat-app"

export const metadata: Metadata = { title: "Salon général" }

export default function SalonPage() {
  return <ChatApp conversation={{ type: "salon" }} />
}
