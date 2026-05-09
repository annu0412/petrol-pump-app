export function canManage(role: string) {
  return role === 'owner' || role === 'manager'
}

// Check if user is owner
export function isOwner(role: string) {
  return role === 'owner'
}
