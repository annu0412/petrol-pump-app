'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Employee } from '@/types'
import { Trash2, Plus } from 'lucide-react'

export default function EmployeesPage() {
  const [supabase] = useState(() => createClient())
  const [orgId, setOrgId] = useState('')
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', mobile: '', role: 'operator', shift: 'day', salary: '' })

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: member } = await supabase.from('org_members').select('org_id').eq('user_id', user.id).single()
      if (!member) return
      setOrgId(member.org_id)
      const { data } = await supabase.from('employees').select('*').eq('org_id', member.org_id).order('name')
      setEmployees(data ?? [])
      setLoading(false)
    }
    init()
  }, [])

  const handleAdd = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    const { data, error } = await supabase.from('employees').insert({
      org_id: orgId,
      name: form.name,
      mobile: form.mobile || null,
      role: form.role,
      shift: form.shift,
      salary: form.salary ? parseFloat(form.salary) : null,
    }).select().single()
    if (!error && data) {
      setEmployees(prev => [...prev, data])
      setForm({ name: '', mobile: '', role: 'operator', shift: 'day', salary: '' })
    }
    setSaving(false)
  }

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('employees').update({ is_active: !current }).eq('id', id)
    setEmployees(prev => prev.map(e => e.id === id ? { ...e, is_active: !current } : e))
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this employee?')) return
    await supabase.from('employees').delete().eq('id', id)
    setEmployees(prev => prev.filter(e => e.id !== id))
  }

  const SHIFT_LABEL: Record<string, string> = { day: 'Day shift', night: 'Night shift', both: 'Both shifts' }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="text-gray-400 text-sm">Loading…</div></div>

  return (
    <div className="fade-up">
      <div className="page-title">Employees</div>
      <div className="page-sub">Operators and staff at your pump</div>

      <div className="card p-4 mb-4">
        <div className="font-display font-bold text-[#003087] mb-3 flex items-center gap-2"><Plus size={16} /> Add Employee</div>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="field-label">Full Name</label>
            <input className="field-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Vijay Kumar" />
          </div>
          <div>
            <label className="field-label">Mobile</label>
            <input className="field-input" type="tel" value={form.mobile} onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))} placeholder="9999999999" />
          </div>
          <div>
            <label className="field-label">Role</label>
            <select className="field-input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
              <option value="operator">Operator</option>
              <option value="manager">Manager</option>
            </select>
          </div>
          <div>
            <label className="field-label">Shift</label>
            <select className="field-input" value={form.shift} onChange={e => setForm(f => ({ ...f, shift: e.target.value }))}>
              <option value="day">Day</option>
              <option value="night">Night</option>
              <option value="both">Both</option>
            </select>
          </div>
          <div>
            <label className="field-label">Salary (₹/month)</label>
            <input className="field-input" type="number" value={form.salary} onChange={e => setForm(f => ({ ...f, salary: e.target.value }))} placeholder="Optional" />
          </div>
        </div>
        <button className="btn-primary w-full justify-center mt-3" onClick={handleAdd} disabled={saving || !form.name}>
          {saving ? 'Adding…' : '+ Add Employee'}
        </button>
      </div>

      <div className="space-y-2">
        {employees.length === 0 && <div className="card p-8 text-center text-gray-400 text-sm">No employees yet.</div>}
        {employees.map(e => (
          <div key={e.id} className={`card p-4 flex items-center gap-3 ${!e.is_active ? 'opacity-50' : ''}`}>
            <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-[#003087] font-bold text-sm flex-shrink-0">
              {e.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-gray-800">{e.name}</div>
              <div className="text-xs text-gray-400">{SHIFT_LABEL[e.shift]} · {e.role} {e.mobile ? `· ${e.mobile}` : ''}</div>
            </div>
            {e.salary && <div className="font-mono text-sm text-gray-500 flex-shrink-0">₹{e.salary.toLocaleString('en-IN')}/mo</div>}
            <button onClick={() => toggleActive(e.id, e.is_active)}
              className={`text-xs px-2.5 py-1 rounded-full font-semibold border transition-colors flex-shrink-0 ${e.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
              {e.is_active ? 'Active' : 'Off'}
            </button>
            <button onClick={() => handleDelete(e.id)} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
