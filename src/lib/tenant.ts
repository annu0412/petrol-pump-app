import { createServerSupabaseClient } from './supabase-server'
import { createAdminClient } from './supabase-admin'
import { UserContext } from '@/types'
import { redirect } from 'next/navigation'

// Get full user context (org, role, rates) — use in Server Components
export async function getUserContext(): Promise<UserContext> {
  const supabase = await createServerSupabaseClient()

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) redirect('/login')

    // Use the admin client so the org lookup is not affected by RLS/JWT
    // propagation issues in the Next.js dev server over LAN.
    // The user identity is already verified above via getUser().
    const admin = createAdminClient()
    const { data: member, error: memberError } = await admin
      .from('org_members')
      .select('org_id, role, organizations(name, hsd_rate, ms_rate)')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (memberError || !member) redirect('/register')

    const org = member.organizations as any

    return {
      userId: user.id,
      orgId: member.org_id,
      orgName: org.name,
      role: member.role,
      hsdRate: org.hsd_rate,
      msRate: org.ms_rate,
    }
  } catch (e) {
    if (e && typeof e === 'object' && 'digest' in e) throw e
    redirect('/login')
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
