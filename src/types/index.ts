// ─────────────────────────────────────────────
// DATABASE TYPES
// ─────────────────────────────────────────────

export type Role = 'owner' | 'manager' | 'staff'
export type FuelType = 'HSD' | 'MS' | 'DEF'
export type Shift = 'day' | 'night' | 'both'
export type EntryType = 'sale' | 'payment'
export type PayMode = 'cash' | 'online' | 'dt' | 'cheque'

export interface Organization {
  id: string
  name: string
  address: string | null
  city: string | null
  state: string | null
  mobile: string | null
  hsd_rate: number
  ms_rate: number
  def_rate: number
  plan: 'free' | 'pro'
  created_at: string
}

export interface OrgMember {
  id: string
  org_id: string
  user_id: string
  role: Role
  is_active: boolean
  joined_at: string
}

export interface Machine {
  id: string
  org_id: string
  name: string
  fuel_type: FuelType
  nozzle_count: number
  display_order: number
  is_active: boolean
  created_at: string
}

export interface Employee {
  id: string
  org_id: string
  user_id: string | null
  name: string
  mobile: string | null
  role: 'operator' | 'manager'
  shift: Shift
  salary: number | null
  is_active: boolean
  created_at: string
}

export interface Customer {
  id: string
  org_id: string
  name: string
  firm_name: string | null
  mobile: string | null
  gst_no: string | null
  address: string | null
  opening_balance: number
  is_active: boolean
  created_at: string
}

export interface MasterEntry {
  id: string
  org_id: string
  date: string
  machine_id: string
  reading_open: number
  reading_close: number
  sale_liters: number
  fuel_rate: number
  sale_inr: number
  operator_id: string | null
  phonepe: number
  sbi: number
  icici: number
  paytm: number
  dt_plus: number
  neft: number
  additive: number
  def_liters: number
  hsd_stock_in: number
  ms_stock_in: number
  notes: string | null
  created_at: string
  // Joined
  machine?: Machine
  operator?: Employee
}

export interface DailySummary {
  id: string
  org_id: string
  date: string
  total_sale_inr: number
  total_digital: number
  total_expense: number
  total_credit: number
  cash_received: number
  prev_cash_in_hand: number
  cash_in_hand: number
  bank_deposit: number
  genset_reading: number | null
  notes: string | null
  created_at: string
}

export interface Expense {
  id: string
  org_id: string
  date: string
  amount: number
  category: string
  comment: string | null
  created_by: string | null
  created_at: string
}

export interface CreditEntry {
  id: string
  org_id: string
  customer_id: string
  date: string
  entry_type: EntryType
  fuel_type: FuelType | null
  liters: number | null
  amount: number
  vehicle_no: string | null
  receipt_no: number | null
  pay_mode: PayMode | null
  def_cash: number
  notes: string | null
  created_at: string
  // Joined
  customer?: Customer
}

// ─────────────────────────────────────────────
// APP STATE TYPES
// ─────────────────────────────────────────────

export interface UserContext {
  userId: string
  orgId: string
  orgName: string
  role: Role
  hsdRate: number
  msRate: number
}

export interface MasterFormRow {
  machineId: string
  machineName: string
  fuelType: FuelType
  readingOpen: string
  readingClose: string
  operatorId: string
  phonepe: string
  sbi: string
  icici: string
  paytm: string
  dtPlus: string
  neft: string
}

export interface OrgMemberDetail {
  member_id: string
  user_id: string
  email: string
  role: string
  is_active: boolean
  joined_at: string
}

export interface Invitation {
  id: string
  org_id: string
  role: string
  token: string
  status: string
  created_at: string
  expires_at: string
}

export interface DailySummaryCalc {
  totalSaleInr: number
  totalDigital: number
  totalExpense: number
  totalCredit: number
  cashGenerated: number
  bankDeposit: number
  cashInHand: number
}

export const EXPENSE_CATEGORIES = [
  'Chai',
  'MS Test',
  'HSD Test',
  'DG',
  'Petrol',
  'Salary',
  'Tanker Inaam',
  'Dezire',
  'Nexon',
  'Others',
] as const

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number]
