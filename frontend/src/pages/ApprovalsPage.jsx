import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  FileText,
  User,
  Search,
  Ban,
  Undo2,
  ChevronDown,
  ChevronUp,
  Send,
  MessageSquare,
} from 'lucide-react'
import client from '../api/client'
import { useAuth } from '../stores/AuthContext'
import { useTenant } from '../stores/TenantContext'
import DynamicForm from '../components/dynamic-form/DynamicForm'

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
          {idx < approvalActions.length - 1 && (
            <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-gray-200" />
          )}
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

export default function ApprovalsPage() {
  const { user } = useAuth()
  const { tenantId } = useTenant()
  const [approvals, setApprovals] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('pending')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [approvalActions, setApprovalActions] = useState([])
  const [approvalComment, setApprovalComment] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const tabs = [
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'all', label: 'All' },
  ]

  const fetchData = useCallback(async () => {
    if (!tenantId) return
    setLoading(true)
    setError(null)
    try {
      const [approvalsRes, subsRes] = await Promise.all([
        client
          .get('/api/approvals', { params: { tenantId } })
          .catch(() => ({ data: [] })),
        client
          .get('/api/form-submissions', { params: { tenantId } })
          .catch(() => ({ data: [] })),
      ])

      const approvs = Array.isArray(approvalsRes.data)
        ? approvalsRes.data
        : approvalsRes.data?.data || []
      const subs = Array.isArray(subsRes.data)
        ? subsRes.data
        : subsRes.data?.data || []

      setApprovals(approvs)
      setSubmissions(subs)
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || 'Failed to load approvals'
      )
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Map approvals to their submissions
  const enrichedApprovals = useMemo(() => {
    return approvals.map((a) => {
      const sub = submissions.find(
        (s) =>
          (s.id || s._id) === (a.submissionId || a.submission?.id || a.submission?._id)
      )
      return { ...a, submission: sub || a.submission }
    })
  }, [approvals, submissions])

  const getSubmissionStatus = (approval) => {
    return approval.submission?.status || approval.status || 'submitted'
  }

  const filteredApprovals = useMemo(() => {
    let result = enrichedApprovals

    // Filter by tab
    if (activeTab === 'pending') {
      result = result.filter((a) => {
        const status = getSubmissionStatus(a)
        return status === 'submitted' || status === 'in_review' || status === 'draft'
      })
    } else if (activeTab === 'approved') {
      result = result.filter((a) => {
        const status = getSubmissionStatus(a)
        return status === 'approved'
      })
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (a) =>
          (a.submission?.title || a.submission?.name || '')
            .toLowerCase()
            .includes(q) ||
          (a.submission?.submittedBy?.name || a.submission?.submittedBy || '')
            .toLowerCase()
            .includes(q) ||
          (a.actorName || a.actorId || '').toLowerCase().includes(q)
      )
    }

    return result
  }, [enrichedApprovals, activeTab, searchQuery])

  const pendingCount = useMemo(
    () =>
      enrichedApprovals.filter((a) => {
        const status = getSubmissionStatus(a)
        return status === 'submitted' || status === 'in_review'
      }).length,
    [enrichedApprovals]
  )

  const handleToggleExpand = async (approvalId, approval) => {
    if (expandedId === approvalId) {
      setExpandedId(null)
      setApprovalActions([])
      return
    }
    setExpandedId(approvalId)
    setApprovalComment('')
    try {
      const res = await client
        .get('/api/approvals', {
          params: {
            tenantId,
            submissionId:
              approval.submissionId ||
              approval.submission?.id ||
              approval.submission?._id,
          },
        })
        .catch(() => ({ data: [] }))
      const actions = Array.isArray(res.data) ? res.data : res.data?.data || []
      setApprovalActions(actions)
    } catch {
      setApprovalActions([])
    }
  }

  const handleAction = async (action, approval) => {
    const submissionId =
      approval.submissionId ||
      approval.submission?.id ||
      approval.submission?._id
    if (!submissionId) return
    setActionLoading(true)
    try {
      await client.post('/api/approvals', {
        tenantId,
        submissionId,
        action,
        comment: approvalComment,
      })
      setApprovalComment('')
      fetchData()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to process action')
    } finally {
      setActionLoading(false)
    }
  }

  const canApprove =
    user?.role === 'admin' || user?.role === 'approver' || user?.role === 'supervisor'

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-gray-200 rounded" />
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 w-24 bg-gray-200 rounded-lg" />
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
  if (error && enrichedApprovals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="p-4 bg-safety-red/10 rounded-full mb-4">
          <AlertCircle className="w-8 h-8 text-safety-red" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Failed to load approvals
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
          <div className="p-2.5 bg-safety-green/10 rounded-xl">
            <CheckCircle className="w-6 h-6 text-safety-green" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Approvals</h1>
            <p className="text-sm text-gray-500">
              Review and manage approval requests
            </p>
          </div>
        </div>
        {pendingCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-safety-amber/10 rounded-lg">
            <Clock className="w-4 h-4 text-safety-amber" />
            <span className="text-sm font-medium text-safety-amber">
              {pendingCount} pending
            </span>
          </div>
        )}
      </div>

      {/* Tabs + Search */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              {tab.key === 'pending' && pendingCount > 0 && (
                <span className="ml-1.5 text-xs bg-safety-amber text-white px-1.5 py-0.5 rounded-full">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search approvals..."
            className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 w-64"
          />
        </div>
      </div>

      {/* Empty state */}
      {filteredApprovals.length === 0 && (
        <div className="card flex flex-col items-center justify-center py-16">
          <div className="p-4 bg-gray-50 rounded-full mb-4">
            <CheckCircle className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {searchQuery
              ? 'No results found'
              : activeTab === 'pending'
              ? 'No pending approvals'
              : activeTab === 'approved'
              ? 'No approved approvals'
              : 'No approvals found'}
          </h3>
          <p className="text-sm text-gray-500 mb-6 max-w-md text-center">
            {searchQuery
              ? 'Try adjusting your search query.'
              : activeTab === 'pending'
              ? 'All caught up! New submissions requiring approval will appear here.'
              : 'Approved or rejected submissions will appear here.'}
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="btn-secondary"
            >
              Clear Search
            </button>
          )}
        </div>
      )}

      {/* Approvals List */}
      {filteredApprovals.length > 0 && (
        <div className="space-y-3">
          {filteredApprovals.map((approval) => {
            const approvalId = approval.id || approval._id
            const isExpanded = expandedId === approvalId
            const sub = approval.submission
            const status = getSubmissionStatus(approval)

            return (
              <div key={approvalId} className="card overflow-hidden">
                {/* Summary row */}
                <button
                  onClick={() => handleToggleExpand(approvalId, approval)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        status === 'approved'
                          ? 'bg-safety-green/10 text-safety-green'
                          : status === 'rejected'
                          ? 'bg-safety-red/10 text-safety-red'
                          : 'bg-safety-amber/10 text-safety-amber'
                      }`}
                    >
                      {status === 'approved' ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : status === 'rejected' ? (
                        <XCircle className="w-4 h-4" />
                      ) : (
                        <Clock className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {sub?.title || sub?.name || approval.title || 'Untitled Submission'}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {sub?.submittedBy?.name || sub?.submittedBy || 'Unknown'}
                        </span>
                        <StatusBadge status={status} />
                        <span className="text-xs text-gray-400">
                          {formatDate(sub?.createdAt || approval.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <span className="text-xs text-gray-400">
                      {approval.step || approval.currentStep || 'Step 1'}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-gray-100 px-4 py-4 space-y-5">
                    {/* Form Data */}
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" />
                        Form Data
                      </h4>
                      <div className="bg-gray-50 rounded-xl p-4">
                        <DynamicForm
                          schema={
                            sub?.formDefinition?.schema || sub?.schema || { properties: {} }
                          }
                          uiSchema={sub?.formDefinition?.uiSchema || {}}
                          data={sub?.data || {}}
                          readOnly
                        />
                      </div>
                    </div>

                    {/* Approval Timeline */}
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        Approval Timeline
                      </h4>
                      <div className="bg-gray-50 rounded-xl p-4">
                        <ApprovalTimeline approvalActions={approvalActions} />
                      </div>
                    </div>

                    {/* Action buttons */}
                    {canApprove &&
                      (status === 'submitted' || status === 'in_review') && (
                        <div className="space-y-3 pt-2 border-t border-gray-100">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              <MessageSquare className="w-3.5 h-3.5 inline mr-1" />
                              Comment (optional)
                            </label>
                            <textarea
                              value={approvalComment}
                              onChange={(e) => setApprovalComment(e.target.value)}
                              placeholder="Add a comment for this action..."
                              rows={2}
                              className="input-field"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleAction('approved', approval)}
                              disabled={actionLoading}
                              className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-white bg-safety-green hover:bg-emerald-600 transition-colors disabled:opacity-50"
                            >
                              <CheckCircle className="w-4 h-4 mr-1.5" />
                              Approve
                            </button>
                            <button
                              onClick={() => handleAction('rejected', approval)}
                              disabled={actionLoading}
                              className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-white bg-safety-red hover:bg-red-600 transition-colors disabled:opacity-50"
                            >
                              <Ban className="w-4 h-4 mr-1.5" />
                              Reject
                            </button>
                            <button
                              onClick={() => handleAction('revision_requested', approval)}
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
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
