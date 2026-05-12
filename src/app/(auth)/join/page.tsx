
'use client'
import FuelLoading from '@/components/FuelLoading'
import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Fuel, CheckCircle, XCircle, Loader } from 'lucide-react'

type AuthTab = 'login' | 'register'

interface Preview {
  org_name: string
  role: string
  valid: boolean
}

import { Suspense } from 'react'

function JoinPageContent() {
  const params = useSearchParams()
  const router = useRouter()
  const token = params.get('token') ?? ''
  const [supabase] = useState(() => createClient())

  const [preview, setPreview] = useState<Preview | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)

  const [tab, setTab] = useState<AuthTab>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [accepting, setAccepting] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [acceptError, setAcceptError] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.rpc('get_invitation_preview', { p_token: token })
      setPreview((data as Preview[] | null)?.[0] ?? null)
      setLoadingPreview(false)

      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)
    }
    if (token) load()
    else setLoadingPreview(false)
  }, [token])

  const acceptInvite = async () => {
    setAccepting(true)
    setAcceptError('')
    const { error } = await supabase.rpc('accept_invitation', { p_token: token })
    if (error) {
      setAcceptError(error.message)
      setAccepting(false)
      return
    }
    setAccepted(true)
    setTimeout(() => router.push('/'), 1500)
  }

  // Auto-accept once user is authenticated
  useEffect(() => {
    if (currentUser && preview?.valid && !accepted && !accepting) {
      acceptInvite()
    }
  }, [currentUser, preview])

  const handleAuth = async () => {
    setAuthError('')
    if (tab === 'login') {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setAuthError(error.message); return }
      setCurrentUser(data.user)
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) { setAuthError(error.message); return }
      setCurrentUser(data.user)
    }
  }

  if (!token) return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="card p-6 max-w-sm w-full text-center">
        <XCircle size={36} className="text-red-400 mx-auto mb-3" />
        <div className="font-display font-bold text-gray-800">No invite token</div>
        <div className="text-sm text-gray-500 mt-1">This link appears to be incomplete.</div>
      </div>
    </div>
  )

  if (loadingPreview) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <FuelLoading size={24} text="Loading preview…" textClassName="text-gray-400 text-sm" />
    </div>
  )

  if (!preview || !preview.valid) return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="card p-6 max-w-sm w-full text-center">
        <XCircle size={36} className="text-red-400 mx-auto mb-3" />
        <div className="font-display font-bold text-gray-800">Invite Expired</div>
        <div className="text-sm text-gray-500 mt-1">This invite link has expired or already been used. Ask the owner to send a new one.</div>
      </div>
    </div>
  )

  if (accepted) return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="card p-6 max-w-sm w-full text-center">
        <CheckCircle size={36} className="text-emerald-500 mx-auto mb-3" />
        <div className="font-display font-bold text-gray-800">You're in!</div>
        <div className="text-sm text-gray-500 mt-1">Redirecting to dashboard…</div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center"
               style={{background: 'linear-gradient(135deg,#003087,#0050c8)'}}>
            <Fuel size={26} className="text-white" />
          </div>
          <div className="font-display font-bold text-xl text-gray-900">{preview.org_name}</div>
          <div className="text-sm text-gray-500 mt-1">
            You've been invited as{' '}
            <span className="font-semibold capitalize text-[#003087]">{preview.role}</span>
          </div>
        </div>

        {currentUser ? (
          /* Logged in — just confirm and accept */
          <div className="card p-5 text-center">
            <div className="text-sm text-gray-600 mb-4">
              Accepting as <span className="font-semibold">{currentUser.email}</span>
            </div>
            {acceptError && <div className="text-red-600 text-sm mb-3">{acceptError}</div>}
            <button className="btn-primary w-full justify-center" onClick={acceptInvite} disabled={accepting}>
              {accepting ? 'Joining…' : `Join as ${preview.role}`}
            </button>
          </div>
        ) : (
          /* Not logged in — sign in or register inline */
          <div className="card p-5">
            <div className="flex mb-4 border-b border-gray-100">
              {(['login', 'register'] as AuthTab[]).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`flex-1 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${tab === t ? 'border-[#003087] text-[#003087]' : 'border-transparent text-gray-400'}`}>
                  {t === 'login' ? 'Sign In' : 'Create Account'}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <div>
                <label className="field-label">Email</label>
                <input className="field-input" type="email" placeholder="you@example.com"
                  value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div>
                <label className="field-label">Password</label>
                <input className="field-input" type="password" placeholder="••••••••"
                  value={password} onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAuth()} />
              </div>
              {authError && <div className="text-red-600 text-xs">{authError}</div>}
              <button className="btn-primary w-full justify-center" onClick={handleAuth}>
                {tab === 'login' ? 'Sign In & Accept Invite' : 'Create Account & Accept Invite'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function JoinPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50"><FuelLoading size={24} text="Loading preview…" textClassName="text-gray-400 text-sm" /></div>}>
      <JoinPageContent />
    </Suspense>
  )
}
