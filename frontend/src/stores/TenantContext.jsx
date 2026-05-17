import React, { createContext, useContext, useMemo } from 'react'
import { useAuth } from './AuthContext'

const TenantContext = createContext(null)

export function TenantProvider({ children }) {
  const { user } = useAuth()

  const tenant = useMemo(() => {
    if (!user) return { tenantId: null, tenantName: null, tenantSlug: null }
    return {
      tenantId: user.tenantId || user.tenant?.id || null,
      tenantName: user.tenantName || user.tenant?.name || null,
      tenantSlug: user.tenantSlug || user.tenant?.slug || null,
    }
  }, [user])

  return <TenantContext.Provider value={tenant}>{children}</TenantContext.Provider>
}

export function useTenant() {
  const context = useContext(TenantContext)
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider')
  }
  return context
}

export default TenantContext
