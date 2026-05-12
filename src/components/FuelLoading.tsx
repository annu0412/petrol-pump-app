import React from 'react'
import { Fuel } from 'lucide-react'

export default function FuelLoading({ size = 24, text = 'Processing…', textClassName = '' }: { size?: number, text?: string, textClassName?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative inline-flex items-end justify-center" style={{ width: size, height: size }}>
        {/* Background icon */}
        <Fuel size={size} className="text-gray-300 absolute inset-0 z-10 opacity-30" />
        {/* Filling liquid */}
        <div className="absolute bottom-0 w-full rounded-b-md overflow-hidden z-20" style={{ height: '100%', left: 0, right: 0 }}>
          <div className="fuel-loader-fill w-full bottom-0 absolute" style={{ height: '0%' }}></div>
        </div>
        {/* Foreground icon border */}
        <Fuel size={size} className="text-[#003087] absolute inset-0 z-30" />
      </div>
      {text && <span className={`font-semibold ${textClassName}`}>{text}</span>}
    </div>
  )
}
