import React, { useState, useEffect } from 'react'
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Users,
  FileCheck,
  Shield,
  Wrench,
  ClipboardList,
  TrendingUp,
  Calendar,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import client from '../api/client'

const statusIcons = {
  draft: Clock,
  submitted: AlertTriangle,
  in_review: Clock,
  approved: CheckCircle2,
  rejected: XCircle,
}

const statusColors = {
  draft: 'text-gray-500 bg-gray-100',
  submitted: 'text-safety-amber bg-amber-50',
  in_review: 'text-safety-blue bg-blue-50',
  approved: 'text-safety-green bg-green-50',
  rejected: 'text-safety-red bg-red-50',
}

const moduleIcons = {
  toolbox: Users,
  ptw: FileCheck,
  inspection: Shield,
  equipment: Wrench,
  action: AlertTriangle,
}

const moduleLabels = {
  toolbox: 'Toolbox Meetings',
  ptw: 'Permit-to-Work',
  inspection: 'Safety Inspections',
  equipment: 'Equipment',
  action: 'Safety Actions',
}

const moduleColors = {
  toolbox: 'bg-violet-50 text-violet-600 border-violet-200',
  ptw: 'bg-blue-50 text-blue-600 border-blue-200',
  inspection: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  equipment: 'bg-orange-50 text-orange-600 border-orange-200',
  action: 'bg-rose-50 text-rose-600 border-rose-200',
}

function StatCard({ label, value, icon: Icon, color, loading }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          {loading ? (
            <div className="skeleton h-8 w-16 mt-1" />
          ) : (
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {value ?? '—'}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color || 'bg-primary-50'}`}>
          {Icon && <Icon className={`w-5 h-5 ${label ? 'text-primary-600' : ''}`} />}
        </div>
      </div>
    </div>
  )
}

function StatusRow({ status, count, loading }) {
  const Icon = statusIcons[status]
  const color = statusColors[status] || ''
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-2.5">
        <div className={`p-1.5 rounded-md ${color}`}>
          {Icon && <Icon className="w-4 h-4" />}
        </div>
        <span className="text-sm font-medium text-gray-700 capitalize">
          {status.replace('_', ' ')}
        </span>
      </div>
      {loading ? (
        <div className="skeleton h-5 w-10" />
      ) : (
        <span className="text-sm font-semibold text-gray-900">{count ?? 0}</span>
      )}
    </div>
  )
}

function ModuleCard({ module: key, count, loading }) {
  const Icon = moduleIcons[key] || ClipboardList
  const label = moduleLabels[key] || key
  const color = moduleColors[key] || 'bg-gray-50 text-gray-600 border-gray-200'
  return (
    <div className={`card card-hover p-4 border-l-4 ${color.split(' ')[2] ? `border-l-${color.split(' ')[2].split('-')[0]}-500` : ''}`}>
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{label}</p>
          {loading ? (
            <div className="skeleton h-4 w-12 mt-1" />
          ) : (
            <p className="text-xs text-gray-500">{count ?? 0} submissions</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    client
      .get('/reports/summary')
      .then((res) => setData(res.data))
      .catch((err) => {
        setError(err.response?.data?.message || err.message || 'Failed to load dashboard data')
      })
      .finally(() => setLoading(false))
  }, [])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="p-4 bg-red-50 rounded-full mb-4">
          <AlertCircle className="w-8 h-8 text-safety-red" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          Failed to load dashboard
        </h3>
        <p className="text-sm text-gray-500 mb-4">{error}</p>
        <button
          onClick={() => {
            setLoading(true)
            setError(null)
            client.get('/reports/summary')
              .then((res) => setData(res.data))
              .catch((err) => setError(err.message))
              .finally(() => setLoading(false))
          }}
          className="btn-primary"
        >
          Try Again
        </button>
      </div>
    )
  }

  const summary = data?.summary || {}
  const statusBreakdown = data?.statusBreakdown || {}
  const categoryBreakdown = data?.categoryBreakdown || {}
  const expiringSoon = data?.expiringSoon || []

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-sm text-gray-500 mt-1">
          Overview of your safety management system
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Submissions"
          value={summary.totalSubmissions ?? summary.total}
          icon={FileText}
          color="bg-primary-50"
          loading={loading}
        />
        <StatCard
          label="Approved"
          value={summary.approved ?? statusBreakdown.approved}
          icon={CheckCircle2}
          color="bg-green-50"
          loading={loading}
        />
        <StatCard
          label="Pending Review"
          value={summary.pendingReview ?? statusBreakdown.in_review ?? statusBreakdown.submitted}
          icon={Clock}
          color="bg-amber-50"
          loading={loading}
        />
        <StatCard
          label="Rejected"
          value={summary.rejected ?? statusBreakdown.rejected}
          icon={XCircle}
          color="bg-red-50"
          loading={loading}
        />
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status breakdown */}
        <div className="lg:col-span-2">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900">
                Status Breakdown
              </h3>
              <TrendingUp className="w-4 h-4 text-gray-400" />
            </div>
            <div className="divide-y divide-gray-100">
              {['draft', 'submitted', 'in_review', 'approved', 'rejected'].map(
                (status) => (
                  <StatusRow
                    key={status}
                    status={status}
                    count={statusBreakdown[status]}
                    loading={loading}
                  />
                )
              )}
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* Category breakdown */}
          <div className="card p-5">
            <h3 className="text-base font-semibold text-gray-900 mb-4">
              By Module
            </h3>
            <div className="space-y-3">
              {['toolbox', 'ptw', 'inspection', 'equipment', 'action'].map(
                (mod) => (
                  <ModuleCard
                    key={mod}
                    module={mod}
                    count={categoryBreakdown[mod]}
                    loading={loading}
                  />
                )
              )}
            </div>
          </div>

          {/* Expiring soon */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-4 h-4 text-safety-amber" />
              <h3 className="text-base font-semibold text-gray-900">
                Expiring Soon
              </h3>
            </div>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="skeleton h-12 w-full rounded-lg" />
                ))}
              </div>
            ) : expiringSoon.length > 0 ? (
              <div className="space-y-2">
                {expiringSoon.slice(0, 5).map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-100"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {item.name || item.title || 'Item'}
                      </p>
                      <p className="text-xs text-safety-amber">
                        Expires {item.expiresAt ? new Date(item.expiresAt).toLocaleDateString() : 'soon'}
                      </p>
                    </div>
                    <AlertTriangle className="w-4 h-4 text-safety-amber flex-shrink-0" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-sm text-gray-400">No items expiring soon</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
