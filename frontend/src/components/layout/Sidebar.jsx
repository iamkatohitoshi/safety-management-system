import React, { useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  ClipboardList,
  GitMerge,
  Users,
  FileCheck,
  Shield,
  Wrench,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  UserCircle,
  ChevronDown,
  ChevronRight,
  LogOut,
  Menu,
  X,
  ChevronLeft,
} from 'lucide-react'
import { useAuth } from '../../stores/AuthContext'

const mainMenu = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'Forms', icon: ClipboardList, path: '/forms' },
  { label: 'Workflows', icon: GitMerge, path: '/workflows' },
]

const moduleSubmenu = [
  { label: 'Toolbox Meeting', icon: Users, path: '/modules/toolbox' },
  { label: 'Permit-to-Work', icon: FileCheck, path: '/modules/ptw' },
  { label: 'Safety Inspection', icon: Shield, path: '/modules/inspection' },
  { label: 'Equipment', icon: Wrench, path: '/modules/equipment' },
  { label: 'Safety Action', icon: AlertTriangle, path: '/modules/action' },
]

const bottomMenu = [
  { label: 'Approvals', icon: CheckCircle, path: '/approvals' },
  { label: 'Reports', icon: BarChart3, path: '/reports' },
  { label: 'Users / Team', icon: UserCircle, path: '/users', adminOnly: true },
]

export default function Sidebar({ collapsed, setCollapsed }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [modulesOpen, setModulesOpen] = useState(
    location.pathname.startsWith('/modules')
  )

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <aside
      className={`fixed left-0 top-0 h-full bg-slate-900 text-white flex flex-col transition-all duration-300 z-30 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Logo / Header */}
      <div className="flex items-center h-16 px-4 border-b border-slate-700/50">
        {collapsed ? (
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Shield className="w-4 h-4 text-white" />
          </div>
        ) : (
          <div className="flex items-center gap-3 w-full">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">SAFE</span>
            <div className="ml-auto">
              <button
                onClick={() => setCollapsed(true)}
                className="p-1 rounded-md hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
                title="Collapse sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin py-4 px-2 space-y-1">
        {/* Main menu items */}
        {mainMenu.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors duration-150 group ${
              isActive(item.path)
                ? 'bg-primary-600/20 text-primary-300 font-medium'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
            title={collapsed ? item.label : undefined}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}

        {/* Modules submenu */}
        <div>
          <button
            onClick={() => setModulesOpen(!modulesOpen)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors duration-150 ${
              location.pathname.startsWith('/modules')
                ? 'bg-primary-600/20 text-primary-300 font-medium'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
            title={collapsed ? 'Modules' : undefined}
          >
            <Shield className="w-5 h-5 flex-shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 text-left">Modules</span>
                {modulesOpen ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </>
            )}
          </button>

          {modulesOpen && !collapsed && (
            <div className="ml-2 mt-1 space-y-1 pl-3 border-l-2 border-slate-700/50">
              {moduleSubmenu.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150 ${
                    isActive(item.path)
                      ? 'bg-primary-600/20 text-primary-300 font-medium'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          )}
        </div>

        {/* Bottom menu items */}
        <div className="pt-4 mt-4 border-t border-slate-700/30 space-y-1">
          {bottomMenu.map((item) => {
            if (item.adminOnly && user?.role !== 'admin') return null
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors duration-150 ${
                  isActive(item.path)
                    ? 'bg-primary-600/20 text-primary-300 font-medium'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            )
          })}
        </div>
      </nav>

      {/* User info / Logout */}
      <div className={`border-t border-slate-700/50 p-3 ${collapsed ? 'flex justify-center' : ''}`}>
        {collapsed ? (
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg text-slate-400 hover:text-safety-red hover:bg-slate-800 transition-colors"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary-700 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold uppercase">
              {user?.name ? user.name.charAt(0) : '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.name || 'User'}
              </p>
              <span className="badge-blue text-[10px] uppercase tracking-wider">
                {user?.role || 'worker'}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-safety-red hover:bg-slate-800 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
