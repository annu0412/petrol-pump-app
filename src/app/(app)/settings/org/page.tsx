'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Settings, Wrench, Users, UserCircle, ShieldCheck } from 'lucide-react'

export default function OrgSettingsPage() {
  const [supabase] = useState(() => createClient())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [orgId, setOrgId] = useState('')
  const [form, setForm] = useState({
    name: '', city: '', address: '', mobile: '',
    hsd_rate: '87.49', ms_rate: '94.44', def_rate: '0',
  })

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: member } = await supabase.from('org_members')
        .select('org_id, organizations(*)')
        .eq('user_id', user.id).single()
      if (!member) return
      const org = member.organizations as any
      setOrgId(member.org_id)
      setForm({
        name: org.name ?? '',
        city: org.city ?? '',
        address: org.address ?? '',
        mobile: org.mobile ?? '',
        hsd_rate: String(org.hsd_rate ?? 87.49),
        ms_rate: String(org.ms_rate ?? 94.44),
        def_rate: String(org.def_rate ?? 0),
      })
      setLoading(false)
    }
    init()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    await supabase.from('organizations').update({
      name: form.name,
      city: form.city,
      address: form.address,
      mobile: form.mobile,
      hsd_rate: parseFloat(form.hsd_rate),
      ms_rate: parseFloat(form.ms_rate),
      def_rate: parseFloat(form.def_rate),
    }).eq('id', orgId)
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const LINKS = [
    { href: '/settings/machines',  icon: Wrench,       label: 'Machines',  desc: 'Add/edit dispensing machines' },
    { href: '/settings/employees', icon: Users,        label: 'Employees', desc: 'Operators and staff' },
    { href: '/settings/customers', icon: UserCircle,   label: 'Customers', desc: 'Credit account customers' },
    { href: '/settings/members',   icon: ShieldCheck,  label: 'Members',   desc: 'User access & roles' },
  ]

  if (loading) return <div className="flex items-center justify-center py-20"><div className="text-gray-400 text-sm">Loading…</div></div>

  return (
    <div className="fade-up">
      <div className="page-title">Settings</div>
      <div className="page-sub">Pump profile and configuration</div>

      {saved && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 text-sm mb-4">✅ Settings saved!</div>}

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-2 mb-5">
        {LINKS.map(l => (
          <a key={l.href} href={l.href} className="card p-3 flex flex-col items-center gap-2 hover:shadow-md transition-shadow active:scale-95 text-center">
            <l.icon size={20} className="text-[#003087]" />
            <div>
              <div className="text-sm font-semibold text-gray-800">{l.label}</div>
              <div className="text-[10px] text-gray-400 leading-tight">{l.desc}</div>
            </div>
          </a>
        ))}
      </div>

      {/* Pump profile */}
      <div className="card p-4 mb-4">
        <div className="font-display font-bold text-[#003087] mb-3 flex items-center gap-2">
          <Settings size={16} /> Pump Profile
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="field-label">Pump / Station Name</label>
            <input className="field-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="field-label">City</label>
            <input className="field-input" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
          </div>
          <div>
            <label className="field-label">Mobile</label>
            <input className="field-input" type="tel" value={form.mobile} onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))} />
          </div>
          <div className="col-span-2">
            <label className="field-label">Address</label>
            <input className="field-input" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
          </div>
        </div>
      </div>

      {/* Fuel rates */}
      <div className="card p-4 mb-4">
        <div className="font-display font-bold text-[#003087] mb-3">Fuel Rates (₹/L)</div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700 mb-3">
          ⚠️ Changing rates affects new entries only. Old entries keep their recorded rate.
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="field-label">HSD Rate</label>
            <input className="field-input" type="number" step="0.01" value={form.hsd_rate} onChange={e => setForm(f => ({ ...f, hsd_rate: e.target.value }))} />
          </div>
          <div>
            <label className="field-label">MS Rate</label>
            <input className="field-input" type="number" step="0.01" value={form.ms_rate} onChange={e => setForm(f => ({ ...f, ms_rate: e.target.value }))} />
          </div>
          <div>
            <label className="field-label">DEF Rate</label>
            <input className="field-input" type="number" step="0.01" value={form.def_rate} onChange={e => setForm(f => ({ ...f, def_rate: e.target.value }))} />
          </div>
        </div>
      </div>

      <button className="btn-primary w-full justify-center py-3" onClick={handleSave} disabled={saving}>
        {saving ? 'Saving…' : '💾 Save Settings'}
      </button>
    </div>
  )
}
