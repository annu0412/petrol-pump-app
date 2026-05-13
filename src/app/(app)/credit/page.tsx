
'use client'
import FuelLoading from '@/components/FuelLoading'
import { useEffect, useState, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Customer, CreditEntry } from '@/types'
import { fmtInr, fmtL, calcCreditAmount } from '@/lib/calculations'
import { useRole } from '@/lib/user-context'
import { Trash2 } from 'lucide-react'

type Tab = 'entry' | 'ledger' | 'summary'

function CreditPageInner() {
  const role = useRole()
  const isOwner = role === 'owner'
  const today = new Date().toISOString().slice(0, 10)

  const searchParams = useSearchParams()
  const queryDate = searchParams.get('date')
  const [supabase] = useState(() => createClient())
  const [orgId, setOrgId] = useState('')
  const [userId, setUserId] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [entries, setEntries] = useState<CreditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<Tab>('entry')
  const [hsdRate, setHsdRate] = useState(87.49)
  const [msRate, setMsRate] = useState(94.44)

  const [isPayment, setIsPayment] = useState(false)
  const [form, setForm] = useState({
    date: queryDate || new Date().toISOString().slice(0, 10),
    customerId: '',
    fuelType: 'HSD',
    liters: '',
    amount: '',
    vehicleNo: '',
    receiptNo: '',
    payMode: 'online',
    defCash: '',
    notes: '',
  })

  const [selectedCustomer, setSelectedCustomer] = useState('all')

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const { data: member } = await supabase.from('org_members')
        .select('org_id, organizations(hsd_rate, ms_rate)')
        .eq('user_id', user.id).single()
      if (!member) return
      const org = member.organizations as unknown as { hsd_rate?: number, ms_rate?: number }
      setOrgId(member.org_id)
      setHsdRate(org.hsd_rate || 87.49); setMsRate(org.ms_rate || 94.44)

      const { data: custs } = await supabase.from('customers').select('*').eq('org_id', member.org_id).eq('is_active', true).order('name')
      const { data: ents } = await supabase.from('credit_entries').select('*, customers(name)').eq('org_id', member.org_id).order('date', { ascending: false }).order('created_at', { ascending: false })

      setCustomers(custs ?? [])
      setEntries(ents ?? [])
      if (custs && custs.length > 0) setForm(f => ({ ...f, customerId: custs[0].id }))
      setLoading(false)
    }
    init()
  }, [])

  // Auto-calc amount from liters
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (!isPayment && form.liters) {
      const rate = form.fuelType === 'MS' ? msRate : hsdRate
      setForm(f => ({ ...f, amount: String(calcCreditAmount(parseFloat(f.liters) || 0, rate)) }))
    }
  }, [form.liters, form.fuelType, isPayment, hsdRate, msRate])

  const handleAdd = async () => {
    if (!form.customerId || !form.amount) return
    setSaving(true)
    const row = {
      org_id: orgId,
      customer_id: form.customerId,
      date: form.date,
      entry_type: isPayment ? 'payment' : 'sale',
      fuel_type: isPayment ? null : form.fuelType,
      liters: isPayment ? null : (parseFloat(form.liters) || null),
      amount: parseFloat(form.amount),
      vehicle_no: form.vehicleNo || null,
      receipt_no: form.receiptNo ? parseInt(form.receiptNo) : null,
      pay_mode: isPayment ? form.payMode : null,
      def_cash: parseFloat(form.defCash) || 0,
      notes: form.notes || null,
      created_by: userId,
    }
    const { data, error } = await supabase.from('credit_entries').insert(row).select('*, customers(name)').single()
    if (!error && data) {
      setEntries(prev => [data, ...prev])
      setForm(f => ({ ...f, liters: '', amount: '', vehicleNo: '', receiptNo: '', defCash: '', notes: '' }))
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    await supabase.from('credit_entries').delete().eq('id', id)
    setEntries(prev => prev.filter(e => e.id !== id))
  }

  // Customer balance map
  const balanceMap = useMemo(() => {
    const map: Record<string, number> = {}
    customers.forEach(c => { map[c.id] = c.opening_balance ?? 0 })
    entries.forEach(e => {
      if (!map[e.customer_id]) map[e.customer_id] = 0
      if (e.entry_type === 'sale') map[e.customer_id] += parseFloat(String(e.amount))
      else map[e.customer_id] -= parseFloat(String(e.amount))
    })
    return map
  }, [entries, customers])

  const totalOutstanding = Object.values(balanceMap).reduce((s, b) => s + Math.max(0, b), 0)
  const selectedBalance = form.customerId ? (balanceMap[form.customerId] ?? 0) : 0

  const filteredEntries = selectedCustomer === 'all' ? entries
    : entries.filter(e => e.customer_id === selectedCustomer)

  if (loading) return <div className="flex items-center justify-center py-20"><FuelLoading size={24} text="Loading…" textClassName="text-gray-400 text-sm" /></div>

  const TABS: { id: Tab; label: string }[] = [
    { id: 'entry', label: '+ New Entry' },
    { id: 'ledger', label: 'Ledger' },
    { id: 'summary', label: 'Summary' },
  ]

  return (
    <div className="fade-up">
      <div className="page-title">Credit Ledger</div>
      <div className="page-sub">Track credit sales and payments by customer</div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="stat-card border-t-[#de350b]">
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Total Outstanding</div>
          <div className="font-display text-xl font-bold text-red-700">{fmtInr(totalOutstanding)}</div>
          <div className="text-xs text-gray-400">{customers.filter(c => (balanceMap[c.id] ?? 0) > 0).length} customers</div>
        </div>
        <div className="stat-card border-t-[#003087]">
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Total Entries</div>
          <div className="font-display text-xl font-bold text-[#003087]">{entries.length}</div>
          <div className="text-xs text-gray-400">all transactions</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-4">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-2.5 text-sm font-semibold border-b-2 transition-colors ${tab === t.id ? 'border-[#003087] text-[#003087]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── NEW ENTRY ── */}
      {tab === 'entry' && (
        <div className="card p-4">
          {/* Toggle Sale / Payment */}
          <div className="flex gap-2 mb-4">
            <button onClick={() => setIsPayment(false)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-all ${!isPayment ? 'bg-[#003087] text-white border-[#003087]' : 'bg-white text-gray-500 border-gray-200'}`}>
              ⛽ Credit Sale
            </button>
            <button onClick={() => setIsPayment(true)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-all ${isPayment ? 'bg-[#00875a] text-white border-[#00875a]' : 'bg-white text-gray-500 border-gray-200'}`}>
              💰 Payment Received
            </button>
          </div>

          {/* Customer + balance hint */}
          <div className="mb-3">
            <label className="field-label">Customer</label>
            <select className="field-input" value={form.customerId}
              onChange={e => setForm(f => ({ ...f, customerId: e.target.value }))}>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {form.customerId && (
              <div className={`text-xs mt-1 font-semibold ${selectedBalance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                Current balance: {fmtInr(selectedBalance, 2)}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Date</label>
              <input className="field-input" type="date" value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                disabled={!isOwner} />
            </div>

            {!isPayment ? (
              <>
                <div>
                  <label className="field-label">Fuel Type</label>
                  <select className="field-input" value={form.fuelType}
                    onChange={e => setForm(f => ({ ...f, fuelType: e.target.value }))}>
                    <option value="HSD">HSD – ₹{hsdRate}/L</option>
                    <option value="MS">MS – ₹{msRate}/L</option>
                    <option value="DEF">DEF</option>
                  </select>
                </div>
                <div>
                  <label className="field-label">Liters</label>
                  <input className="field-input" type="number" step="0.01" placeholder="0"
                    value={form.liters} onChange={e => setForm(f => ({ ...f, liters: e.target.value }))} />
                </div>
                <div>
                  <label className="field-label">Amount (₹) – Auto</label>
                  <input className="field-input auto" type="number" step="0.0001"
                    value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
                </div>
                <div>
                  <label className="field-label">Vehicle No.</label>
                  <input className="field-input" type="text" placeholder="UP32QN9784"
                    value={form.vehicleNo} onChange={e => setForm(f => ({ ...f, vehicleNo: e.target.value.toUpperCase() }))} />
                </div>
                <div>
                  <label className="field-label">Receipt No.</label>
                  <input className="field-input" type="number" placeholder="0"
                    value={form.receiptNo} onChange={e => setForm(f => ({ ...f, receiptNo: e.target.value }))} />
                </div>
                <div>
                  <label className="field-label">DEF Cash</label>
                  <input className="field-input" type="number" placeholder="0"
                    value={form.defCash} onChange={e => setForm(f => ({ ...f, defCash: e.target.value }))} />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="field-label">Payment Amount (₹)</label>
                  <input className="field-input" type="number" placeholder="0"
                    value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
                </div>
                <div>
                  <label className="field-label">Payment Mode</label>
                  <select className="field-input" value={form.payMode}
                    onChange={e => setForm(f => ({ ...f, payMode: e.target.value }))}>
                    <option value="online">Online</option>
                    <option value="cash">Cash</option>
                    <option value="dt">DT</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
              </>
            )}
            <div className="col-span-2">
              <label className="field-label">Notes</label>
              <input className="field-input" placeholder="Optional" value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>

          <button className="btn-primary w-full justify-center mt-4" onClick={handleAdd}
            disabled={saving || !form.amount || (!isOwner && form.date !== today)}>
            {saving ? 'Saving…' : isPayment ? '✅ Record Payment' : '⛽ Add Credit Sale'}
          </button>
        </div>
      )}

      {/* ── LEDGER ── */}
      {tab === 'ledger' && (
        <div className="card overflow-hidden">
          <div className="p-3 border-b border-gray-100">
            <select className="field-input" value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)}>
              <option value="all">All Customers</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr><th>Date</th><th>Customer</th><th>Type</th><th>Liters</th><th>Amount</th><th>Vehicle</th><th></th></tr>
              </thead>
              <tbody>
                {filteredEntries.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-8 text-gray-400 text-sm">No entries yet</td></tr>
                )}
                {filteredEntries.map(e => (
                  <tr key={e.id}>
                    <td className="text-xs">{e.date}</td>
                    <td className="font-semibold text-sm">{(e.customer as unknown as {name?: string})?.name ?? '–'}</td>
                    <td>
                      {e.entry_type === 'sale'
                        ? <span className="badge-red badge">{e.fuel_type}</span>
                        : <span className="badge-green badge">Payment</span>}
                    </td>
                    <td className="num text-xs">{e.liters ? fmtL(parseFloat(String(e.liters))) : '–'}</td>
                    <td className={`num font-mono font-semibold ${e.entry_type === 'payment' ? 'text-emerald-700' : 'text-red-700'}`}>
                      {e.entry_type === 'payment' ? '+' : '–'}{fmtInr(parseFloat(String(e.amount)), 2)}
                    </td>
                    <td className="font-mono text-xs text-gray-400">{e.vehicle_no ?? '–'}</td>
                    <td>
                      {isOwner && (
                        <button onClick={() => handleDelete(e.id)} className="p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── SUMMARY ── */}
      {tab === 'summary' && (
        <div className="space-y-3">
          {customers.map(c => {
            const balance = balanceMap[c.id] ?? 0
            if (balance === 0 && entries.filter(e => e.customer_id === c.id).length === 0) return null
            const debit = entries.filter(e => e.customer_id === c.id && e.entry_type === 'sale').reduce((s, e) => s + parseFloat(String(e.amount)), 0) + (c.opening_balance ?? 0)
            const credit = entries.filter(e => e.customer_id === c.id && e.entry_type === 'payment').reduce((s, e) => s + parseFloat(String(e.amount)), 0)
            return (
              <div key={c.id} className="card overflow-hidden">
                <div className="flex items-center justify-between p-3" style={{background:'#003087'}}>
                  <div>
                    <div className="font-display font-bold text-white text-base">{c.name}</div>
                    {c.firm_name && <div className="text-blue-200 text-xs">{c.firm_name}</div>}
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-blue-200">Balance</div>
                    <div className={`font-mono font-bold text-base ${balance > 0 ? 'text-yellow-300' : 'text-emerald-300'}`}>
                      {fmtInr(balance, 2)}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 divide-x divide-gray-100">
                  <div className="p-3">
                    <div className="text-xs text-gray-400">Total Debit</div>
                    <div className="font-mono font-bold text-red-700">{fmtInr(debit, 2)}</div>
                  </div>
                  <div className="p-3">
                    <div className="text-xs text-gray-400">Total Paid</div>
                    <div className="font-mono font-bold text-emerald-700">{fmtInr(credit, 2)}</div>
                  </div>
                </div>
              </div>
            )
          }).filter(Boolean)}
          {customers.length === 0 && (
            <div className="card p-8 text-center text-gray-400 text-sm">
              No customers yet. <a href="/settings/customers" className="text-blue-600 hover:underline">Add customers →</a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function CreditPage() {
  return (
    <Suspense fallback={<div className="p-8"><FuelLoading /></div>}>
      <CreditPageInner />
    </Suspense>
  )
}
