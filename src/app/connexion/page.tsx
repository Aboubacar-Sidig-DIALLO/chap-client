import type { Metadata } from "next"
import { AuthPage } from "@/features/auth/components/auth-page"

export const metadata: Metadata = { title: "Connexion" }

export default function SignInPage() {
  return <AuthPage mode="sign-in" />
}
