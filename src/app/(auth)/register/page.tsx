
'use client'
import FuelLoading from '@/components/FuelLoading'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type Step = 'account' | 'pump' | 'machines' | 'employees' | 'customers' | 'done'

interface MachineInput { name: string; fuel_type: 'HSD' | 'MS'; nozzle_count: number }
interface EmployeeInput { name: string; mobile: string; shift: string }
interface CustomerInput { name: string; firm_name: string; mobile: string; opening_balance: string }

const STEPS: Step[] = ['account', 'pump', 'machines', 'employees', 'customers', 'done']
const STEP_LABELS = ['Account', 'Pump Details', 'Machines', 'Employees', 'Customers', 'Done']

export default function RegisterPage() {
  const router = useRouter()
  const [supabase] = useState(() => createClient())
  const [step, setStep] = useState<Step>('account')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Step 1 — Account
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Step 2 — Pump
  const [pumpName, setPumpName] = useState('')
  const [city, setCity] = useState('')
  const [address, setAddress] = useState('')
  const [mobile, setMobile] = useState('')
  const [hsdRate, setHsdRate] = useState('87.49')
  const [msRate, setMsRate] = useState('94.44')

  // Step 3 — Machines
  const [machines, setMachines] = useState<MachineInput[]>([
    { name: 'Machine 1', fuel_type: 'HSD', nozzle_count: 1 },
    { name: 'Machine 2', fuel_type: 'MS',  nozzle_count: 1 },
  ])

  // Step 4 — Employees
  const [employees, setEmployees] = useState<EmployeeInput[]>([
    { name: '', mobile: '', shift: 'day' },
  ])

  // Step 5 — Customers
  const [customers, setCustomers] = useState<CustomerInput[]>([
    { name: '', firm_name: '', mobile: '', opening_balance: '0' },
  ])

  // Saved IDs after DB insert
  const [orgId, setOrgId] = useState('')
  const [userId, setUserId] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setStep('pump')
      }
    })
  }, [supabase])

  const stepIdx = STEPS.indexOf(step)

  const next = () => setStep(STEPS[stepIdx + 1])
  const prev = () => setStep(STEPS[stepIdx - 1])

  // ── STEP 1: Create account ──
  const handleAccount = async () => {
    setLoading(true); setError('')
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    setUserId(data.user!.id)
    setLoading(false); next()
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // ── STEP 2: Create org (uses security definer function to bypass RLS) ──
  const handlePump = async () => {
    setLoading(true); setError('')
    const { data, error } = await supabase.rpc('register_org', {
      p_name: pumpName, p_city: city, p_address: address, p_mobile: mobile,
      p_hsd_rate: parseFloat(hsdRate), p_ms_rate: parseFloat(msRate),
    })
    if (error) { setError(error.message); setLoading(false); return }
    setOrgId(data)
    setLoading(false); next()
  }

  // ── STEP 3: Add machines ──
  const handleMachines = async () => {
    setLoading(true); setError('')
    const rows = machines.filter(m => m.name.trim()).map((m, i) => ({
      org_id: orgId, ...m, display_order: i,
    }))
    if (rows.length > 0) {
      const { error } = await supabase.from('machines').insert(rows)
      if (error) { setError(error.message); setLoading(false); return }
    }
    setLoading(false); next()
  }

  // ── STEP 4: Add employees ──
  const handleEmployees = async () => {
    setLoading(true); setError('')
    const rows = employees.filter(e => e.name.trim()).map(e => ({
      org_id: orgId, ...e,
    }))
    if (rows.length > 0) {
      const { error } = await supabase.from('employees').insert(rows)
      if (error) { setError(error.message); setLoading(false); return }
    }
    setLoading(false); next()
  }

  // ── STEP 5: Add customers ──
  const handleCustomers = async () => {
    setLoading(true); setError('')
    const rows = customers.filter(c => c.name.trim()).map(c => ({
      org_id: orgId, name: c.name, firm_name: c.firm_name || null,
      mobile: c.mobile || null, opening_balance: parseFloat(c.opening_balance) || 0,
    }))
    if (rows.length > 0) {
      const { error } = await supabase.from('customers').insert(rows)
      if (error) { setError(error.message); setLoading(false); return }
    }
    setLoading(false); next()
  }

  const addMachine = () => setMachines(m => [...m, { name: `Machine ${m.length + 1}`, fuel_type: 'HSD', nozzle_count: 1 }])
  const addEmployee = () => setEmployees(e => [...e, { name: '', mobile: '', shift: 'day' }])
  const addCustomer = () => setCustomers(c => [...c, { name: '', firm_name: '', mobile: '', opening_balance: '0' }])

  return (
    <div className="min-h-screen bg-[#003087] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="text-center mb-6 relative">
          {step !== 'account' && step !== 'done' && (
            <button
              onClick={handleSignOut}
              className="absolute right-0 top-0 text-sm text-blue-200 hover:text-white underline"
            >
              Sign out
            </button>
          )}
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-3"
               style={{background:'linear-gradient(135deg,#ffd700,#ff8b00)'}}>
            <span className="font-display font-bold text-xl text-[#003087]">HP</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-white">Setup your pump</h1>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-1 mb-6 px-2">
          {STEP_LABELS.slice(0, -1).map((label, i) => (
            <div key={i} className="flex items-center gap-1 flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all
                ${i < stepIdx ? 'bg-[#ffd700] text-[#003087]' : i === stepIdx ? 'bg-white text-[#003087]' : 'bg-white/20 text-white/50'}`}>
                {i < stepIdx ? '✓' : i + 1}
              </div>
              {i < STEP_LABELS.length - 2 && (
                <div className={`flex-1 h-0.5 ${i < stepIdx ? 'bg-[#ffd700]' : 'bg-white/20'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="card p-6 fade-up">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm mb-4">{error}</div>}

          {/* STEP 1 — Account */}
          {step === 'account' && (
            <div>
              <h2 className="font-display text-xl font-bold text-[#003087] mb-4">Create your account</h2>
              <div className="space-y-3">
                <div><label className="field-label">Email</label>
                  <input className="field-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="owner@example.com" /></div>
                <div><label className="field-label">Password</label>
                  <input className="field-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 characters" /></div>
              </div>
              <button className="btn-primary w-full justify-center mt-5" onClick={handleAccount} disabled={loading || !email || !password}>
                {loading ? <FuelLoading size={16} text="Creating…" textClassName="text-white" /> : 'Continue →'}
              </button>
              <div className="mt-3 text-center text-sm text-gray-500">
                Already registered? <a href="/login" className="text-[#003087] font-semibold hover:underline">Sign in</a>
              </div>
            </div>
          )}

          {/* STEP 2 — Pump */}
          {step === 'pump' && (
            <div>
              <h2 className="font-display text-xl font-bold text-[#003087] mb-4">Pump details</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><label className="field-label">Pump / Station Name</label>
                  <input className="field-input" value={pumpName} onChange={e => setPumpName(e.target.value)} placeholder="Rupali HP Sales" /></div>
                <div><label className="field-label">City</label>
                  <input className="field-input" value={city} onChange={e => setCity(e.target.value)} placeholder="Kanpur" /></div>
                <div><label className="field-label">Mobile</label>
                  <input className="field-input" type="tel" value={mobile} onChange={e => setMobile(e.target.value)} placeholder="9999999999" /></div>
                <div className="col-span-2"><label className="field-label">Address</label>
                  <input className="field-input" value={address} onChange={e => setAddress(e.target.value)} placeholder="Full address" /></div>
                <div><label className="field-label">HSD Rate (₹/L)</label>
                  <input className="field-input" type="number" step="0.01" value={hsdRate} onChange={e => setHsdRate(e.target.value)} /></div>
                <div><label className="field-label">MS Rate (₹/L)</label>
                  <input className="field-input" type="number" step="0.01" value={msRate} onChange={e => setMsRate(e.target.value)} /></div>
              </div>
              <div className="flex gap-2 mt-5">
                <button className="btn-outline" onClick={prev}>← Back</button>
                <button className="btn-primary flex-1 justify-center" onClick={handlePump} disabled={loading || !pumpName}>
                  {loading ? <FuelLoading size={16} text="Saving…" textClassName="text-white" /> : 'Continue →'}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 — Machines */}
          {step === 'machines' && (
            <div>
              <h2 className="font-display text-xl font-bold text-[#003087] mb-1">Add your machines</h2>
              <p className="text-sm text-gray-500 mb-4">Each dispensing machine with its fuel type</p>
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {machines.map((m, i) => (
                  <div key={i} className="machine-block grid grid-cols-5 gap-2 items-center">
                    <div className="col-span-2">
                      <label className="field-label">Name</label>
                      <input className="field-input" value={m.name} onChange={e => { const a=[...machines]; a[i].name=e.target.value; setMachines(a); }} placeholder="Machine 1" />
                    </div>
                    <div className="col-span-2">
                      <label className="field-label">Fuel</label>
                      <select className="field-input" value={m.fuel_type} onChange={e => { const a=[...machines]; a[i].fuel_type=e.target.value as any; setMachines(a); }}>
                        <option value="HSD">HSD (Diesel)</option>
                        <option value="MS">MS (Petrol)</option>
                        <option value="DEF">DEF</option>
                      </select>
                    </div>
                    <div>
                      <label className="field-label">Nozzles</label>
                      <input className="field-input" type="number" min={1} max={4} value={m.nozzle_count} onChange={e => { const a=[...machines]; a[i].nozzle_count=+e.target.value; setMachines(a); }} />
                    </div>
                  </div>
                ))}
              </div>
              <button className="btn-outline w-full justify-center mt-2 text-xs" onClick={addMachine}>+ Add machine</button>
              <div className="flex gap-2 mt-4">
                <button className="btn-outline" onClick={prev}>← Back</button>
                <button className="btn-primary flex-1 justify-center" onClick={handleMachines} disabled={loading}>
                  {loading ? <FuelLoading size={16} text="Saving…" textClassName="text-white" /> : 'Continue →'}
                </button>
              </div>
            </div>
          )}

          {/* STEP 4 — Employees */}
          {step === 'employees' && (
            <div>
              <h2 className="font-display text-xl font-bold text-[#003087] mb-1">Add operators / staff</h2>
              <p className="text-sm text-gray-500 mb-4">These names appear in daily entry dropdowns</p>
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {employees.map((e, i) => (
                  <div key={i} className="grid grid-cols-3 gap-2">
                    <div className="col-span-1">
                      <label className="field-label">Name</label>
                      <input className="field-input" value={e.name} onChange={ev => { const a=[...employees]; a[i].name=ev.target.value; setEmployees(a); }} placeholder="Vijay" />
                    </div>
                    <div>
                      <label className="field-label">Mobile</label>
                      <input className="field-input" value={e.mobile} onChange={ev => { const a=[...employees]; a[i].mobile=ev.target.value; setEmployees(a); }} placeholder="9999999999" />
                    </div>
                    <div>
                      <label className="field-label">Shift</label>
                      <select className="field-input" value={e.shift} onChange={ev => { const a=[...employees]; a[i].shift=ev.target.value; setEmployees(a); }}>
                        <option value="day">Day</option><option value="night">Night</option><option value="both">Both</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
              <button className="btn-outline w-full justify-center mt-2 text-xs" onClick={addEmployee}>+ Add employee</button>
              <div className="flex gap-2 mt-4">
                <button className="btn-outline" onClick={prev}>← Back</button>
                <button className="btn-primary flex-1 justify-center" onClick={handleEmployees} disabled={loading}>
                  {loading ? <FuelLoading size={16} text="Saving…" textClassName="text-white" /> : 'Continue →'}
                </button>
              </div>
            </div>
          )}

          {/* STEP 5 — Customers */}
          {step === 'customers' && (
            <div>
              <h2 className="font-display text-xl font-bold text-[#003087] mb-1">Add credit customers</h2>
              <p className="text-sm text-gray-500 mb-4">You can always add more later from Settings</p>
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {customers.map((c, i) => (
                  <div key={i} className="grid grid-cols-2 gap-2">
                    <div><label className="field-label">Customer name</label>
                      <input className="field-input" value={c.name} onChange={e => { const a=[...customers]; a[i].name=e.target.value; setCustomers(a); }} placeholder="Bholenath Transport" /></div>
                    <div><label className="field-label">Opening balance (₹)</label>
                      <input className="field-input" type="number" value={c.opening_balance} onChange={e => { const a=[...customers]; a[i].opening_balance=e.target.value; setCustomers(a); }} /></div>
                  </div>
                ))}
              </div>
              <button className="btn-outline w-full justify-center mt-2 text-xs" onClick={addCustomer}>+ Add customer</button>
              <div className="flex gap-2 mt-4">
                <button className="btn-outline" onClick={prev}>← Back</button>
                <button className="btn-primary flex-1 justify-center" onClick={handleCustomers} disabled={loading}>
                  {loading ? <FuelLoading size={16} text="Saving…" textClassName="text-white" /> : 'Finish Setup →'}
                </button>
              </div>
            </div>
          )}

          {/* STEP 6 — Done */}
          {step === 'done' && (
            <div className="text-center py-4">
              <div className="text-5xl mb-4">🎉</div>
              <h2 className="font-display text-2xl font-bold text-[#003087] mb-2">You're all set!</h2>
              <p className="text-gray-500 text-sm mb-6">Your pump is configured and ready to use. Start by entering today's meter readings.</p>
              <button className="btn-primary w-full justify-center" onClick={() => router.push('/')}>
                Go to Dashboard →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
