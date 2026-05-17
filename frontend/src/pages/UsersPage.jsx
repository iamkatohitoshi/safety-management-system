import React, { useState, useEffect, useMemo } from 'react'
import {
  UserCircle,
  Search,
  Shield,
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  RefreshCw,
  Mail,
  Calendar,
  UserCheck,
  Users as UsersIcon,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '../stores/AuthContext'

const ROLE_STYLES = {
  admin: 'bg-purple-100 text-purple-700 border-purple-200',
  approver: 'bg-safety-blue/10 text-safety-blue border-safety-blue/20',
  supervisor: 'bg-safety-amber/10 text-safety-amber border-safety-amber/20',
  worker: 'bg-gray-100 text-gray-700 border-gray-200',
  viewer: 'bg-safety-green/10 text-safety-green border-safety-green/20',
}

const ROLE_ICONS = {
  admin: ShieldAlert,
  approver: ShieldCheck,
  supervisor: Shield,
  worker: UserCircle,
  viewer: UserCheck,
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function RoleBadge({ role }) {
  const Icon = ROLE_ICONS[role] || UserCircle
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
        ROLE_STYLES[role] || 'bg-gray-100 text-gray-600 border-gray-200'
      }`}
    >
      <Icon className="w-3 h-3" />
      {role || 'unknown'}
    </span>
  )
}

export default function UsersPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Simulate a short loading for a polished experience
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600)
    return () => clearTimeout(timer)
  }, [])

  // Check admin access
  if (user?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="p-4 bg-safety-red/10 rounded-full mb-4">
          <ShieldAlert className="w-8 h-8 text-safety-red" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-sm text-gray-500 max-w-md text-center">
          You do not have permission to view this page. Only administrators can
          manage team members.
        </p>
      </div>
    )
  }

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-gray-200 rounded" />
        <div className="flex items-center gap-4">
          <div className="h-10 w-72 bg-gray-200 rounded-lg" />
        </div>
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <div className="h-8 w-full bg-gray-200 rounded" />
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 border-b border-gray-100 last:border-b-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 w-32 bg-gray-200 rounded mb-1" />
                  <div className="h-3 w-48 bg-gray-200 rounded" />
                </div>
                <div className="h-6 w-20 bg-gray-200 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Build user list from context (current user only)
  const users = useMemo(() => {
    if (!user) return []
    return [
      {
        id: user.id || user._id || 'current-user',
        name: user.name || 'Current User',
        email: user.email || '',
        role: user.role || 'worker',
        createdAt: user.createdAt || null,
        isCurrentUser: true,
      },
    ]
  }, [user])

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users
    const q = searchQuery.toLowerCase()
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
    )
  }, [users, searchQuery])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-50 rounded-xl">
            <UsersIcon className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Team Members</h1>
            <p className="text-sm text-gray-500">
              Manage users, roles, and permissions
            </p>
          </div>
        </div>
      </div>

      {/* Info card */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 rounded-xl p-5 flex items-start gap-4">
        <div className="p-2 bg-purple-100 rounded-lg flex-shrink-0">
          <Sparkles className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-purple-900 mb-1">
            User Management — Coming Soon
          </h3>
          <p className="text-sm text-purple-700/80">
            Full user management is under development. You'll soon be able to
            invite new members, edit roles, and manage permissions from this page.
            For now, you can see your own account details below.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name or email..."
          className="pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 w-full"
        />
      </div>

      {/* Users table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-5 py-3.5 font-medium text-gray-600 text-xs uppercase tracking-wider">
                  User
                </th>
                <th className="px-5 py-3.5 font-medium text-gray-600 text-xs uppercase tracking-wider">
                  Email
                </th>
                <th className="px-5 py-3.5 font-medium text-gray-600 text-xs uppercase tracking-wider">
                  Role
                </th>
                <th className="px-5 py-3.5 font-medium text-gray-600 text-xs uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-5 py-3.5 font-medium text-gray-600 text-xs uppercase tracking-wider text-right">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.map((u) => (
                <tr
                  key={u.id}
                  className={`hover:bg-gray-50 transition-colors ${
                    u.isCurrentUser ? 'bg-primary-50/30' : ''
                  }`}
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                          u.isCurrentUser
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">
                            {u.name}
                          </span>
                          {u.isCurrentUser && (
                            <span className="text-[10px] font-medium text-primary-600 bg-primary-100 px-1.5 py-0.5 rounded">
                              You
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <Mail className="w-3.5 h-3.5 text-gray-400" />
                      <span>{u.email || 'No email'}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <RoleBadge role={u.role} />
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{formatDate(u.createdAt)}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-safety-green/10 text-safety-green">
                      Active
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty state */}
        {filteredUsers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="p-4 bg-gray-50 rounded-full mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No users found
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Try adjusting your search query.
            </p>
            <button
              onClick={() => setSearchQuery('')}
              className="btn-secondary"
            >
              Clear Search
            </button>
          </div>
        )}
      </div>

      {/* Placeholder for future features */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          Feature Roadmap
        </h3>
        <div className="space-y-2">
          {[
            { label: 'Invite team members via email', ready: false },
            { label: 'Edit user roles and permissions', ready: false },
            { label: 'Remove / deactivate users', ready: false },
            { label: 'View login activity history', ready: false },
          ].map((feature, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2.5 text-sm py-1"
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  feature.ready ? 'bg-safety-green' : 'bg-gray-300'
                }`}
              />
              <span
                className={
                  feature.ready ? 'text-gray-900' : 'text-gray-400'
                }
              >
                {feature.label}
              </span>
              {!feature.ready && (
                <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                  Coming soon
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
