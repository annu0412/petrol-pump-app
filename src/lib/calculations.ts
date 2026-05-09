import { MasterEntry, DailySummaryCalc } from '@/types'

export function calcSaleLiters(open: number, close: number): number {
  return Math.max(0, close - open)
}

export function calcSaleInr(liters: number, rate: number): number {
  return Math.ceil(liters * rate)
}

export function calcDigital(entry: {
  phonepe: number; sbi: number; icici: number
  paytm: number; dt_plus: number; neft: number
}): number {
  return entry.phonepe + entry.sbi + entry.icici +
         entry.paytm + entry.dt_plus + entry.neft
}

export function calcDailySummary(params: {
  entries: MasterEntry[]
  totalExpense: number
  totalCredit: number
  prevCashInHand: number
  cashReceived: number
  bankDeposit: number
}): DailySummaryCalc {
  const { entries, totalExpense, totalCredit, prevCashInHand, cashReceived, bankDeposit } = params

  const totalSaleInr = entries.reduce((s, e) => s + (e.sale_inr ?? 0), 0)
  const totalDigital = entries.reduce((s, e) => s + calcDigital(e), 0)
  const cashGenerated = totalSaleInr - totalDigital - totalExpense - totalCredit + cashReceived
  const cashInHand = prevCashInHand + cashGenerated - bankDeposit

  return {
    totalSaleInr: round(totalSaleInr),
    totalDigital: round(totalDigital),
    totalExpense: round(totalExpense),
    totalCredit: round(totalCredit),
    cashGenerated: round(cashGenerated),
    bankDeposit: round(bankDeposit),
    cashInHand: round(cashInHand),
  }
}

export function calcCreditAmount(liters: number, rate: number): number {
  return Math.ceil(liters * rate)
}

export function round(n: number): number {
  return Math.ceil(n)
}

export function fmtInr(n: number | null | undefined, dec = 0): string {
  if (n == null) return '–'
  return '₹' + n.toLocaleString('en-IN', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  })
}

export function fmtL(n: number | null | undefined): string {
  if (n == null) return '–'
  return n.toLocaleString('en-IN') + ' L'
}
