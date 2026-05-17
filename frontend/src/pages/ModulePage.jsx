import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import {
  Users,
  FileCheck,
  Shield,
  Wrench,
  AlertTriangle,
  Plus,
  X,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  FileText,
  ChevronDown,
  ChevronUp,
  Calendar,
  User,
  MessageSquare,
  Send,
  Ban,
  Undo2,
} from 'lucide-react'
import client from '../api/client'
import { useAuth } from '../stores/AuthContext'
import { useTenant } from '../stores/TenantContext'
import DynamicForm from '../components/dynamic-form/DynamicForm'

const MODULE_CONFIG = {
  toolbox: {
    name: 'Toolbox Meeting',
    icon: Users,
    color: 'primary',
    endpoints: { formDefs: 'toolbox', submissions: 'toolbox' },
  },
  ptw: {
    name: 'Permit-to-Work',
    icon: FileCheck,
    color: 'primary',
    endpoints: { formDefs: 'ptw', submissions: 'ptw' },
  },
  inspection: {
    name: 'Safety Inspection',
    icon: Shield,
    color: 'primary',
    endpoints: { formDefs: 'inspection', submissions: 'inspection' },
  },
  equipment: {
    name: 'Equipment',
    icon: Wrench,
    color: 'primary',
    endpoints: { formDefs: 'equipment', submissions: 'equipment' },
  },
  action: {
    name: 'Safety Action Tracker',
    icon: AlertTriangle,
    color: 'primary',
    endpoints: { formDefs: 'action', submissions: 'action' },
  },
}

const STATUS_STYLES = {
  draft: 'bg-gray-100 text-gray-700',
  submitted: 'bg-safety-blue/10 text-safety-blue',
  in_review: 'bg-safety-amber/10 text-safety-amber',
  approved: 'bg-safety-green/10 text-safety-green',
  rejected: 'bg-safety-red/10 text-safety-red',
  revision_requested: 'bg-orange-100 text-orange-700',
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

function StatusBadge({ status }) {
  const label = status?.replace(/_/g, ' ') || 'unknown'
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
        STATUS_STYLES[status] || 'bg-gray-100 text-gray-600'
      }`}
    >
      {label}
    </span>
  )
}

function StatCard({ label, value, color, icon: Icon }) {
  const colorMap = {
    blue: 'bg-safety-blue/10 text-safety-blue',
    green: 'bg-safety-green/10 text-safety-green',
    amber: 'bg-safety-amber/10 text-safety-amber',
    red: 'bg-safety-red/10 text-safety-red',
    gray: 'bg-gray-100 text-gray-600',
  }
  return (
    <div className="card p-4 flex items-center gap-4">
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
          colorMap[color] || colorMap.gray
        }`}
      >
        {Icon && <Icon className="w-5 h-5" />}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value ?? 0}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  )
}

function ApprovalTimeline({ approvalActions }) {
  if (!approvalActions || approvalActions.length === 0) {
    return (
      <div className="text-center py-6 text-gray-400">
        <Clock className="w-8 h-8 mx-auto mb-2" />
        <p className="text-sm">No approval actions recorded yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-0">
      {approvalActions.map((action, idx) => (
        <div key={idx} className="relative flex gap-4 pb-6 last:pb-0">
          {/* Timeline line */}
          {idx < approvalActions.length - 1 && (
            <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-gray-200" />
          )}
          {/* Dot */}
          <div
            className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              action.action === 'approved'
                ? 'bg-safety-green/10 text-safety-green'
                : action.action === 'rejected'
                ? 'bg-safety-red/10 text-safety-red'
                : action.action === 'revision_requested'
                ? 'bg-safety-amber/10 text-safety-amber'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            {action.action === 'approved' ? (
              <CheckCircle className="w-4 h-4" />
            ) : action.action === 'rejected' ? (
              <XCircle className="w-4 h-4" />
            ) : action.action === 'revision_requested' ? (
              <Undo2 className="w-4 h-4" />
            ) : (
              <Clock className="w-4 h-4" />
            )}
          </div>
          {/* Content */}
          <div className="flex-1 min-w-0 pt-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-gray-900 capitalize">
                {action.action?.replace(/_/g, ' ')}
              </span>
              <span className="text-xs text-gray-400">
                by {action.actorName || action.actorId || 'Unknown'}
              </span>
              <span className="text-xs text-gray-400">
                {formatDate(action.createdAt || action.timestamp)}
              </span>
            </div>
            {action.comment && (
              <p className="text-sm text-gray-600 mt-1">{action.comment}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function ModulePage() {
  const { category } = useParams()
  const { user } = useAuth()
  const { tenantId } = useTenant()
  const config = MODULE_CONFIG[category]

  const [formDefinitions, setFormDefinitions] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [equipment, setEquipment] = useState([])
  const [approvalActions, setApprovalActions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statusFilter, setStatusFilter] = useState('')

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedFormDef, setSelectedFormDef] = useState(null)
  const [formData, setFormData] = useState({})
  const [creating, setCreating] = useState(false)

  // Detail modal
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedSubmission, setSelectedSubmission] = useState(null)
  const [approvalComment, setApprovalComment] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const Icon = config?.icon || Shield

  const fetchData = useCallback(async () => {
    if (!tenantId || !category) return
    setLoading(true)
    setError(null)
    try {
      const [defsRes, subsRes] = await Promise.all([
        client.get('/api/form-definitions', {
          params: { tenantId, category },
        }).catch(() => ({ data: [] })),
        client.get('/api/form-submissions', {
          params: { tenantId, category },
        }).catch(() => ({ data: [] })),
      ])

      const defs = Array.isArray(defsRes.data) ? defsRes.data : defsRes.data?.data || []
      const subs = Array.isArray(subsRes.data) ? subsRes.data : subsRes.data?.data || []

      setFormDefinitions(defs)
      setSubmissions(subs)

      if (category === 'equipment') {
        const equipRes = await client
          .get('/api/equipment', { params: { tenantId } })
          .catch(() => ({ data: [] }))
        const equip = Array.isArray(equipRes.data)
          ? equipRes.data
          : equipRes.data?.data || []
        setEquipment(equip)
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [tenantId, category])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const stats = useMemo(() => {
    const total = submissions.length
    const approved = submissions.filter((s) => s.status === 'approved').length
    const pending = submissions.filter(
      (s) => s.status === 'submitted' || s.status === 'in_review'
    ).length
    const rejected = submissions.filter((s) => s.status === 'rejected').length
    return { total, approved, pending, rejected }
  }, [submissions])

  const filteredSubmissions = useMemo(() => {
    if (!statusFilter) return submissions
    return submissions.filter((s) => s.status === statusFilter)
  }, [submissions, statusFilter])

  const handleOpenCreate = () => {
    setSelectedFormDef(null)
    setFormData({})
    setShowCreateModal(true)
  }

  const handleFormDefChange = (defId) => {
    const def = formDefinitions.find((d) => d.id === defId || d._id === defId)
    setSelectedFormDef(def)
    setFormData({})
  }

  const handleCreateSubmit = async () => {
    if (!selectedFormDef) return
    setCreating(true)
    try {
      await client.post('/api/form-submissions', {
        tenantId,
        formDefinitionId: selectedFormDef.id || selectedFormDef._id,
        category,
        data: formData,
        status: 'submitted',
      })
      setShowCreateModal(false)
      setSelectedFormDef(null)
      setFormData({})
      fetchData()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create submission')
    } finally {
      setCreating(false)
    }
  }

  const handleOpenDetail = async (submission) => {
    setSelectedSubmission(submission)
    setApprovalComment('')
    setShowDetailModal(true)
    try {
      const res = await client
        .get('/api/approvals', { params: { tenantId, submissionId: submission.id || submission._id } })
        .catch(() => ({ data: [] }))
      const actions = Array.isArray(res.data) ? res.data : res.data?.data || []
      setApprovalActions(actions)
    } catch {
      setApprovalActions([])
    }
  }

  const handleApprovalAction = async (action) => {
    if (!selectedSubmission) return
    setActionLoading(true)
    try {
      await client.post('/api/approvals', {
        tenantId,
        submissionId: selectedSubmission.id || selectedSubmission._id,
        action,
        comment: approvalComment,
      })
      setApprovalComment('')
      fetchData()
      // Refresh approval actions
      const res = await client
        .get('/api/approvals', {
          params: { tenantId, submissionId: selectedSubmission.id || selectedSubmission._id },
        })
        .catch(() => ({ data: [] }))
      const actions = Array.isArray(res.data) ? res.data : res.data?.data || []
      setApprovalActions(actions)
      setSelectedSubmission((prev) => ({
        ...prev,
        status: action === 'approved' ? 'approved' : action === 'rejected' ? 'rejected' : 'revision_requested',
      }))
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to process action')
    } finally {
      setActionLoading(false)
    }
  }

  const canApprove = user?.role === 'admin' || user?.role === 'approver' || user?.role === 'supervisor'

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-gray-200 rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card p-4">
              <div className="h-10 w-10 bg-gray-200 rounded-lg mb-3" />
              <div className="h-6 w-12 bg-gray-200 rounded mb-1" />
              <div className="h-3 w-20 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
        <div className="card">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 border-b border-gray-100 last:border-b-0">
              <div className="h-5 w-40 bg-gray-200 rounded mb-2" />
              <div className="h-3 w-64 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (error && submissions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="p-4 bg-safety-red/10 rounded-full mb-4">
          <AlertCircle className="w-8 h-8 text-safety-red" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load data</h3>
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
          <div className="p-2.5 bg-primary-50 rounded-xl">
            <Icon className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{config?.name || category}</h1>
            <p className="text-sm text-gray-500">
              {submissions.length} submission{submissions.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <button onClick={handleOpenCreate} className="btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          New {config?.name || 'Submission'}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total" value={stats.total} color="blue" icon={FileText} />
        <StatCard label="Approved" value={stats.approved} color="green" icon={CheckCircle} />
        <StatCard label="Pending" value={stats.pending} color="amber" icon={Clock} />
        <StatCard label="Rejected" value={stats.rejected} color="red" icon={XCircle} />
      </div>

      {/* Equipment-specific section */}
      {category === 'equipment' && equipment.length > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Equipment Overview</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {equipment.slice(0, 6).map((item) => {
              const expDate = item.certExpiry || item.expiryDate
              const expiring = expDate
                ? (new Date(expDate) - new Date()) / (1000 * 60 * 60 * 24)
                : null
              return (
                <div
                  key={item.id || item._id}
                  className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Wrench className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {item.name || item.equipmentName || 'Unnamed'}
                    </p>
                    {expDate && (
                      <p
                        className={`text-xs mt-0.5 ${
                          expiring !== null && expiring < 30
                            ? 'text-safety-red'
                            : 'text-gray-500'
                        }`}
                      >
                        Cert expires: {formatDate(expDate)}
                        {expiring !== null && expiring < 0
                          ? ' (expired)'
                          : expiring !== null && expiring < 30
                          ? ` (${Math.round(expiring)} days)`
                          : ''}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
            {equipment.length > 6 && (
              <div className="flex items-center justify-center p-3 text-sm text-gray-400">
                +{equipment.length - 6} more items
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {['', 'draft', 'submitted', 'in_review', 'approved', 'rejected', 'revision_requested'].map(
          (status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-primary-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {status ? status.replace(/_/g, ' ') : 'All'}
            </button>
          )
        )}
      </div>

      {/* Empty state */}
      {filteredSubmissions.length === 0 && (
        <div className="card flex flex-col items-center justify-center py-16">
          <div className="p-4 bg-gray-50 rounded-full mb-4">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {statusFilter ? `No ${statusFilter.replace(/_/g, ' ')} submissions` : 'No submissions yet'}
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            {statusFilter
              ? 'Try changing the filter to see more results.'
              : 'Create your first submission to get started.'}
          </p>
          {!statusFilter && (
            <button onClick={handleOpenCreate} className="btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              New Submission
            </button>
          )}
        </div>
      )}

      {/* Submissions Table */}
      {filteredSubmissions.length > 0 && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3 font-medium text-gray-600 text-xs uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-4 py-3 font-medium text-gray-600 text-xs uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 font-medium text-gray-600 text-xs uppercase tracking-wider">
                    Submitted By
                  </th>
                  <th className="px-4 py-3 font-medium text-gray-600 text-xs uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 font-medium text-gray-600 text-xs uppercase tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredSubmissions.map((sub) => (
                  <tr
                    key={sub.id || sub._id}
                    onClick={() => handleOpenDetail(sub)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="font-medium text-gray-900">
                          {sub.title || sub.name || sub.data?.title || 'Untitled'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={sub.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-gray-400" />
                        <span>{sub.submittedBy?.name || sub.submittedBy || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {formatDate(sub.createdAt || sub.submittedAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenDetail(sub)
                        }}
                        className="text-primary-600 hover:text-primary-700 text-xs font-medium"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowCreateModal(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">New {config?.name}</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {/* Form Definition Selector */}
              {formDefinitions.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Form Type
                  </label>
                  <select
                    value={selectedFormDef?.id || selectedFormDef?._id || ''}
                    onChange={(e) => handleFormDefChange(e.target.value)}
                    className="input-field"
                  >
                    <option value="">Select a form type...</option>
                    {formDefinitions.map((def) => (
                      <option key={def.id || def._id} value={def.id || def._id}>
                        {def.name || def.title || 'Untitled Form'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Dynamic Form */}
              {selectedFormDef && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">
                    {selectedFormDef.name || selectedFormDef.title}
                  </h3>
                  <DynamicForm
                    schema={
                      selectedFormDef.schema || selectedFormDef.jsonSchema || { properties: {} }
                    }
                    uiSchema={selectedFormDef.uiSchema || {}}
                    data={formData}
                    onChange={setFormData}
                  />
                </div>
              )}

              {formDefinitions.length === 0 && (
                <div className="text-center py-10 text-gray-400">
                  <FileText className="w-10 h-10 mx-auto mb-3" />
                  <p className="text-sm">No form definitions available for this module.</p>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => setShowCreateModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSubmit}
                disabled={!selectedFormDef || creating}
                className="btn-primary"
              >
                {creating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Submit
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowDetailModal(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-gray-900">
                  {selectedSubmission.title || selectedSubmission.name || 'Submission Detail'}
                </h2>
                <StatusBadge status={selectedSubmission.status} />
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
              {/* Form Data (read-only) */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Form Data
                </h3>
                <div className="bg-gray-50 rounded-xl p-4">
                  <DynamicForm
                    schema={
                      selectedSubmission.formDefinition?.schema ||
                      selectedSubmission.schema || { properties: {} }
                    }
                    uiSchema={selectedSubmission.formDefinition?.uiSchema || {}}
                    data={selectedSubmission.data || {}}
                    readOnly
                  />
                </div>
              </div>

              {/* Approval Timeline */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Approval Timeline
                </h3>
                <div className="bg-gray-50 rounded-xl p-4">
                  <ApprovalTimeline approvalActions={approvalActions} />
                </div>
              </div>
            </div>
            {/* Action buttons (for approvers) */}
            {canApprove &&
              (selectedSubmission.status === 'submitted' ||
                selectedSubmission.status === 'in_review') && (
                <div className="px-6 py-4 border-t border-gray-200 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Comment (optional)
                    </label>
                    <textarea
                      value={approvalComment}
                      onChange={(e) => setApprovalComment(e.target.value)}
                      placeholder="Add a comment..."
                      rows={2}
                      className="input-field"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleApprovalAction('approved')}
                      disabled={actionLoading}
                      className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-white bg-safety-green hover:bg-emerald-600 transition-colors disabled:opacity-50"
                    >
                      <CheckCircle className="w-4 h-4 mr-1.5" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleApprovalAction('rejected')}
                      disabled={actionLoading}
                      className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-white bg-safety-red hover:bg-red-600 transition-colors disabled:opacity-50"
                    >
                      <Ban className="w-4 h-4 mr-1.5" />
                      Reject
                    </button>
                    <button
                      onClick={() => handleApprovalAction('revision_requested')}
                      disabled={actionLoading}
                      className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-safety-amber bg-safety-amber/10 hover:bg-safety-amber/20 transition-colors disabled:opacity-50"
                    >
                      <Undo2 className="w-4 h-4 mr-1.5" />
                      Request Revision
                    </button>
                  </div>
                </div>
              )}
          </div>
        </div>
      )}
    </div>
  )
}
