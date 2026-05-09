'use client'

import { useRouter } from 'next/navigation'

export default function DashboardDateRangePicker({ startDate, endDate }: { startDate: string, endDate: string }) {
  const router = useRouter()

  return (
    <div className="flex items-center gap-2">
      <input
        type="date"
        value={startDate}
        onChange={(e) => router.push(`/?start=${e.target.value}&end=${endDate}`)}
        className="field-input w-auto text-sm py-1 px-2 bg-white rounded-md"
      />
      <span className="text-gray-400 text-sm">to</span>
      <input
        type="date"
        value={endDate}
        onChange={(e) => router.push(`/?start=${startDate}&end=${e.target.value}`)}
        className="field-input w-auto text-sm py-1 px-2 bg-white rounded-md"
      />
    </div>
  )
}
