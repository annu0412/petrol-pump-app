import { getUserContext } from '@/lib/tenant'
import AppShell from '@/components/layout/AppShell'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getUserContext()
  return <AppShell ctx={ctx}>{children}</AppShell>
}
