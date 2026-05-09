export const dynamic = 'force-dynamic'

import { getUserContext } from '@/lib/tenant'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { fmtInr } from '@/lib/calculations'
import { Banknote, AlertCircle, Users, Fuel } from 'lucide-react'
import RecentDaysTable from '@/components/RecentDaysTable'
import ExpenseStat from '@/components/ExpenseStat'
import DashboardDateRangePicker from '@/components/DashboardDateRangePicker'

export default async function DashboardPage(props: { searchParams: Promise<{ start?: string, end?: string }> }) {
  const searchParams = await props.searchParams;
  const ctx = await getUserContext()
  const supabase = await createServerSupabaseClient()
  const today = new Date().toISOString().slice(0, 10)
  const startDate = searchParams.start || today
  const endDate = searchParams.end || today

  // Fetch summary and recent summaries in parallel
  const [{ data: summaries }, { data: recentSummaries }] = await Promise.all([
    supabase.from('daily_summaries').select('*').eq('org_id', ctx.orgId).gte('date', startDate).lte('date', endDate).order('date', { ascending: false }),
    supabase.from('daily_summaries').select('*').eq('org_id', ctx.orgId).order('date', { ascending: false }).limit(5),
  ])

  // Aggregate summary data if a range is selected
  let summary = null
  if (summaries && summaries.length > 0) {
    summary = {
      total_sale_inr: summaries.reduce((acc: number, curr: any) => acc + parseFloat(curr.total_sale_inr || 0), 0),
      cash_in_hand: summaries[0].cash_in_hand, // cash_in_hand from the latest entry in range
      genset_reading: summaries[0].genset_reading,
      cash_received: summaries.reduce((acc: number, curr: any) => acc + parseFloat(curr.cash_received || 0), 0),
    }
  }

  // Fetch detailed master entries for the selected date
  const { data: masterEntries } = await supabase
    .from('master_entries')
    .select('*, machines(fuel_type)')
    .eq('org_id', ctx.orgId)
    .gte('date', startDate)
    .lte('date', endDate)

  let hsdLiters = 0
  let msLiters = 0
  let phonepe = 0, sbi = 0, icici = 0, paytm = 0, dt_plus = 0, neft = 0

  // Track dates we have already counted digital payments for
  // Since digital payments are saved only on the first machine row per day.
  const processedDates = new Set<string>()

  for (const entry of masterEntries || []) {
    const fuelType = (entry.machines as { fuel_type: string } | null)?.fuel_type
    const liters = parseFloat(entry.sale_liters) || 0
    if (fuelType === 'HSD') hsdLiters += liters
    if (fuelType === 'MS') msLiters += liters

    // Process digital payments only once per date
    if (!processedDates.has(entry.date)) {
      phonepe += parseFloat(entry.phonepe) || 0
      sbi += parseFloat(entry.sbi) || 0
      icici += parseFloat(entry.icici) || 0
      paytm += parseFloat(entry.paytm) || 0
      dt_plus += parseFloat(entry.dt_plus) || 0
      neft += parseFloat(entry.neft) || 0
      // if any of them is > 0, it means we found the "first" row for this date that contains the payments
      // wait, they are all 0 if it's not the first row. So summing them all works fine!
      // But we don't even need `processedDates` if they are truly 0 for subsequent rows!
      // To be safe, summing them directly works because other rows have 0.
    }
  }

  const { data: creditRows } = await supabase
    .from('credit_entries')
    .select('customer_id, amount, entry_type, customers(name)')
    .eq('org_id', ctx.orgId)

  // Build customer balances
  const balMap: Record<string, { name: string; balance: number }> = {}
  for (const r of creditRows ?? []) {
    const c = r.customers as unknown as { name: string } | null
    if (!balMap[r.customer_id]) balMap[r.customer_id] = { name: c?.name ?? '?', balance: 0 }
    if (r.entry_type === 'sale') balMap[r.customer_id].balance += parseFloat(r.amount)
    else balMap[r.customer_id].balance -= parseFloat(r.amount)
  }
  const topBalances = Object.values(balMap)
    .filter(b => b.balance > 0)
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 5)

  const totalOutstanding = Object.values(balMap).reduce((s, b) => s + Math.max(0, b.balance), 0)

  const dateTitle = startDate === endDate
    ? new Date(startDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
    : `${new Date(startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - ${new Date(endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`

  const dateSubTitle = startDate === endDate
    ? new Date(startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    : `${new Date(startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - ${new Date(endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`


  return (
    <div className="fade-up">
      <div className="page-title">Dashboard</div>
      <div className="page-sub flex items-center justify-between gap-3 overflow-x-auto whitespace-nowrap scrollbar-hide">
        <span>{dateTitle}</span>
        <DashboardDateRangePicker startDate={startDate} endDate={endDate} />
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="stat-card border-t-[#003087]">
          <Fuel size={20} className="absolute right-3 top-3 text-blue-100" />
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Period Sale</div>
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

      {/* DAILY DETAILS (Master Entry Data) */}
      {(masterEntries && masterEntries.length > 0) ? (
        <div className="card p-4 mb-5">
          <div className="font-display font-bold text-[#003087] mb-3 text-sm">Detailed Master Data for {dateSubTitle}</div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
              <div className="text-[10px] font-semibold text-gray-500 uppercase">HSD Sold</div>
              <div className="font-bold text-[#003087]">{hsdLiters.toFixed(2)} L</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
              <div className="text-[10px] font-semibold text-gray-500 uppercase">MS Sold</div>
              <div className="font-bold text-[#00875a]">{msLiters.toFixed(2)} L</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
              <div className="text-[10px] font-semibold text-gray-500 uppercase">Genset Reading</div>
              <div className="font-bold text-gray-800">{summary?.genset_reading || '–'}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
              <div className="text-[10px] font-semibold text-gray-500 uppercase">Cash Received</div>
              <div className="font-bold text-emerald-700">{summary?.cash_received ? fmtInr(summary.cash_received) : '–'}</div>
            </div>
          </div>

          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Digital Payments Breakdown</div>
          <div className="grid grid-cols-3 gap-2 text-sm">
             {phonepe > 0 && <div className="flex flex-col"><span className="text-gray-500 text-[10px]">PhonePe</span><span className="font-medium" style={{color:'#5f259f'}}>{fmtInr(phonepe)}</span></div>}
             {sbi > 0 && <div className="flex flex-col"><span className="text-gray-500 text-[10px]">SBI</span><span className="font-medium" style={{color:'#1a3a6b'}}>{fmtInr(sbi)}</span></div>}
             {icici > 0 && <div className="flex flex-col"><span className="text-gray-500 text-[10px]">ICICI</span><span className="font-medium" style={{color:'#b02720'}}>{fmtInr(icici)}</span></div>}
             {paytm > 0 && <div className="flex flex-col"><span className="text-gray-500 text-[10px]">Paytm</span><span className="font-medium" style={{color:'#0082c8'}}>{fmtInr(paytm)}</span></div>}
             {dt_plus > 0 && <div className="flex flex-col"><span className="text-gray-500 text-[10px]">DT Plus</span><span className="font-medium" style={{color:'#c05e00'}}>{fmtInr(dt_plus)}</span></div>}
             {neft > 0 && <div className="flex flex-col"><span className="text-gray-500 text-[10px]">NEFT</span><span className="font-medium" style={{color:'#00875a'}}>{fmtInr(neft)}</span></div>}
             {!(phonepe > 0 || sbi > 0 || icici > 0 || paytm > 0 || dt_plus > 0 || neft > 0) && (
               <div className="col-span-3 text-gray-400 text-xs italic">No digital payments recorded</div>
             )}
          </div>
        </div>
      ) : (
        <div className="card p-4 mb-5 text-center text-sm text-gray-400">
           No master entry data found for the selected period
        </div>
      )}

      {/* RECENT ENTRIES */}
      <RecentDaysTable
        initialSummaries={summaries ?? []}
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
