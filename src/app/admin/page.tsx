import type { Metadata } from "next"
import { AdminPage } from "@/features/admin/components/admin-page"

export const metadata: Metadata = { title: "Administration" }

export default function Admin() {
  return <AdminPage />
}
