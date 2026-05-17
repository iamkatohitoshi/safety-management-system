import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { login as apiLogin, register as apiRegister, getMe } from '../api/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('safety_token'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const savedToken = localStorage.getItem('safety_token')
    if (savedToken) {
      setToken(savedToken)
      getMe()
        .then((userData) => {
          setUser(userData)
          localStorage.setItem('safety_user', JSON.stringify(userData))
        })
        .catch(() => {
          localStorage.removeItem('safety_token')
          localStorage.removeItem('safety_user')
          setToken(null)
          setUser(null)
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = useCallback(async (email, password) => {
    const result = await apiLogin(email, password)
    setToken(result.token)
    setUser(result.user)
    return result
  }, [])

  const register = useCallback(async (email, name, password, tenantSlug, role) => {
    const result = await apiRegister(email, name, password, tenantSlug, role)
    setToken(result.token)
    setUser(result.user)
    return result
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('safety_token')
    localStorage.removeItem('safety_user')
    setToken(null)
    setUser(null)
  }, [])

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!token && !!user,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext
