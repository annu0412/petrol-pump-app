'use client'
import { createContext, useContext } from 'react'
import { Role } from '@/types'

interface UserCtxValue {
  role: Role
  orgId: string
}

const UserCtx = createContext<UserCtxValue | null>(null)

export function UserContextProvider({ value, children }: {
  value: UserCtxValue
  children: React.ReactNode
}) {
  return <UserCtx.Provider value={value}>{children}</UserCtx.Provider>
}

export function useRole(): Role {
  const ctx = useContext(UserCtx)
  if (!ctx) throw new Error('useRole must be used inside UserContextProvider')
  return ctx.role
}
