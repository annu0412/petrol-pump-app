export const dynamic = 'force-dynamic'

import { getUserContext } from '@/lib/tenant'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { fmtInr } from '@/lib/calculations'
import { Banknote, AlertCircle, Users, Fuel } from 'lucide-react'
import RecentDaysTable from '@/components/RecentDaysTable'
import ExpenseStat from '@/components/ExpenseStat'

export default async function DashboardPage() {
  const ctx = await getUserContext()
  const supabase = await createServerSupabaseClient()
  const today = new Date().toISOString().slice(0, 10)

  // Fetch summary and recent summaries in parallel
  const [{ data: summary }, { data: recentSummaries }] = await Promise.all([
    supabase.from('daily_summaries').select('*').eq('org_id', ctx.orgId).eq('date', today).single(),
    supabase.from('daily_summaries').select('*').eq('org_id', ctx.orgId).order('date', { ascending: false }).limit(5),
  ])

  // Fetch credit outstanding per customer (top 5)
  const { data: creditRows } = await supabase
    .from('credit_entries')
    .select('customer_id, amount, entry_type, customers(name)')
    .eq('org_id', ctx.orgId)

  // Build customer balances
  const balMap: Record<string, { name: string; balance: number }> = {}
  for (const r of creditRows ?? []) {
    const c = r.customers as any
    if (!balMap[r.customer_id]) balMap[r.customer_id] = { name: c?.name ?? '?', balance: 0 }
    if (r.entry_type === 'sale') balMap[r.customer_id].balance += parseFloat(r.amount)
    else balMap[r.customer_id].balance -= parseFloat(r.amount)
  }
  const topBalances = Object.values(balMap)
    .filter(b => b.balance > 0)
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 5)

  const totalOutstanding = Object.values(balMap).reduce((s, b) => s + Math.max(0, b.balance), 0)

  return (
    <div className="fade-up">
      <div className="page-title">Dashboard</div>
      <div className="page-sub">
        {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="stat-card border-t-[#003087]">
          <Fuel size={20} className="absolute right-3 top-3 text-blue-100" />
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Today's Sale</div>
          <div className="font-display text-xl font-bold text-[#003087]">
            {summary ? fmtInr(summary.total_sale_inr) : '–'}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">{summary ? 'Recorded' : 'No entry yet'}</div>
        </div>

        <div className="stat-card border-t-[#00875a]">
          <Banknote size={20} className="absolute right-3 top-3 text-emerald-100" />
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Cash In Hand</div>
          <div className="font-display text-xl font-bold text-emerald-700">
            {summary ? fmtInr(summary.cash_in_hand) : (recentSummaries?.[0] ? fmtInr(recentSummaries[0].cash_in_hand) : '–')}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">as of latest entry</div>
        </div>

        <ExpenseStat />

        <div className="stat-card border-t-[#de350b]">
          <AlertCircle size={20} className="absolute right-3 top-3 text-red-100" />
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Outstanding</div>
          <div className="font-display text-xl font-bold text-red-700">{fmtInr(totalOutstanding)}</div>
          <div className="text-xs text-gray-400 mt-0.5">credit balance</div>
        </div>
      </div>

      {/* RECENT ENTRIES */}
      <RecentDaysTable
        initialSummaries={recentSummaries ?? []}
        orgId={ctx.orgId}
        isOwner={ctx.role === 'owner'}
      />

      {/* TOP OUTSTANDING */}
      {topBalances.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="font-display font-bold text-[#003087] text-base flex items-center gap-2">
              <Users size={16} /> Top Outstanding
            </span>
            <a href="/credit" className="text-xs text-blue-600 hover:underline">View ledger →</a>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Customer</th><th>Balance</th></tr></thead>
              <tbody>
                {topBalances.map((b, i) => (
                  <tr key={i}>
                    <td className="font-medium">{b.name}</td>
                    <td className="num font-bold text-red-700">{fmtInr(b.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* QUICK ACTIONS (mobile-friendly) */}
      <div className="grid grid-cols-3 gap-2 mt-4">
        {[
          { href: '/master',  label: 'Master Entry', color: '#003087', emoji: '📋' },
          { href: '/expense', label: 'Add Expense',  color: '#ff8b00', emoji: '💸' },
          { href: '/credit',  label: 'Credit Entry', color: '#de350b', emoji: '🏦' },
        ].map(a => (
          <a key={a.href} href={a.href}
             className="card flex flex-col items-center justify-center py-4 gap-1.5 hover:shadow-md transition-shadow active:scale-95">
            <span className="text-2xl">{a.emoji}</span>
            <span className="text-xs font-semibold text-center" style={{color: a.color}}>{a.label}</span>
          </a>
        ))}
      </div>
    </div>
  )
}
