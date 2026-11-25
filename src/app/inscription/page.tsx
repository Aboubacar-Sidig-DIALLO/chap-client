import type { Metadata } from "next"
import { AuthPage } from "@/features/auth/components/auth-page"

export const metadata: Metadata = { title: "Créer un compte" }

export default function SignUpPage() {
  return <AuthPage mode="sign-up" />
}
