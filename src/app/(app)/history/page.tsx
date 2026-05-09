import { getUserContext } from '@/lib/tenant'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import HistoryTable from '@/components/HistoryTable'

export default async function HistoryPage() {
  const ctx = await getUserContext()
  const supabase = await createServerSupabaseClient()

  const { data: summaries } = await supabase
    .from('daily_summaries')
    .select('*')
    .eq('org_id', ctx.orgId)
    .order('date', { ascending: false })
    .limit(60)

  return (
    <div className="fade-up">
      <div className="page-title">History</div>
      <div className="page-sub">Last 60 days of daily entries</div>
      <HistoryTable summaries={summaries ?? []} orgId={ctx.orgId} />
    </div>
  )
}
