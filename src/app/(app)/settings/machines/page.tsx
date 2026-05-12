
'use client'
import FuelLoading from '@/components/FuelLoading'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Machine } from '@/types'
import { Trash2, Plus, GripVertical } from 'lucide-react'

export default function MachinesPage() {
  const [supabase] = useState(() => createClient())
  const [orgId, setOrgId] = useState('')
  const [machines, setMachines] = useState<Machine[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ name: '', fuel_type: 'HSD', nozzle_count: '1' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: member } = await supabase.from('org_members').select('org_id').eq('user_id', user.id).single()
      if (!member) return
      setOrgId(member.org_id)
      const { data } = await supabase.from('machines').select('*').eq('org_id', member.org_id).order('display_order')
      setMachines(data ?? [])
      setLoading(false)
    }
    init()
  }, [])

  const handleAdd = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    const { data, error } = await supabase.from('machines').insert({
      org_id: orgId,
      name: form.name,
      fuel_type: form.fuel_type,
      nozzle_count: parseInt(form.nozzle_count),
      display_order: machines.length,
    }).select().single()
    if (!error && data) {
      setMachines(prev => [...prev, data])
      setForm({ name: '', fuel_type: 'HSD', nozzle_count: '1' })
    }
    setSaving(false)
  }

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('machines').update({ is_active: !current }).eq('id', id)
    setMachines(prev => prev.map(m => m.id === id ? { ...m, is_active: !current } : m))
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this machine? This cannot be undone.')) return
    await supabase.from('machines').delete().eq('id', id)
    setMachines(prev => prev.filter(m => m.id !== id))
  }

  const FUEL_COLORS: Record<string, string> = { HSD: '#003087', MS: '#00875a', DEF: '#6b21a8' }

  if (loading) return <div className="flex items-center justify-center py-20"><FuelLoading size={24} text="Loading…" textClassName="text-gray-400 text-sm" /></div>

  return (
    <div className="fade-up">
      <div className="page-title">Machines</div>
      <div className="page-sub">Manage your fuel dispensing machines</div>

      {/* Add form */}
      <div className="card p-4 mb-4">
        <div className="font-display font-bold text-[#003087] mb-3 flex items-center gap-2"><Plus size={16} /> Add Machine</div>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-1">
            <label className="field-label">Name</label>
            <input className="field-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Machine 1" />
          </div>
          <div>
            <label className="field-label">Fuel Type</label>
            <select className="field-input" value={form.fuel_type} onChange={e => setForm(f => ({ ...f, fuel_type: e.target.value }))}>
              <option value="HSD">HSD (Diesel)</option>
              <option value="MS">MS (Petrol)</option>
              <option value="DEF">DEF</option>
            </select>
          </div>
          <div>
            <label className="field-label">Nozzles</label>
            <input className="field-input" type="number" min={1} max={6} value={form.nozzle_count} onChange={e => setForm(f => ({ ...f, nozzle_count: e.target.value }))} />
          </div>
        </div>
        <button className="btn-primary w-full justify-center mt-3" onClick={handleAdd} disabled={saving || !form.name}>
          {saving ? 'Adding…' : '+ Add Machine'}
        </button>
      </div>

      {/* Machine list */}
      <div className="space-y-2">
        {machines.length === 0 && <div className="card p-8 text-center text-gray-400 text-sm">No machines yet. Add your first machine above.</div>}
        {machines.map(m => (
          <div key={m.id} className={`card p-4 flex items-center gap-3 ${!m.is_active ? 'opacity-50' : ''}`}>
            <GripVertical size={16} className="text-gray-300 flex-shrink-0" />
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                 style={{ background: FUEL_COLORS[m.fuel_type] ?? '#374151' }}>
              {m.fuel_type}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-gray-800">{m.name}</div>
              <div className="text-xs text-gray-400">{m.nozzle_count} nozzle{m.nozzle_count > 1 ? 's' : ''} · {m.is_active ? 'Active' : 'Inactive'}</div>
            </div>
            <button onClick={() => toggleActive(m.id, m.is_active)}
              className={`text-xs px-2.5 py-1 rounded-full font-semibold border transition-colors ${m.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
              {m.is_active ? 'Active' : 'Inactive'}
            </button>
            <button onClick={() => handleDelete(m.id)} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
