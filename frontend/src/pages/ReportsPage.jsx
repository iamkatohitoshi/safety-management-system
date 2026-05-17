import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  BarChart3,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Download,
  Users,
  FileCheck,
  Shield,
  Wrench,
  AlertTriangle,
  Calendar,
  TrendingUp,
  Activity,
} from 'lucide-react'
import client from '../api/client'
import { useTenant } from '../stores/TenantContext'

const CATEGORY_CONFIG = {
  toolbox: { label: 'Toolbox Meeting', icon: Users },
  ptw: { label: 'Permit-to-Work', icon: FileCheck },
  inspection: { label: 'Safety Inspection', icon: Shield },
  equipment: { label: 'Equipment', icon: Wrench },
  action: { label: 'Safety Action', icon: AlertTriangle },
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

function StatCard({ label, value, color, icon: Icon, subtitle }) {
  const colorMap = {
    blue: 'bg-safety-blue/10 text-safety-blue border-safety-blue/20',
    green: 'bg-safety-green/10 text-safety-green border-safety-green/20',
    amber: 'bg-safety-amber/10 text-safety-amber border-safety-amber/20',
    red: 'bg-safety-red/10 text-safety-red border-safety-red/20',
    gray: 'bg-gray-100 text-gray-600 border-gray-200',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200',
  }
  return (
    <div
      className={`card p-5 border-l-4 ${colorMap[color] || colorMap.gray}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{label}</p>
          <p className="text-3xl font-bold text-gray-900">{value ?? 0}</p>
          {subtitle && (
            <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
          )}
        </div>
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
            colorMap[color] || colorMap.gray
          }`}
        >
          {Icon && <Icon className="w-5 h-5" />}
        </div>
      </div>
    </div>
  )
}

function CategoryBreakdownCard({ category, config, total, approved, pending, rejected }) {
  const Icon = config.icon
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center">
          <Icon className="w-4.5 h-4.5 text-primary-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">{config.label}</p>
          <p className="text-xs text-gray-400">{total} submissions</p>
        </div>
      </div>
      <div className="space-y-2.5">
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-500">Approved</span>
            <span className="font-medium text-safety-green">
              {total > 0 ? Math.round((approved / total) * 100) : 0}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-safety-green rounded-full transition-all duration-500"
              style={{
                width: `${total > 0 ? (approved / total) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-500">Pending</span>
            <span className="font-medium text-safety-amber">
              {total > 0 ? Math.round((pending / total) * 100) : 0}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-safety-amber rounded-full transition-all duration-500"
              style={{
                width: `${total > 0 ? (pending / total) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-500">Rejected</span>
            <span className="font-medium text-safety-red">
              {total > 0 ? Math.round((rejected / total) * 100) : 0}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-safety-red rounded-full transition-all duration-500"
              style={{
                width: `${total > 0 ? (rejected / total) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-gray-100">
        <div className="text-center">
          <p className="text-xs text-gray-400">Approved</p>
          <p className="text-sm font-semibold text-safety-green">{approved}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-400">Pending</p>
          <p className="text-sm font-semibold text-safety-amber">{pending}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-400">Rejected</p>
          <p className="text-sm font-semibold text-safety-red">{rejected}</p>
        </div>
      </div>
    </div>
  )
}

export default function ReportsPage() {
  const { tenantId } = useTenant()
  const [summary, setSummary] = useState(null)
  const [allSubmissions, setAllSubmissions] = useState([])
  const [formDefinitions, setFormDefinitions] = useState([])
  const [equipment, setEquipment] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedFormDef, setSelectedFormDef] = useState('')
  const [formDefSubmissions, setFormDefSubmissions] = useState([])

  const fetchData = useCallback(async () => {
    if (!tenantId) return
    setLoading(true)
    setError(null)
    try {
      const [summaryRes, subsRes, defsRes, equipRes] = await Promise.all([
        client.get('/api/reports/summary', { params: { tenantId } }).catch(() => ({ data: {} })),
        client.get('/api/form-submissions', { params: { tenantId } }).catch(() => ({ data: [] })),
        client.get('/api/form-definitions', { params: { tenantId } }).catch(() => ({ data: [] })),
        client.get('/api/equipment', { params: { tenantId } }).catch(() => ({ data: [] })),
      ])

      const summaryData = summaryRes.data?.data || summaryRes.data || {}
      const subs = Array.isArray(subsRes.data) ? subsRes.data : subsRes.data?.data || []
      const defs = Array.isArray(defsRes.data) ? defsRes.data : defsRes.data?.data || []
      const equip = Array.isArray(equipRes.data) ? equipRes.data : equipRes.data?.data || []

      setSummary(summaryData)
      setAllSubmissions(subs)
      setFormDefinitions(defs)
      setEquipment(equip)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load report data')
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const breakdown = {}
    for (const [cat, config] of Object.entries(CATEGORY_CONFIG)) {
      const catSubs = allSubmissions.filter((s) => s.category === cat)
      breakdown[cat] = {
        total: catSubs.length,
        approved: catSubs.filter((s) => s.status === 'approved').length,
        pending: catSubs.filter((s) => s.status === 'submitted' || s.status === 'in_review').length,
        rejected: catSubs.filter((s) => s.status === 'rejected').length,
      }
    }
    return breakdown
  }, [allSubmissions])

  // Overall stats
  const overallStats = useMemo(() => {
    const total = allSubmissions.length
    const approved = allSubmissions.filter((s) => s.status === 'approved').length
    const pending = allSubmissions.filter(
      (s) => s.status === 'submitted' || s.status === 'in_review'
    ).length
    const rejected = allSubmissions.filter((s) => s.status === 'rejected').length
    const draft = allSubmissions.filter((s) => s.status === 'draft').length
    return { total, approved, pending, rejected, draft }
  }, [allSubmissions])

  // Equipment stats
  const equipmentStats = useMemo(() => {
    const total = equipment.length
    const expiringSoon = equipment.filter((e) => {
      const expDate = e.certExpiry || e.expiryDate
      if (!expDate) return false
      const daysLeft = (new Date(expDate) - new Date()) / (1000 * 60 * 60 * 24)
      return daysLeft >= 0 && daysLeft <= 30
    }).length
    const expired = equipment.filter((e) => {
      const expDate = e.certExpiry || e.expiryDate
      if (!expDate) return false
      return new Date(expDate) < new Date()
    }).length
    return { total, expiringSoon, expired }
  }, [equipment])

  // Fetch submissions for selected form def
  const fetchFormDefSubmissions = useCallback(
    async (formDefId) => {
      if (!formDefId) {
        setFormDefSubmissions([])
        return
      }
      try {
        const res = await client
          .get('/api/form-submissions', { params: { tenantId, formDefinitionId: formDefId } })
          .catch(() => ({ data: [] }))
        const subs = Array.isArray(res.data) ? res.data : res.data?.data || []
        setFormDefSubmissions(subs)
      } catch {
        setFormDefSubmissions([])
      }
    },
    [tenantId]
  )

  useEffect(() => {
    fetchFormDefSubmissions(selectedFormDef)
  }, [selectedFormDef, fetchFormDefSubmissions])

  const formDefStatusBreakdown = useMemo(() => {
    if (!selectedFormDef || formDefSubmissions.length === 0) return null
    const total = formDefSubmissions.length
    const approved = formDefSubmissions.filter((s) => s.status === 'approved').length
    const rejected = formDefSubmissions.filter((s) => s.status === 'rejected').length
    const pending = formDefSubmissions.filter(
      (s) => s.status === 'submitted' || s.status === 'in_review'
    ).length
    const draft = formDefSubmissions.filter((s) => s.status === 'draft').length
    return { total, approved, rejected, pending, draft }
  }, [selectedFormDef, formDefSubmissions])

  // Loading
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-gray-200 rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card p-5">
              <div className="h-3 w-20 bg-gray-200 rounded mb-2" />
              <div className="h-8 w-16 bg-gray-200 rounded mb-1" />
              <div className="h-3 w-32 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
        <div className="h-6 w-40 bg-gray-200 rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="card p-5">
              <div className="h-4 w-28 bg-gray-200 rounded mb-3" />
              <div className="space-y-2">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="h-3 w-full bg-gray-200 rounded" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Error
  if (error && allSubmissions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="p-4 bg-safety-red/10 rounded-full mb-4">
          <AlertCircle className="w-8 h-8 text-safety-red" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Failed to load reports
        </h3>
        <p className="text-sm text-gray-500 mb-6 max-w-md text-center">{error}</p>
        <button onClick={fetchData} className="btn-primary">
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 rounded-xl">
            <BarChart3 className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Reports & Analytics</h1>
            <p className="text-sm text-gray-500">
              Overview of all safety management activity
            </p>
          </div>
        </div>
        {allSubmissions.length > 0 && (
          <button className="btn-secondary text-xs">
            <Download className="w-4 h-4 mr-1.5" />
            Export CSV
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Submissions"
          value={overallStats.total}
          color="blue"
          icon={FileText}
        />
        <StatCard
          label="Approved"
          value={overallStats.approved}
          color="green"
          icon={CheckCircle}
          subtitle={
            overallStats.total > 0
              ? `${Math.round((overallStats.approved / overallStats.total) * 100)}% approval rate`
              : undefined
          }
        />
        <StatCard
          label="Pending Review"
          value={overallStats.pending}
          color="amber"
          icon={Clock}
        />
        <StatCard
          label="Rejected"
          value={overallStats.rejected}
          color="red"
          icon={XCircle}
        />
      </div>

      {/* Status breakdown bar */}
      {overallStats.total > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-gray-400" />
            Overall Status Distribution
          </h3>
          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden flex">
            {overallStats.approved > 0 && (
              <div
                className="h-full bg-safety-green transition-all duration-700"
                style={{
                  width: `${(overallStats.approved / overallStats.total) * 100}%`,
                }}
                title={`Approved: ${overallStats.approved}`}
              />
            )}
            {overallStats.pending > 0 && (
              <div
                className="h-full bg-safety-amber transition-all duration-700"
                style={{
                  width: `${(overallStats.pending / overallStats.total) * 100}%`,
                }}
                title={`Pending: ${overallStats.pending}`}
              />
            )}
            {overallStats.rejected > 0 && (
              <div
                className="h-full bg-safety-red transition-all duration-700"
                style={{
                  width: `${(overallStats.rejected / overallStats.total) * 100}%`,
                }}
                title={`Rejected: ${overallStats.rejected}`}
              />
            )}
            {overallStats.draft > 0 && (
              <div
                className="h-full bg-gray-400 transition-all duration-700"
                style={{
                  width: `${(overallStats.draft / overallStats.total) * 100}%`,
                }}
                title={`Draft: ${overallStats.draft}`}
              />
            )}
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-safety-green" />
              Approved ({overallStats.approved})
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-safety-amber" />
              Pending ({overallStats.pending})
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-safety-red" />
              Rejected ({overallStats.rejected})
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-gray-400" />
              Draft ({overallStats.draft})
            </span>
          </div>
        </div>
      )}

      {/* Equipment Section */}
      {equipment.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-gray-400" />
            Equipment Overview
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              label="Total Equipment"
              value={equipmentStats.total}
              color="blue"
              icon={Wrench}
            />
            <StatCard
              label="Expiring Within 30 Days"
              value={equipmentStats.expiringSoon}
              color="amber"
              icon={Calendar}
              subtitle={
                equipmentStats.expiringSoon > 0
                  ? 'Certifications due soon'
                  : 'All certifications current'
              }
            />
            <StatCard
              label="Expired"
              value={equipmentStats.expired}
              color="red"
              icon={AlertCircle}
            />
          </div>
        </div>
      )}

      {/* Category Breakdown */}
      <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-gray-400" />
        Category Breakdown
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(CATEGORY_CONFIG).map(([cat, config]) => {
          const data = categoryBreakdown[cat]
          if (!data || data.total === 0) return null
          return (
            <CategoryBreakdownCard
              key={cat}
              category={cat}
              config={config}
              total={data.total}
              approved={data.approved}
              pending={data.pending}
              rejected={data.rejected}
            />
          )
        })}
        {Object.values(CATEGORY_CONFIG).every(
          (_, i) => categoryBreakdown[Object.keys(CATEGORY_CONFIG)[i]]?.total === 0
        ) && (
          <div className="col-span-full card flex flex-col items-center justify-center py-12">
            <BarChart3 className="w-10 h-10 text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">No category data available</p>
          </div>
        )}
      </div>

      {/* By Form Section */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4 text-gray-400" />
          By Form
        </h2>
        <div className="card p-5">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Select a Form Definition
            </label>
            <select
              value={selectedFormDef}
              onChange={(e) => setSelectedFormDef(e.target.value)}
              className="input-field max-w-md"
            >
              <option value="">Choose a form...</option>
              {formDefinitions.map((def) => (
                <option key={def.id || def._id} value={def.id || def._id}>
                  {def.name || def.title || 'Untitled Form'}
                </option>
              ))}
            </select>
          </div>

          {selectedFormDef && formDefStatusBreakdown ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-700">
                <span className="font-medium">{formDefStatusBreakdown.total}</span> submissions
                total
              </p>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden flex">
                {formDefStatusBreakdown.approved > 0 && (
                  <div
                    className="h-full bg-safety-green"
                    style={{
                      width: `${
                        (formDefStatusBreakdown.approved / formDefStatusBreakdown.total) * 100
                      }%`,
                    }}
                  />
                )}
                {formDefStatusBreakdown.pending > 0 && (
                  <div
                    className="h-full bg-safety-amber"
                    style={{
                      width: `${
                        (formDefStatusBreakdown.pending / formDefStatusBreakdown.total) * 100
                      }%`,
                    }}
                  />
                )}
                {formDefStatusBreakdown.rejected > 0 && (
                  <div
                    className="h-full bg-safety-red"
                    style={{
                      width: `${
                        (formDefStatusBreakdown.rejected / formDefStatusBreakdown.total) * 100
                      }%`,
                    }}
                  />
                )}
                {formDefStatusBreakdown.draft > 0 && (
                  <div
                    className="h-full bg-gray-400"
                    style={{
                      width: `${
                        (formDefStatusBreakdown.draft / formDefStatusBreakdown.total) * 100
                      }%`,
                    }}
                  />
                )}
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-safety-green" />
                  Approved ({formDefStatusBreakdown.approved})
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-safety-amber" />
                  Pending ({formDefStatusBreakdown.pending})
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-safety-red" />
                  Rejected ({formDefStatusBreakdown.rejected})
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-gray-400" />
                  Draft ({formDefStatusBreakdown.draft})
                </span>
              </div>
            </div>
          ) : selectedFormDef && !formDefStatusBreakdown ? (
            <div className="flex items-center justify-center py-8 text-gray-400">
              <Clock className="w-5 h-5 mr-2 animate-spin" />
              <span className="text-sm">Loading submissions...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center py-8 text-gray-400">
              <FileText className="w-6 h-6 mr-2" />
              <span className="text-sm">Select a form to view submission breakdown</span>
            </div>
          )}
        </div>
      </div>

      {/* Empty state */}
      {allSubmissions.length === 0 && (
        <div className="card flex flex-col items-center justify-center py-12 mt-4">
          <div className="p-4 bg-gray-50 rounded-full mb-4">
            <BarChart3 className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No data available</h3>
          <p className="text-sm text-gray-500 max-w-md text-center">
            Reports will appear once submissions are created across the safety modules.
          </p>
        </div>
      )}
    </div>
  )
}
