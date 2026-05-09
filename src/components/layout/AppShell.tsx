'use client'
import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { UserContext } from '@/types'
import { createClient } from '@/lib/supabase'
import { UserContextProvider } from '@/lib/user-context'
import {
  LayoutDashboard, ClipboardList, Receipt, CreditCard,
  History, Settings, LogOut, Fuel
} from 'lucide-react'

const NAV = [
  { href: '/',        icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/master',  icon: ClipboardList,   label: 'Master' },
  { href: '/expense', icon: Receipt,         label: 'Expense' },
  { href: '/credit',  icon: CreditCard,      label: 'Credit' },
  { href: '/history', icon: History,         label: 'History' },
]

export default function AppShell({ children, ctx }: { children: React.ReactNode; ctx: UserContext }) {
  const path = usePathname()
  const router = useRouter()
  const [supabase] = useState(() => createClient())

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isActive = (href: string) =>
    href === '/' ? path === '/' : path.startsWith(href)

  return (
    <div className="flex flex-col min-h-screen">

      {/* ── TOP HEADER ── */}
      <header className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-4"
              style={{background:'#003087', boxShadow:'0 2px 12px rgba(0,0,0,.25)'}}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
               style={{background:'linear-gradient(135deg,#ffd700,#ff8b00)'}}>
            <Fuel size={16} className="text-[#003087]" strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-display font-bold text-white text-base leading-none">{ctx.orgName}</div>
            <div className="text-blue-200 text-[10px] leading-none mt-0.5 capitalize">{ctx.role}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a href="/settings/org"
             className="text-blue-200 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors">
            <Settings size={18} />
          </a>
          <button onClick={handleLogout}
                  className="text-blue-200 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 pt-14 pb-nav">
        <div className="max-w-2xl mx-auto px-3 py-4">
          <UserContextProvider value={{ role: ctx.role, orgId: ctx.orgId }}>
            {children}
          </UserContextProvider>
        </div>
      </main>

      {/* ── BOTTOM NAV ── */}
      <nav className="bottom-nav">
        {NAV.map(({ href, icon: Icon, label }) => (
          <a key={href} href={href}
             className={`bottom-nav-item ${isActive(href) ? 'active' : ''}`}>
            <Icon size={20} strokeWidth={isActive(href) ? 2.5 : 1.8} />
            <span>{label}</span>
          </a>
        ))}
      </nav>
    </div>
  )
}
