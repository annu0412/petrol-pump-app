
'use client'
import FuelLoading from '@/components/FuelLoading'
import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Machine, Employee } from '@/types'
import { calcSaleLiters, calcSaleInr, fmtInr, fmtL, round } from '@/lib/calculations'
import { useRole } from '@/lib/user-context'
import { Save, ChevronDown, ChevronUp, Lock } from 'lucide-react'

interface MachineRow {
  machine: Machine
  readingOpen: string
  readingClose: string
  operatorId: string
}

const DEFAULT_ROW = (m: Machine): MachineRow => ({
  machine: m, readingOpen: '', readingClose: '', operatorId: '',
})

function MasterPageInner() {
  const role = useRole()
  const isOwner = role === 'owner'
  const today = new Date().toISOString().slice(0, 10)

  const searchParams = useSearchParams()
  const queryDate = searchParams.get('date')
  const [supabase] = useState(() => createClient())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const [orgId, setOrgId] = useState('')
  const [hsdRate, setHsdRate] = useState('')
  const [msRate, setMsRate] = useState('')
  const [orgHsdRate, setOrgHsdRate] = useState(87.49)
  const [orgMsRate, setOrgMsRate] = useState(94.44)
  const [machines, setMachines] = useState<Machine[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [rows, setRows] = useState<MachineRow[]>([])

  const [date, setDate] = useState(queryDate || new Date().toISOString().slice(0, 10))
  const [prevCash, setPrevCash] = useState('')
  const [cashReceived, setCashReceived] = useState('')
  const [hsdStockIn, setHsdStockIn] = useState('')
  const [msStockIn, setMsStockIn] = useState('')
  const [bankDeposit, setBankDeposit] = useState('')
  const [genset, setGenset] = useState('')
  const [notes, setNotes] = useState('')
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  // Page-level digital payments (not per machine)
  const [phonepe, setPhonepe] = useState('')
  const [sbi, setSbi] = useState('')
  const [icici, setIcici] = useState('')
  const [paytm, setPaytm] = useState('')
  const [dtPlus, setDtPlus] = useState('')
  const [neft, setNeft] = useState('')

  const [dayExpense, setDayExpense] = useState(0)
  const [dayCredit, setDayCredit] = useState(0)

  // ── Initial load: fetch org, machines, employees ──
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: member } = await supabase
        .from('org_members')
        .select('org_id, organizations(hsd_rate, ms_rate)')
        .eq('user_id', user.id)
        .single()
      if (!member) return

      const org = member.organizations as unknown as { hsd_rate?: number, ms_rate?: number }
      setOrgId(member.org_id)
      setOrgHsdRate(org.hsd_rate || 87.49)
      setOrgMsRate(org.ms_rate || 94.44)

      const { data: mach } = await supabase
        .from('machines')
        .select('*')
        .eq('org_id', member.org_id)
        .eq('is_active', true)
        .order('display_order')

      const { data: emp } = await supabase
        .from('employees')
        .select('*')
        .eq('org_id', member.org_id)
        .eq('is_active', true)

      setMachines(mach ?? [])
      setEmployees(emp ?? [])
      setRows((mach ?? []).map(DEFAULT_ROW))
      setLoading(false)
    }
    init()
  }, [])

  const loadDateData = useCallback(async (org: string, d: string, machs: Machine[]) => {
    // Determine rates for the selected date
    let selectedHsdRate = String(orgHsdRate)
    let selectedMsRate = String(orgMsRate)

    // Check if there are entries on the selected date
    const { data: dateEntries } = await supabase
      .from('master_entries')
      .select('fuel_rate, machines(fuel_type)')
      .eq('org_id', org)
      .eq('date', d)

    if (dateEntries && dateEntries.length > 0) {
      const hsdEntry = dateEntries.find((e: unknown) => (e as any).machines?.fuel_type === 'HSD')
      const msEntry = dateEntries.find((e: unknown) => (e as any).machines?.fuel_type === 'MS')
      if (hsdEntry) selectedHsdRate = String(hsdEntry.fuel_rate)
      if (msEntry) selectedMsRate = String(msEntry.fuel_rate)
    } else {
      // If no entries for the date, find the most recent entries before this date
      const { data: recentHsdEntry } = await supabase
        .from('master_entries')
        .select('fuel_rate')
        .eq('org_id', org)
        .lt('date', d)
        .eq('machines.fuel_type', 'HSD')
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle()

      // The above join might not work as intended in PostgREST for ordering,
      // safer to fetch recent entry, but we need fuel type.
      // Let's do a simpler approach: get most recent date with entries.
      const { data: recentDateData } = await supabase
        .from('master_entries')
        .select('date')
        .eq('org_id', org)
        .lt('date', d)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (recentDateData) {
        const { data: recentEntries } = await supabase
          .from('master_entries')
          .select('fuel_rate, machines(fuel_type)')
          .eq('org_id', org)
          .eq('date', recentDateData.date)

        if (recentEntries) {
          const hsdEntry = recentEntries.find((e: unknown) => (e as any).machines?.fuel_type === 'HSD')
          const msEntry = recentEntries.find((e: unknown) => (e as any).machines?.fuel_type === 'MS')
          if (hsdEntry) selectedHsdRate = String(hsdEntry.fuel_rate)
          if (msEntry) selectedMsRate = String(msEntry.fuel_rate)
        }
      }
    }

    setHsdRate(selectedHsdRate)
    setMsRate(selectedMsRate)

    // 1. Fetch existing entries for this date
    const { data: entries } = await supabase
      .from('master_entries')
      .select('*')
      .eq('org_id', org)
      .eq('date', d)

    // 2. Fetch existing daily summary for this date
    const { data: summary } = await supabase
      .from('daily_summaries')
      .select('*')
      .eq('org_id', org)
      .eq('date', d)
      .single()

    // 3. Fetch previous day's summary for prevCash auto-fill
    const { data: prevSummary } = await supabase
      .from('daily_summaries')
      .select('cash_in_hand')
      .eq('org_id', org)
      .lt('date', d)
      .order('date', { ascending: false })
      .limit(1)
      .single()

    // 4. For each machine, get previous closing reading if no entry today
    const entryMap = new Map((entries ?? []).map((e: unknown) => [(e as any).machine_id, e]))

    const prevClosingMap = new Map<string, string>()
    const machinesWithoutEntry = machs.filter(m => !entryMap.has(m.id))

    if (machinesWithoutEntry.length > 0) {
      await Promise.all(machinesWithoutEntry.map(async (m) => {
        const { data: prev } = await supabase
          .from('master_entries')
          .select('reading_close')
          .eq('org_id', org)
          .eq('machine_id', m.id)
          .lt('date', d)
          .order('date', { ascending: false })
          .limit(1)
          .single()
        if (prev) prevClosingMap.set(m.id, String(prev.reading_close))
      }))
    }

    // 5. Build rows — readings + operator only
    setRows(machs.map(m => {
      const entry = entryMap.get(m.id)
      if (entry) {
        return {
          machine: m,
          readingOpen: String((entry as any).reading_open),
          readingClose: String((entry as any).reading_close),
          operatorId: (entry as any).operator_id ?? '',
        }
      }
      return { ...DEFAULT_ROW(m), readingOpen: prevClosingMap.get(m.id) ?? '' }
    }))

    // 6. Load page-level digital payments by summing across all machine entries
    const allEntries = entries ?? [] as unknown[]
    const sumField = (key: string) => allEntries.reduce((s: number, e: unknown) => s + ((e as any)[key] ?? 0), 0)
    const dPhonepe = sumField('phonepe')
    const dSbi     = sumField('sbi')
    const dIcici   = sumField('icici')
    const dPaytm   = sumField('paytm')
    const dDtPlus  = sumField('dt_plus')
    const dNeft    = sumField('neft')
    setPhonepe(dPhonepe > 0 ? String(dPhonepe) : '')
    setSbi(dSbi > 0 ? String(dSbi) : '')
    setIcici(dIcici > 0 ? String(dIcici) : '')
    setPaytm(dPaytm > 0 ? String(dPaytm) : '')
    setDtPlus(dDtPlus > 0 ? String(dDtPlus) : '')
    setNeft(dNeft > 0 ? String(dNeft) : '')

    // 7. Populate summary fields
    if (summary) {
      setHsdStockIn(summary.hsd_stock_in ? String(summary.hsd_stock_in) : '')
      setMsStockIn(summary.ms_stock_in ? String(summary.ms_stock_in) : '')
      setPrevCash(String(summary.prev_cash_in_hand ?? ''))
      setCashReceived(String(summary.cash_received ?? ''))
      setBankDeposit(String(summary.bank_deposit ?? ''))
      setGenset(summary.genset_reading ? String(summary.genset_reading) : '')
      setNotes(summary.notes ?? '')
    } else {
      setHsdStockIn('')
      setMsStockIn('')
      setCashReceived('')
      setBankDeposit('')
      setGenset('')
      setNotes('')
      setPrevCash(prevSummary ? String(prevSummary.cash_in_hand) : '')
    }
  }, [supabase, orgHsdRate, orgMsRate])

  // ── Load data for selected date ──
  useEffect(() => {
    if (!orgId || !date || machines.length === 0) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDateData(orgId, date, machines)
  }, [orgId, date, machines, loadDateData])

  // ── Fetch daily expense + credit for selected date ──
  useEffect(() => {
    if (!orgId || !date) return
    const fetchDayTotals = async () => {
      const [{ data: exp }, { data: cred }] = await Promise.all([
        supabase.from('expenses').select('amount').eq('org_id', orgId).eq('date', date),
        supabase.from('credit_entries').select('amount, entry_type').eq('org_id', orgId).eq('date', date)
      ])
      setDayExpense((exp ?? []).reduce((s, e) => s + parseFloat(e.amount), 0))
      setDayCredit((cred ?? []).filter(c => c.entry_type === 'sale').reduce((s, c) => s + parseFloat(c.amount), 0))
    }
    fetchDayTotals()
  }, [orgId, date])

  const updateRow = useCallback((machineId: string, field: keyof MachineRow, value: string) => {
    setRows(prev => prev.map(r => r.machine.id === machineId ? { ...r, [field]: value } : r))
  }, [])

  const n = (s: string) => parseFloat(s) || 0

  // Owner can edit any date; manager/staff can only edit today
  const canEdit = isOwner || date === today

  const rowCalcs = rows.map(r => {
    const rate = r.machine.fuel_type === 'MS' ? n(msRate) : n(hsdRate)
    const liters = calcSaleLiters(n(r.readingOpen), n(r.readingClose))
    const inr = calcSaleInr(liters, rate)
    return { liters, inr }
  })

  const totalSaleInr = round(rowCalcs.reduce((s, c) => s + c.inr, 0))
  const totalDigital = round(n(phonepe) + n(sbi) + n(icici) + n(paytm) + n(dtPlus) + n(neft))
  const cashGenerated = round(totalSaleInr - totalDigital - dayExpense - dayCredit + n(cashReceived))
  const cashInHand = round(n(prevCash) + cashGenerated - n(bankDeposit))

  const handleSave = async () => {
    setSaving(true); setError('')
    const { data: { user } } = await supabase.auth.getUser()

    const validRows = rows.filter(r => r.readingOpen && r.readingClose)

    const entryRows = validRows.map((r, idx) => {
      const rate = r.machine.fuel_type === 'MS' ? n(msRate) : n(hsdRate)
      const isFirst = idx === 0
      return {
        org_id: orgId,
        date,
        machine_id: r.machine.id,
        reading_open: n(r.readingOpen),
        reading_close: n(r.readingClose),
        fuel_rate: rate,
        operator_id: r.operatorId || null,
        // Store digital totals on first entry only; zero for others
        phonepe: isFirst ? n(phonepe) : 0,
        sbi:     isFirst ? n(sbi)     : 0,
        icici:   isFirst ? n(icici)   : 0,
        paytm:   isFirst ? n(paytm)   : 0,
        dt_plus: isFirst ? n(dtPlus)  : 0,
        neft:    isFirst ? n(neft)    : 0,
        hsd_stock_in: n(hsdStockIn),
        ms_stock_in: n(msStockIn),
        notes: notes || null,
        created_by: user?.id,
      }
    })

    if (entryRows.length === 0) {
      setError('Please enter at least one machine reading')
      setSaving(false); return
    }

    const { error: entryErr } = await supabase
      .from('master_entries')
      .upsert(entryRows, { onConflict: 'org_id,date,machine_id' })

    if (entryErr) { setError(entryErr.message); setSaving(false); return }

    await supabase.from('daily_summaries').upsert({
      org_id: orgId, date,
      total_sale_inr: totalSaleInr,
      total_digital: totalDigital,
      total_expense: dayExpense,
      total_credit: dayCredit,
      cash_received: n(cashReceived),
      prev_cash_in_hand: n(prevCash),
      cash_in_hand: cashInHand,
      bank_deposit: n(bankDeposit),
      genset_reading: genset ? parseInt(genset) : null,
      notes: notes || null,
      created_by: user?.id,
    }, { onConflict: 'org_id,date' })

    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <FuelLoading size={24} text="Loading machines…" textClassName="text-gray-400 text-sm" />
    </div>
  )

  return (
    <div className="fade-up">
      <div className="page-title">Master Entry</div>
      <div className="page-sub">Daily meter readings & cash summary</div>

      {saved && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 text-sm mb-4 flex items-center gap-2">✅ Entry saved successfully!</div>}
      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-4">{error}</div>}
      {!canEdit && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm mb-4 flex items-center gap-2">
          <Lock size={14} /> Viewing past entry — you can only edit today&apos;s data.
        </div>
      )}

      {/* DATE + STOCK */}
      <div className="card p-4 mb-4">
        <div className="font-display font-bold text-[#003087] mb-3">Basic Details</div>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="field-label">Date {!isOwner && <span className="text-amber-500 font-normal">(change to view past entries)</span>}</label>
            <input className="field-input" type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div>
            <label className="field-label">HSD Stock IN (L)</label>
            <input className="field-input" type="number" placeholder="0" value={hsdStockIn} onChange={e => setHsdStockIn(e.target.value)} disabled={!canEdit} />
          </div>
          <div>
            <label className="field-label">MS Stock IN (L)</label>
            <input className="field-input" type="number" placeholder="0" value={msStockIn} onChange={e => setMsStockIn(e.target.value)} disabled={!canEdit} />
          </div>
          <div>
            <label className="field-label">Genset Reading</label>
            <input className="field-input" type="number" placeholder="0" value={genset} onChange={e => setGenset(e.target.value)} disabled={!canEdit} />
          </div>
          <div>
            <label className="field-label">HSD Rate (₹)</label>
            <input className="field-input" type="number" step="0.01" placeholder="0.00" value={hsdRate} onChange={e => setHsdRate(e.target.value)} disabled={!canEdit} />
          </div>
          <div>
            <label className="field-label">MS Rate (₹)</label>
            <input className="field-input" type="number" step="0.01" placeholder="0.00" value={msRate} onChange={e => setMsRate(e.target.value)} disabled={!canEdit} />
          </div>
        </div>
      </div>

      {/* MACHINE ROWS */}
      {rows.map((row, idx) => {
        const calc = rowCalcs[idx]
        const isExpanded = expandedRow === row.machine.id
        const fuelColor = row.machine.fuel_type === 'MS' ? '#00875a' : '#003087'

        return (
          <div key={row.machine.id} className="card mb-3 overflow-hidden">
            <button
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              onClick={() => setExpandedRow(isExpanded ? null : row.machine.id)}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                     style={{background: fuelColor}}>
                  {row.machine.fuel_type}
                </div>
                <div>
                  <div className="font-semibold text-sm text-gray-800">{row.machine.name}</div>
                  <div className="text-xs text-gray-400">
                    {row.machine.fuel_type === 'MS' ? `₹${msRate}/L` : `₹${hsdRate}/L`} · {row.machine.nozzle_count} nozzle{row.machine.nozzle_count > 1 ? 's' : ''}
                    {row.readingOpen && !calc.liters && <span className="text-blue-400 ml-1">· Open: {row.readingOpen}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {calc.liters > 0 && (
                  <div className="text-right">
                    <div className="font-mono text-sm font-semibold" style={{color: fuelColor}}>{fmtL(calc.liters)}</div>
                    <div className="font-mono text-xs text-gray-500">{fmtInr(calc.inr, 2)}</div>
                  </div>
                )}
                {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-gray-100 p-4">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Meter Readings</div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="field-label">Opening</label>
                    <input
                      className={`field-input ${row.readingOpen && !(row as any).readingClose ? 'auto' : ''}`}
                      type="number" placeholder="e.g. 2884231"
                      value={row.readingOpen}
                      onChange={e => updateRow(row.machine.id, 'readingOpen', e.target.value)}
                      disabled={!canEdit} />
                  </div>
                  <div>
                    <label className="field-label">Closing</label>
                    <input className="field-input" type="number" placeholder="e.g. 2884728"
                      value={(row as any).readingClose} onChange={e => updateRow(row.machine.id, 'readingClose', e.target.value)}
                      disabled={!canEdit} />
                  </div>
                  <div>
                    <label className="field-label">Sale (Auto)</label>
                    <input className="field-input auto" readOnly value={calc.liters > 0 ? `${calc.liters} L` : '–'} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div>
                    <label className="field-label">Amount (Auto)</label>
                    <input className="field-input auto" readOnly value={calc.inr > 0 ? fmtInr(calc.inr, 2) : '–'} />
                  </div>
                  <div>
                    <label className="field-label">Operator</label>
                    <select className="field-input" value={row.operatorId}
                      onChange={e => updateRow(row.machine.id, 'operatorId', e.target.value)}
                      disabled={!canEdit}>
                      <option value="">– Select –</option>
                      {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {rows.length === 0 && (
        <div className="card p-8 text-center text-gray-400 text-sm mb-4">
          No machines found. <a href="/settings/machines" className="text-blue-600 hover:underline">Add machines in Settings →</a>
        </div>
      )}

      {/* DIGITAL PAYMENTS — whole day, not per machine */}
      <div className="card p-4 mb-4">
        <div className="font-display font-bold text-[#003087] mb-1">Digital Payments</div>
        <div className="text-xs text-gray-400 mb-3">
          Total: <span className="font-semibold text-gray-700">{fmtInr(totalDigital, 2)}</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {([
            { label: 'PhonePe', color: '#5f259f', value: phonepe, set: setPhonepe },
            { label: 'SBI',     color: '#1a3a6b', value: sbi,     set: setSbi },
            { label: 'ICICI',   color: '#b02720', value: icici,   set: setIcici },
            { label: 'Paytm',   color: '#0082c8', value: paytm,   set: setPaytm },
            { label: 'DT Plus', color: '#c05e00', value: dtPlus,  set: setDtPlus },
            { label: 'NEFT',    color: '#00875a', value: neft,    set: setNeft },
          ] as const).map(({ label, color, value, set }) => (
            <div key={label}>
              <label className="field-label" style={{color}}>{label}</label>
              <input className="field-input" type="number" placeholder="0"
                value={value} onChange={e => set(e.target.value)} disabled={!canEdit} />
            </div>
          ))}
        </div>
      </div>

      {/* CASH SUMMARY */}
      <div className="card p-4 mb-4">
        <div className="font-display font-bold text-[#003087] mb-3">Cash & Summary</div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="field-label">Previous Cash In Hand</label>
            <input className="field-input" type="number" placeholder="0" value={prevCash} onChange={e => setPrevCash(e.target.value)} disabled={!canEdit} />
          </div>
          <div>
            <label className="field-label">Cash Received (extra)</label>
            <input className="field-input" type="number" placeholder="0" value={cashReceived} onChange={e => setCashReceived(e.target.value)} disabled={!canEdit} />
          </div>
          <div>
            <label className="field-label">Bank Deposit</label>
            <input className="field-input" type="number" placeholder="0" value={bankDeposit} onChange={e => setBankDeposit(e.target.value)} disabled={!canEdit} />
          </div>
          <div>
            <label className="field-label">Notes</label>
            <input className="field-input" placeholder="Optional" value={notes} onChange={e => setNotes(e.target.value)} disabled={!canEdit} />
          </div>
        </div>

        <div className="summary-panel">
          <div className="text-xs font-bold uppercase tracking-wider opacity-60 mb-2">Live Summary</div>
          <div className="summary-row"><span>Total Sale</span><span>{fmtInr(totalSaleInr, 2)}</span></div>
          <div className="summary-row"><span>Digital Payments</span><span className="text-yellow-300">– {fmtInr(totalDigital, 2)}</span></div>
          <div className="summary-row"><span>Expenses (today)</span><span className="text-orange-300">– {fmtInr(dayExpense, 2)}</span></div>
          <div className="summary-row"><span>Credit Sales (today)</span><span className="text-orange-300">– {fmtInr(dayCredit, 2)}</span></div>
          <div className="summary-row"><span>Cash Generated</span><span className="text-emerald-300">{fmtInr(cashGenerated, 2)}</span></div>
          <div className="summary-row"><span>Previous Cash</span><span>{fmtInr(n(prevCash), 2)}</span></div>
          {n(bankDeposit) > 0 && (
            <div className="summary-row"><span>Bank Deposit</span><span className="text-red-300">– {fmtInr(n(bankDeposit), 2)}</span></div>
          )}
          <div className="summary-row border-t border-white/20 pt-2 mt-1">
            <span className="font-bold text-base">Cash In Hand</span>
            <span className="font-mono font-bold text-xl text-yellow-300">{fmtInr(cashInHand, 2)}</span>
          </div>
        </div>
      </div>

      {canEdit && (
        <button className="btn-primary w-full justify-center py-3 text-base" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : <><Save size={18} /> Save Entry</>}
        </button>
      )}
    </div>
  )
}

export default function MasterPage() {
  return (
    <Suspense fallback={<div className="p-8"><FuelLoading /></div>}>
      <MasterPageInner />
    </Suspense>
  )
}
