'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const [supabase] = useState(() => createClient())
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    if (!email || !password) { setError('Please enter email and password'); return }
    setLoading(true); setError('')
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError(error.message); setLoading(false); return }
      window.location.href = '/'
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong. Check console.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#003087] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
               style={{background:'linear-gradient(135deg,#ffd700,#ff8b00)'}}>
            <span className="font-display font-bold text-2xl text-[#003087]">HP</span>
          </div>
          <h1 className="font-display text-3xl font-bold text-white">Rupali HP Sales</h1>
          <p className="text-blue-200 text-sm mt-1">Petrol Pump Management</p>
        </div>

        {/* Card */}
        <div className="card p-6">
          <h2 className="font-display text-xl font-bold text-[#003087] mb-5">Sign in</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm mb-4">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="field-label">Email</label>
              <input className="field-input" type="email" placeholder="you@example.com"
                value={email} onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()} />
            </div>
            <div>
              <label className="field-label">Password</label>
              <input className="field-input" type="password" placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()} />
            </div>
            <button className="btn-primary w-full justify-center" onClick={handleLogin} disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in →'}
            </button>
          </div>

          <div className="mt-4 text-center text-sm text-gray-500">
            New pump owner?{' '}
            <a href="/register" className="text-[#003087] font-semibold hover:underline">
              Register here
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
