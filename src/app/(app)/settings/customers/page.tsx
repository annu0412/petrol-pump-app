
'use client'
import FuelLoading from '@/components/FuelLoading'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Customer } from '@/types'
import { Trash2, Plus } from 'lucide-react'
import { fmtInr } from '@/lib/calculations'

export default function CustomersPage() {
  const [supabase] = useState(() => createClient())
  const [orgId, setOrgId] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', firm_name: '', mobile: '', gst_no: '', opening_balance: '0' })

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: member } = await supabase.from('org_members').select('org_id').eq('user_id', user.id).single()
      if (!member) return
      setOrgId(member.org_id)
      const { data } = await supabase.from('customers').select('*').eq('org_id', member.org_id).order('name')
      setCustomers(data ?? [])
      setLoading(false)
    }
    init()
  }, [])

  const handleAdd = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    const { data, error } = await supabase.from('customers').insert({
      org_id: orgId,
      name: form.name,
      firm_name: form.firm_name || null,
      mobile: form.mobile || null,
      gst_no: form.gst_no || null,
      opening_balance: parseFloat(form.opening_balance) || 0,
    }).select().single()
    if (!error && data) {
      setCustomers(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      setForm({ name: '', firm_name: '', mobile: '', gst_no: '', opening_balance: '0' })
    }
    setSaving(false)
  }

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('customers').update({ is_active: !current }).eq('id', id)
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, is_active: !current } : c))
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this customer? Their credit history will be lost.')) return
    await supabase.from('customers').delete().eq('id', id)
    setCustomers(prev => prev.filter(c => c.id !== id))
  }

  if (loading) return <div className="flex items-center justify-center py-20"><FuelLoading size={24} text="Loading…" textClassName="text-gray-400 text-sm" /></div>

  return (
    <div className="fade-up">
      <div className="page-title">Customers</div>
      <div className="page-sub">Credit account customers</div>

      <div className="card p-4 mb-4">
        <div className="font-display font-bold text-[#003087] mb-3 flex items-center gap-2"><Plus size={16} /> Add Customer</div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">Customer Name *</label>
            <input className="field-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Bholenath Transport" />
          </div>
          <div>
            <label className="field-label">Firm Name</label>
            <input className="field-input" value={form.firm_name} onChange={e => setForm(f => ({ ...f, firm_name: e.target.value }))} placeholder="Optional" />
          </div>
          <div>
            <label className="field-label">Mobile</label>
            <input className="field-input" type="tel" value={form.mobile} onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))} placeholder="9999999999" />
          </div>
          <div>
            <label className="field-label">GST No.</label>
            <input className="field-input" value={form.gst_no} onChange={e => setForm(f => ({ ...f, gst_no: e.target.value }))} placeholder="Optional" />
          </div>
          <div className="col-span-2">
            <label className="field-label">Opening Balance (₹) — existing dues</label>
            <input className="field-input" type="number" value={form.opening_balance} onChange={e => setForm(f => ({ ...f, opening_balance: e.target.value }))} />
          </div>
        </div>
        <button className="btn-primary w-full justify-center mt-3" onClick={handleAdd} disabled={saving || !form.name}>
          {saving ? 'Adding…' : '+ Add Customer'}
        </button>
      </div>

      <div className="space-y-2">
        {customers.length === 0 && <div className="card p-8 text-center text-gray-400 text-sm">No customers yet.</div>}
        {customers.map(c => (
          <div key={c.id} className={`card p-4 flex items-center gap-3 ${!c.is_active ? 'opacity-50' : ''}`}>
            <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center text-red-700 font-bold text-sm flex-shrink-0">
              {c.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-gray-800">{c.name}</div>
              <div className="text-xs text-gray-400">
                {c.firm_name && `${c.firm_name} · `}
                {c.mobile && `${c.mobile}`}
                {c.gst_no && ` · ${c.gst_no}`}
              </div>
            </div>
            {(c.opening_balance ?? 0) > 0 && (
              <div className="font-mono text-xs text-amber-700 flex-shrink-0">OB: {fmtInr(c.opening_balance)}</div>
            )}
            <button onClick={() => toggleActive(c.id, c.is_active)}
              className={`text-xs px-2.5 py-1 rounded-full font-semibold border transition-colors flex-shrink-0 ${c.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
              {c.is_active ? 'Active' : 'Off'}
            </button>
            <button onClick={() => handleDelete(c.id)} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
