import { createServerSupabaseClient } from './supabase-server'
import { UserContext } from '@/types'
import { redirect } from 'next/navigation'

// Get full user context (org, role, rates) — use in Server Components
export async function getUserContext(): Promise<UserContext> {
  const supabase = await createServerSupabaseClient()

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) redirect('/login')

    // Use the RPC to safely bypass RLS issues without needing the admin client
    const { data: member, error: memberError } = await supabase
      .rpc('get_my_context')
      .single()

    if (memberError || !member) redirect('/register')

    const typedMember = member as any

    return {
      userId: user.id,
      orgId: typedMember.org_id,
      orgName: typedMember.org_name,
      role: typedMember.role,
      hsdRate: typedMember.hsd_rate,
      msRate: typedMember.ms_rate,
    }
  } catch (e: any) {
    if (e && typeof e === 'object' && 'digest' in e) throw e
    const msg = e?.message || 'Server Error'
    redirect(`/login?error=${encodeURIComponent(msg)}`)
  }
}

// Check if user is owner or manager
export function canManage(role: string) {
  return role === 'owner' || role === 'manager'
}

// Check if user is owner
export function isOwner(role: string) {
  return role === 'owner'
}
