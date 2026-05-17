import React, { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Menu, Bell, User, LogOut, ChevronDown, Shield } from 'lucide-react'
import { useAuth } from '../../stores/AuthContext'

const routeTitles = {
  '/': 'Dashboard',
  '/forms': 'Form Builder',
  '/workflows': 'Workflow Engine',
  '/modules/toolbox': 'Toolbox Meeting',
  '/modules/ptw': 'Permit-to-Work',
  '/modules/inspection': 'Safety Inspection',
  '/modules/equipment': 'Equipment Management',
  '/modules/action': 'Safety Action',
  '/approvals': 'Approvals',
  '/reports': 'Reports',
  '/users': 'Users & Team',
}

export default function Header({ collapsed, setCollapsed }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef(null)

  const currentTitle = Object.entries(routeTitles).find(([path]) =>
    path === '/'
      ? location.pathname === '/'
      : location.pathname.startsWith(path)
  )?.[1] || 'Safety Management System'

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    setUserMenuOpen(false)
    logout()
    navigate('/login')
  }

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center px-4 lg:px-6 sticky top-0 z-20">
      {/* Left side */}
      <div className="flex items-center gap-3">
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            title="Expand sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div>
          <h1 className="text-lg font-semibold text-gray-900">{currentTitle}</h1>
          <p className="text-xs text-gray-500 hidden sm:block">
            Safety Management System
          </p>
        </div>
      </div>

      {/* Right side */}
      <div className="ml-auto flex items-center gap-3">
        {/* Notification bell */}
        <button
          className="relative p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          title="Notifications"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-safety-red rounded-full border-2 border-white"></span>
        </button>

        {/* User dropdown */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="w-7 h-7 bg-primary-600 rounded-full flex items-center justify-center text-white text-xs font-bold uppercase">
              {user?.name ? user.name.charAt(0) : '?'}
            </div>
            <span className="text-sm font-medium text-gray-700 hidden md:block">
              {user?.name || 'User'}
            </span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
                <span className="inline-block mt-1 badge-blue text-[10px] uppercase tracking-wider">
                  {user?.role || 'worker'}
                </span>
              </div>
              <button
                onClick={() => { setUserMenuOpen(false); navigate('/users') }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <User className="w-4 h-4" />
                Profile
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-safety-red hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
