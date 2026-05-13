
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Expense, CreditEntry, DailySummary, MasterEntry } from '@/types'
import { fmtInr, fmtL } from '@/lib/calculations'
import FuelLoading from './FuelLoading'
import { useRole } from '@/lib/user-context'
import { MasterForm } from '@/app/(app)/master/page'
import { ExpenseForm } from '@/app/(app)/expense/page'
import { CreditForm } from '@/app/(app)/credit/page'

interface Props {
  date: string
  orgId: string
  summary: DailySummary
  onSaved: () => void
}

type TabType = 'summary' | 'master' | 'expense' | 'credit'

export default function DailyDetails({ date, orgId, summary, onSaved }: Props) {
  const role = useRole()
  const isOwner = role === 'owner'
  const [supabase] = useState(() => createClient())
  const [loading, setLoading] = useState(true)
  const [masters, setMasters] = useState<MasterEntry[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [credits, setCredits] = useState<CreditEntry[]>([])
  const [activeTab, setActiveTab] = useState<TabType>('summary')

  const loadData = async () => {
    setLoading(true)
    const [mRes, eRes, cRes] = await Promise.all([
      supabase.from('master_entries').select('*, machine:machines(*), operator:employees(*)').eq('org_id', orgId).eq('date', date),
      supabase.from('expenses').select('*').eq('org_id', orgId).eq('date', date),
      supabase.from('credit_entries').select('*, customer:customers(*)').eq('org_id', orgId).eq('date', date)
    ])
    setMasters(mRes.data || [])
    setExpenses(eRes.data || [])
    setCredits(cRes.data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, orgId, supabase])

  const handleSaved = () => {
    loadData()
    if (onSaved) onSaved()
  }

  if (loading) return <div className="py-8"><FuelLoading /></div>

  const m1 = masters[0]
  const digitalTotals = m1 ? {
    phonepe: m1.phonepe, sbi: m1.sbi, icici: m1.icici, paytm: m1.paytm, dt_plus: m1.dt_plus, neft: m1.neft
  } : null

  return (
    <div className="bg-gray-50 border-y border-gray-200">
      <div className="flex border-b border-gray-200 overflow-x-auto hide-scroll">
        <button className={`px-4 py-3 text-sm font-semibold ${activeTab === 'summary' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`} onClick={() => setActiveTab('summary')}>Summary</button>
        <button className={`px-4 py-3 text-sm font-semibold ${activeTab === 'master' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`} onClick={() => setActiveTab('master')}>Master Entry</button>
        <button className={`px-4 py-3 text-sm font-semibold ${activeTab === 'expense' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`} onClick={() => setActiveTab('expense')}>Expenses</button>
        <button className={`px-4 py-3 text-sm font-semibold ${activeTab === 'credit' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`} onClick={() => setActiveTab('credit')}>Credit</button>
      </div>

      <div className="p-4">
        {activeTab === 'summary' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* MASTER ENTRY SECTION */}
            <div className="md:col-span-2 space-y-4">
              <h3 className="font-bold text-[#003087]">Master Entry Highlights</h3>

              <div className="grid grid-cols-2 gap-4 text-sm bg-white p-3 rounded-lg border">
                <div><span className="text-gray-500">HSD Stock In:</span> <span className="font-medium">{m1?.hsd_stock_in || 0} L</span></div>
                <div><span className="text-gray-500">MS Stock In:</span> <span className="font-medium">{m1?.ms_stock_in || 0} L</span></div>
                <div><span className="text-gray-500">Genset Reading:</span> <span className="font-medium">{summary?.genset_reading || '-'}</span></div>
                <div><span className="text-gray-500">Notes:</span> <span className="font-medium">{m1?.notes || '-'}</span></div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-gray-400 uppercase">Machines</h4>
                {masters.map(m => (
                  <div key={m.id} className="bg-white p-3 rounded-lg border text-sm grid grid-cols-2 md:grid-cols-5 gap-2">
                    <div className="font-semibold text-gray-800">{m.machine?.name}</div>
                    <div><span className="text-gray-400 text-xs">Open:</span> <br/>{m.reading_open}</div>
                    <div><span className="text-gray-400 text-xs">Close:</span> <br/>{m.reading_close}</div>
                    <div><span className="text-gray-400 text-xs">Sale:</span> <br/><span className="text-[#003087] font-semibold">{fmtL(m.sale_liters)}</span></div>
                    <div><span className="text-gray-400 text-xs">Amount:</span> <br/><span className="text-green-700 font-semibold">{fmtInr(m.sale_inr)}</span></div>
                  </div>
                ))}
                {masters.length === 0 && <div className="text-sm text-gray-500">No machine entries</div>}
              </div>

              {digitalTotals && (
                <div className="space-y-2 mt-4">
                  <h4 className="text-xs font-bold text-gray-400 uppercase">Digital Payments</h4>
                  <div className="bg-white p-3 rounded-lg border text-sm grid grid-cols-3 gap-2">
                    <div><span className="text-purple-700">PhonePe:</span> {fmtInr(digitalTotals.phonepe)}</div>
                    <div><span className="text-blue-900">SBI:</span> {fmtInr(digitalTotals.sbi)}</div>
                    <div><span className="text-red-700">ICICI:</span> {fmtInr(digitalTotals.icici)}</div>
                    <div><span className="text-cyan-600">Paytm:</span> {fmtInr(digitalTotals.paytm)}</div>
                    <div><span className="text-orange-600">DT Plus:</span> {fmtInr(digitalTotals.dt_plus)}</div>
                    <div><span className="text-emerald-700">NEFT:</span> {fmtInr(digitalTotals.neft)}</div>
                  </div>
                </div>
              )}
            </div>

            {/* EXPENSES & CREDITS SECTION */}
            <div className="space-y-6">
              <div className="space-y-3">
                <h3 className="font-bold text-amber-700">Expenses</h3>
                <div className="space-y-2">
                  {expenses.map(e => (
                    <div key={e.id} className="bg-white p-2 rounded border text-sm flex justify-between items-center">
                      <div>
                        <div className="font-semibold">{e.category}</div>
                        {e.comment && <div className="text-xs text-gray-500">{e.comment}</div>}
                      </div>
                      <div className="font-bold text-amber-800">{fmtInr(e.amount)}</div>
                    </div>
                  ))}
                  {expenses.length === 0 && <div className="text-sm text-gray-500">No expenses</div>}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-bold text-red-600">Credit</h3>
                <div className="space-y-2">
                  {credits.map(c => (
                    <div key={c.id} className="bg-white p-2 rounded border text-sm flex justify-between items-center">
                      <div>
                        <div className="font-semibold">{c.customer?.name}</div>
                        <div className="text-xs text-gray-500">
                          {c.entry_type === 'sale' ? `${c.fuel_type} ${c.liters ? fmtL(c.liters) : ''}` : `Payment: ${c.pay_mode}`}
                        </div>
                      </div>
                      <div className={`font-bold ${c.entry_type === 'sale' ? 'text-red-600' : 'text-emerald-600'}`}>
                        {c.entry_type === 'sale' ? '-' : '+'}{fmtInr(c.amount)}
                      </div>
                    </div>
                  ))}
                  {credits.length === 0 && <div className="text-sm text-gray-500">No credits</div>}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'master' && (
          <div className="bg-white rounded-lg p-2 border border-gray-200">
            {!isOwner ? (
              <div className="p-8 text-center text-gray-500">You do not have permission to edit Master entries for past dates.</div>
            ) : (
              <MasterForm inlineDate={date} onSaved={handleSaved} />
            )}
          </div>
        )}

        {activeTab === 'expense' && (
          <div className="bg-white rounded-lg p-2 border border-gray-200">
            {!isOwner ? (
              <div className="p-8 text-center text-gray-500">You do not have permission to edit Expenses for past dates.</div>
            ) : (
              <ExpenseForm inlineDate={date} onSaved={handleSaved} />
            )}
          </div>
        )}

        {activeTab === 'credit' && (
          <div className="bg-white rounded-lg p-2 border border-gray-200">
            {!isOwner ? (
              <div className="p-8 text-center text-gray-500">You do not have permission to edit Credit entries for past dates.</div>
            ) : (
              <CreditForm inlineDate={date} onSaved={handleSaved} />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
