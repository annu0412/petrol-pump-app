'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRole } from '@/lib/user-context'
import { OrgMemberDetail, Invitation } from '@/types'
import { Copy, Link2, Trash2, UserPlus, RefreshCw, CheckCircle, Shield } from 'lucide-react'

const ROLE_BADGE: Record<string, string> = {
  owner:   'bg-[#003087] text-white',
  manager: 'bg-amber-100 text-amber-800',
  staff:   'bg-gray-100 text-gray-600',
}

export default function MembersPage() {
  const role = useRole()
  const isOwner = role === 'owner'
  const [supabase] = useState(() => createClient())

  const [members, setMembers] = useState<OrgMemberDetail[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState('')

  const [inviteRole, setInviteRole] = useState<'manager' | 'staff'>('manager')
  const [generatedLink, setGeneratedLink] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setCurrentUserId(user.id)
      await loadData()
      setLoading(false)
    }
    init()
  }, [])

  const loadData = async () => {
    const { data: mem } = await supabase.rpc('get_org_members')
    setMembers((mem as OrgMemberDetail[]) ?? [])

    if (isOwner) {
      const { data: inv } = await supabase
        .from('invitations')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
      setInvitations((inv as Invitation[]) ?? [])
    }
  }

  const handleGenerateLink = async () => {
    setGenerating(true)
    setGeneratedLink('')
    setGenerateError('')
    const { data: token, error } = await supabase.rpc('create_invitation', { p_role: inviteRole })
    if (error) {
      setGenerateError(error.message)
    } else if (token) {
      setGeneratedLink(`${window.location.origin}/join?token=${token}`)
      await loadData()
    } else {
      setGenerateError('No token returned. Please check the database migration has been applied.')
    }
    setGenerating(false)
  }

  const handleCopy = async (link: string) => {
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRoleChange = async (memberId: string, newRole: string) => {
    await supabase.from('org_members').update({ role: newRole }).eq('id', memberId)
    setMembers(prev => prev.map(m => m.member_id === memberId ? { ...m, role: newRole } : m))
  }

  const handleToggleActive = async (memberId: string, active: boolean) => {
    await supabase.from('org_members').update({ is_active: !active }).eq('id', memberId)
    setMembers(prev => prev.map(m => m.member_id === memberId ? { ...m, is_active: !active } : m))
  }

  const handleRevokeInvite = async (inviteId: string) => {
    await supabase.from('invitations').update({ status: 'revoked' }).eq('id', inviteId)
    setInvitations(prev => prev.filter(i => i.id !== inviteId))
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="text-gray-400 text-sm">Loading…</div>
    </div>
  )

  const activeMembers = members.filter(m => m.is_active)
  const inactiveMembers = members.filter(m => !m.is_active)

  return (
    <div className="fade-up">
      <div className="page-title">Team Members</div>
      <div className="page-sub">Manage who has access to this pump</div>

      {/* Active members */}
      <div className="card overflow-hidden mb-4">
        <div className="px-4 py-3 border-b border-gray-100 font-display font-bold text-[#003087]">
          Members ({activeMembers.length})
        </div>
        {activeMembers.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-sm">No members yet</div>
        ) : activeMembers.map(m => (
          <div key={m.member_id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0">
            <div className="w-9 h-9 rounded-full bg-[#003087] flex items-center justify-center text-white text-sm font-bold shrink-0">
              {m.email.slice(0, 1).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-gray-800 truncate">
                {m.email}
                {m.user_id === currentUserId && <span className="ml-1.5 text-[10px] text-blue-500 font-normal">You</span>}
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5 ${ROLE_BADGE[m.role] ?? ROLE_BADGE.staff}`}>
                {m.role.toUpperCase()}
              </span>
            </div>

            {/* Owner-only controls (can't edit yourself or other owners) */}
            {isOwner && m.role !== 'owner' && m.user_id !== currentUserId && (
              <div className="flex items-center gap-1.5 shrink-0">
                <select
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#003087]"
                  value={m.role}
                  onChange={e => handleRoleChange(m.member_id, e.target.value)}>
                  <option value="manager">Manager</option>
                  <option value="staff">Staff</option>
                </select>
                <button
                  onClick={() => handleToggleActive(m.member_id, m.is_active)}
                  className="text-xs px-2 py-1.5 rounded-lg border text-red-500 border-red-200 hover:bg-red-50 transition-colors">
                  Deactivate
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Inactive members — owner only */}
      {isOwner && inactiveMembers.length > 0 && (
        <div className="card overflow-hidden mb-4">
          <div className="px-4 py-3 border-b border-gray-100 font-display font-bold text-gray-400">
            Inactive ({inactiveMembers.length})
          </div>
          {inactiveMembers.map(m => (
            <div key={m.member_id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0 opacity-60">
              <div className="w-9 h-9 rounded-full bg-gray-300 flex items-center justify-center text-white text-sm font-bold shrink-0">
                {m.email.slice(0, 1).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-gray-600 truncate">{m.email}</div>
                <span className="text-[10px] text-gray-400">Inactive · was {m.role}</span>
              </div>
              <button
                onClick={() => handleToggleActive(m.member_id, m.is_active)}
                className="text-xs px-2 py-1.5 rounded-lg border text-emerald-600 border-emerald-200 hover:bg-emerald-50 transition-colors shrink-0">
                Reactivate
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Invite section — owner only */}
      {isOwner && (
        <>
          <div className="card p-4 mb-4">
            <div className="font-display font-bold text-[#003087] mb-1 flex items-center gap-2">
              <UserPlus size={16} /> Invite New User
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Generate a link and share it. The person signs in or creates an account, then automatically joins this pump with the role you choose. Links expire after 7 days.
            </p>

            <div className="flex gap-2 mb-3">
              <select
                className="field-input flex-1"
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value as 'manager' | 'staff')}>
                <option value="manager">Manager — can add/edit today's data</option>
                <option value="staff">Staff — view-only access</option>
              </select>
              <button
                className="btn-primary px-4 shrink-0 flex items-center gap-1.5"
                onClick={handleGenerateLink}
                disabled={generating}>
                {generating
                  ? <RefreshCw size={14} className="animate-spin" />
                  : <><Link2 size={14} /> Generate</>}
              </button>
            </div>

            {generateError && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2 text-xs mb-3">
                {generateError}
              </div>
            )}

            {generatedLink && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                <div className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-1">
                  <Shield size={12} /> Invite link — valid for 7 days
                </div>
                <div className="flex items-start gap-2">
                  <div className="text-xs text-blue-600 flex-1 font-mono break-all leading-snug">{generatedLink}</div>
                  <button
                    onClick={() => handleCopy(generatedLink)}
                    className="shrink-0 p-2 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 transition-colors">
                    {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Pending invitations */}
          {invitations.length > 0 && (
            <div className="card overflow-hidden mb-4">
              <div className="px-4 py-3 border-b border-gray-100 font-display font-bold text-[#003087]">
                Pending Invitations ({invitations.length})
              </div>
              {invitations.map(inv => (
                <div key={inv.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0">
                  <div className="flex-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${ROLE_BADGE[inv.role] ?? ROLE_BADGE.staff}`}>
                      {inv.role.toUpperCase()}
                    </span>
                    <div className="text-xs text-gray-400 mt-1 font-mono">{inv.token}</div>
                    <div className="text-xs text-gray-400">
                      Expires {new Date(inv.expires_at).toLocaleDateString('en-IN')}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleCopy(`${window.location.origin}/join?token=${inv.token}`)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                      <Copy size={14} />
                    </button>
                    <button
                      onClick={() => handleRevokeInvite(inv.id)}
                      className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
