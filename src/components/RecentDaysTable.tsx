'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { DailySummary } from '@/types'
import { fmtInr } from '@/lib/calculations'
import { TrendingUp, Trash2 } from 'lucide-react'

interface Props {
  initialSummaries: DailySummary[]
  orgId: string
  isOwner: boolean
}

export default function RecentDaysTable({ initialSummaries, orgId, isOwner }: Props) {
  const [supabase] = useState(() => createClient())
  const [summaries, setSummaries] = useState<DailySummary[]>(initialSummaries)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmDate, setConfirmDate] = useState<string | null>(null)
  const [expTotals, setExpTotals] = useState<Record<string, number>>({})

  useEffect(() => {
    const loadExpenses = async () => {
      if (summaries.length === 0) return
      const dates = summaries.map(s => s.date)
      const { data } = await supabase
        .from('expenses')
        .select('date, amount')
        .eq('org_id', orgId)
        .in('date', dates)
      if (!data) return
      const totals: Record<string, number> = {}
      for (const r of data) {
        totals[r.date] = (totals[r.date] ?? 0) + parseFloat(r.amount)
      }
      setExpTotals(totals)
    }
    loadExpenses()
  }, [summaries])

  const handleConfirmDelete = async (date: string) => {
    setDeleting(date)
    setConfirmDate(null)
    await supabase.from('master_entries').delete().eq('org_id', orgId).eq('date', date)
    await supabase.from('daily_summaries').delete().eq('org_id', orgId).eq('date', date)
    setSummaries(prev => prev.filter(s => s.date !== date))
    setDeleting(null)
  }

  return (
    <div className="card mb-4">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <span className="font-display font-bold text-[#003087] text-base flex items-center gap-2">
          <TrendingUp size={16} /> Recent Days
        </span>
        <a href="/history" className="text-xs text-blue-600 hover:underline">View all →</a>
      </div>
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Total Sale</th>
              <th>Expenses</th>
              <th>Cash In Hand</th>
              {isOwner && <th></th>}
            </tr>
          </thead>
          <tbody>
            {summaries.length === 0 && (
              <tr>
                <td colSpan={isOwner ? 5 : 4} className="text-center py-6 text-gray-400 text-sm">
                  No entries yet — start with Master Entry
                </td>
              </tr>
            )}
            {summaries.map(s => (
              <tr key={s.id} className={deleting === s.date ? 'opacity-40' : ''}>
                <td className="font-medium">
                  {new Date(s.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </td>
                <td className="num font-semibold text-[#003087]">{fmtInr(s.total_sale_inr)}</td>
                <td className="num text-amber-700">{fmtInr(expTotals[s.date] ?? s.total_expense)}</td>
                <td className="num font-bold text-emerald-700">{fmtInr(s.cash_in_hand)}</td>
                {isOwner && (
                  <td className="text-right pr-3">
                    {confirmDate === s.date ? (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleConfirmDelete(s.date)}
                          className="text-[10px] px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600 transition-colors font-semibold">
                          Delete
                        </button>
                        <button
                          onClick={() => setConfirmDate(null)}
                          className="text-[10px] px-2 py-1 rounded bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDate(s.date)}
                        disabled={deleting !== null}
                        className="p-1.5 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
