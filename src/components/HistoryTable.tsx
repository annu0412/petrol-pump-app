'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { DailySummary } from '@/types'
import { fmtInr } from '@/lib/calculations'

interface Props {
  summaries: DailySummary[]
  orgId: string
}

export default function HistoryTable({ summaries, orgId }: Props) {
  const [supabase] = useState(() => createClient())
  const [expTotals, setExpTotals] = useState<Record<string, number>>({})

  useEffect(() => {
    const load = async () => {
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
    load()
  }, [])

  const totalSale = summaries.reduce((s, r) => s + parseFloat(String(r.total_sale_inr ?? 0)), 0)
  const totalExp  = summaries.reduce((s, r) => s + (expTotals[r.date] ?? parseFloat(String(r.total_expense ?? 0))), 0)

  return (
    <>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="stat-card border-t-[#003087]">
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Total Sale (60d)</div>
          <div className="font-display text-xl font-bold text-[#003087]">{fmtInr(totalSale)}</div>
        </div>
        <div className="stat-card border-t-[#ff8b00]">
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Total Expense (60d)</div>
          <div className="font-display text-xl font-bold text-amber-700">{fmtInr(totalExp)}</div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Total Sale</th>
                <th>Digital</th>
                <th>Expense</th>
                <th>Credit</th>
                <th>Cash In Hand</th>
              </tr>
            </thead>
            <tbody>
              {!summaries.length && (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400 text-sm">No entries yet</td></tr>
              )}
              {summaries.map(s => (
                <tr key={s.id}>
                  <td className="font-semibold text-sm">
                    {new Date(s.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                  </td>
                  <td className="num font-semibold text-[#003087]">{fmtInr(s.total_sale_inr)}</td>
                  <td className="num text-blue-600">{fmtInr(s.total_digital)}</td>
                  <td className="num text-amber-700">{fmtInr(expTotals[s.date] ?? s.total_expense)}</td>
                  <td className="num text-red-600">{fmtInr(s.total_credit)}</td>
                  <td className="num font-bold text-emerald-700">{fmtInr(s.cash_in_hand)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
