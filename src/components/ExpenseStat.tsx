'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { fmtInr } from '@/lib/calculations'
import { Receipt } from 'lucide-react'

export default function ExpenseStat() {
  const [supabase] = useState(() => createClient())
  const [amount, setAmount] = useState<number | null>(null)
  const [date, setDate] = useState<string | null>(null)
  const today = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: member } = await supabase
        .from('org_members')
        .select('org_id')
        .eq('user_id', user.id)
        .single()
      if (!member) return

      const { data: rows } = await supabase
        .from('expenses')
        .select('date, amount')
        .eq('org_id', member.org_id)
        .order('date', { ascending: false })
        .limit(50)

      if (!rows || rows.length === 0) { setAmount(0); return }

      const latestDate = rows[0].date
      const total = rows
        .filter(e => e.date === latestDate)
        .reduce((s, e) => s + parseFloat(e.amount), 0)

      setDate(latestDate)
      setAmount(total)
    }
    load()
  }, [])

  return (
    <div className="stat-card border-t-[#ff8b00]">
      <Receipt size={20} className="absolute right-3 top-3 text-amber-100" />
      <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
        {date === today ? "Today's Expenses" : "Latest Expenses"}
      </div>
      <div className="font-display text-xl font-bold text-amber-700">
        {amount === null ? '–' : fmtInr(amount)}
      </div>
      <div className="text-xs text-gray-400 mt-0.5">
        {!date
          ? '–'
          : date === today
            ? 'today'
            : `on ${new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
      </div>
    </div>
  )
}
