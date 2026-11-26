import type { Metadata } from "next"
import { ProfilePage } from "@/features/profile/components/profile-screen"

export const metadata: Metadata = { title: "Profil" }

export default function Profile() {
  return <ProfilePage />
}
