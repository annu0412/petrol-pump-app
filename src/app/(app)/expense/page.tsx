'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Expense, EXPENSE_CATEGORIES } from '@/types'
import { fmtInr } from '@/lib/calculations'
import { useRole } from '@/lib/user-context'
import { Trash2, Plus } from 'lucide-react'

export default function ExpensePage() {
  const role = useRole()
  const isOwner = role === 'owner'
  const today = new Date().toISOString().slice(0, 10)

  const [supabase] = useState(() => createClient())
  const [orgId, setOrgId] = useState('')
  const [userId, setUserId] = useState('')
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [filterDate, setFilterDate] = useState(today)

  const [form, setForm] = useState({
    date: today,
    amount: '',
    category: 'Chai',
    comment: '',
  })

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const { data: member } = await supabase.from('org_members').select('org_id').eq('user_id', user.id).single()
      if (!member) return
      setOrgId(member.org_id)
      await fetchExpenses(member.org_id, filterDate)
      setLoading(false)
    }
    init()
  }, [])

  const fetchExpenses = async (oid: string, date: string) => {
    const { data } = await supabase
      .from('expenses')
      .select('*')
      .eq('org_id', oid)
      .eq('date', date)
      .order('created_at', { ascending: false })
    setExpenses(data ?? [])
  }

  const handleDateFilter = async (d: string) => {
    setFilterDate(d)
    if (orgId) await fetchExpenses(orgId, d)
  }

  const handleAdd = async () => {
    if (!form.amount) return
    setSaving(true)
    const { data, error } = await supabase.from('expenses').insert({
      org_id: orgId,
      date: form.date,
      amount: parseFloat(form.amount),
      category: form.category,
      comment: form.comment || null,
      created_by: userId,
    }).select().single()

    if (!error && data) {
      if (form.date === filterDate) setExpenses(prev => [data, ...prev])
      setForm(f => ({ ...f, amount: '', comment: '' }))
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    await supabase.from('expenses').delete().eq('id', id)
    setExpenses(prev => prev.filter(e => e.id !== id))
  }

  const todayTotal = expenses.reduce((s, e) => s + parseFloat(String(e.amount)), 0)

  const CATEGORY_COLORS: Record<string, string> = {
    Chai: '#92400e', 'MS Test': '#1e40af', 'HSD Test': '#1e3a8a',
    DG: '#374151', Petrol: '#065f46', Salary: '#6b21a8',
    'Tanker Inaam': '#9a3412', Others: '#374151',
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="text-gray-400 text-sm">Loading…</div></div>

  return (
    <div className="fade-up">
      <div className="page-title">Expense Entry</div>
      <div className="page-sub">Record all pump operational expenses</div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="stat-card border-t-[#ff8b00]">
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Showing Total</div>
          <div className="font-display text-xl font-bold text-amber-700">{fmtInr(todayTotal)}</div>
          <div className="text-xs text-gray-400">{expenses.length} items on {filterDate}</div>
        </div>
        <div className="stat-card border-t-gray-300">
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Filter Date</div>
          <input className="field-input text-sm mt-1" type="date" value={filterDate}
            onChange={e => handleDateFilter(e.target.value)} />
        </div>
      </div>

      {/* Add Form */}
      <div className="card p-4 mb-4">
        <div className="font-display font-bold text-[#003087] mb-3 flex items-center gap-2">
          <Plus size={16} /> Add Expense
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">Date</label>
            <input className="field-input" type="date" value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              disabled={!isOwner} />
          </div>
          <div>
            <label className="field-label">Amount (₹)</label>
            <input className="field-input" type="number" placeholder="0" value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleAdd()} />
          </div>
          <div>
            <label className="field-label">Category</label>
            <select className="field-input" value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label">Comment</label>
            <input className="field-input" type="text" placeholder="Optional note" value={form.comment}
              onChange={e => setForm(f => ({ ...f, comment: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleAdd()} />
          </div>
        </div>
        <button className="btn-primary w-full justify-center mt-3" onClick={handleAdd}
          disabled={saving || !form.amount || (!isOwner && form.date !== today)}>
          {saving ? 'Adding…' : '+ Add Expense'}
        </button>
      </div>

      {/* Expense List */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 font-display font-bold text-[#003087]">
          Expenses on {filterDate}
        </div>
        {expenses.length === 0 ? (
          <div className="py-10 text-center text-gray-400 text-sm">No expenses for this date</div>
        ) : (
          <div>
            {expenses.map(e => (
              <div key={e.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                     style={{ background: CATEGORY_COLORS[e.category] ?? '#374151' }}>
                  {e.category.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-gray-800">{e.category}</div>
                  {e.comment && <div className="text-xs text-gray-400 truncate">{e.comment}</div>}
                </div>
                <div className="font-mono font-bold text-amber-700 text-sm flex-shrink-0">{fmtInr(parseFloat(String(e.amount)))}</div>
                {isOwner && (
                  <button onClick={() => handleDelete(e.id)}
                    className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
            <div className="flex justify-between items-center px-4 py-3 bg-amber-50 border-t border-amber-100">
              <span className="font-semibold text-sm text-amber-800">Total ({expenses.length} items)</span>
              <span className="font-mono font-bold text-amber-800">{fmtInr(todayTotal)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
