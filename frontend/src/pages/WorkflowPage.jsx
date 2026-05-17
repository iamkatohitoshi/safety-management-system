import React, { useState, useEffect, useCallback } from 'react'
import {
  GitMerge,
  Plus,
  FileText,
  Calendar,
  Eye,
  X,
  AlertCircle,
  Search,
} from 'lucide-react'
import client from '../api/client'
import WorkflowDesigner from '../components/workflow-engine/WorkflowDesigner'

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

function StatusBadge({ status }) {
  const config = {
    active: { bg: 'bg-safety-green/10', text: 'text-safety-green', label: 'Active' },
    draft: { bg: 'bg-safety-amber/10', text: 'text-safety-amber', label: 'Draft' },
    archived: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Archived' },
  }

  const s = config[status] || config.draft

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${s.bg} ${s.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${s.text.replace('text-', 'bg-')}`} />
      {s.label}
    </span>
  )
}

export default function WorkflowPage() {
  const [workflows, setWorkflows] = useState([])
  const [formDefs, setFormDefs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [designerOpen, setDesignerOpen] = useState(false)
  const [editingWorkflow, setEditingWorkflow] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [saveError, setSaveError] = useState(null)

  const fetchWorkflows = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await client.get('/workflow-definitions')
      const data = res.data?.data || res.data || []
      setWorkflows(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load workflow definitions')
      setWorkflows([])
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchFormDefs = useCallback(async () => {
    try {
      const res = await client.get('/form-definitions')
      const data = res.data?.data || res.data || []
      setFormDefs(Array.isArray(data) ? data : [])
    } catch {
      setFormDefs([])
    }
  }, [])

  useEffect(() => {
    fetchWorkflows()
    fetchFormDefs()
  }, [fetchWorkflows, fetchFormDefs])

  const handleCreateNew = useCallback(() => {
    setEditingWorkflow(null)
    setDesignerOpen(true)
    setSaveError(null)
  }, [])

  const handleEdit = useCallback(
    (wf) => {
      setEditingWorkflow(wf)
      setDesignerOpen(true)
      setSaveError(null)
    },
    []
  )

  const handleCloseDesigner = useCallback(() => {
    setDesignerOpen(false)
    setEditingWorkflow(null)
    setSaveError(null)
  }, [])

  const handleSave = useCallback(
    async (payload) => {
      try {
        setSaveError(null)
        if (editingWorkflow?.id) {
          await client.put(`/workflow-definitions/${editingWorkflow.id}`, payload)
        } else {
          await client.post('/workflow-definitions', payload)
        }
        setDesignerOpen(false)
        setEditingWorkflow(null)
        fetchWorkflows()
      } catch (err) {
        setSaveError(err.response?.data?.message || 'Failed to save workflow')
      }
    },
    [editingWorkflow, fetchWorkflows]
  )

  const getFormName = (formDefId) => {
    if (!formDefId) return '—'
    const fd = formDefs.find((d) => d.id === formDefId)
    return fd?.name || fd?.slug || `Form #${formDefId}`
  }

  const filteredWorkflows = workflows.filter((wf) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      (wf.name || '').toLowerCase().includes(q) ||
      (wf.description || '').toLowerCase().includes(q)
    )
  })

  // Designer Mode
  if (designerOpen) {
    return (
      <div className="flex flex-col h-full">
        {/* Designer header */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleCloseDesigner}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                {editingWorkflow ? 'Edit Workflow' : 'Create Workflow'}
              </h2>
              <p className="text-[11px] text-gray-400">
                {editingWorkflow
                  ? `Editing: ${editingWorkflow.name}`
                  : 'Design a new approval workflow'
                }
              </p>
            </div>
          </div>

          {saveError && (
            <div className="flex items-center gap-1.5 text-xs text-safety-red bg-red-50 px-3 py-1.5 rounded-lg">
              <AlertCircle className="w-3.5 h-3.5" />
              {saveError}
            </div>
          )}
        </div>

        {/* Designer */}
        <div className="flex-1 overflow-hidden">
          <WorkflowDesigner
            initialSteps={editingWorkflow?.steps_jsonb || []}
            workflowMeta={
              editingWorkflow
                ? {
                    name: editingWorkflow.name || '',
                    description: editingWorkflow.description || '',
                    form_definition_id: editingWorkflow.form_definition_id || '',
                  }
                : undefined
            }
            onSave={handleSave}
          />
        </div>
      </div>
    )
  }

  // List View
  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
              <GitMerge className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Workflow Engine</h1>
              <p className="text-xs text-gray-500">
                Design and manage approval workflows
              </p>
            </div>
          </div>
          <button
            onClick={handleCreateNew}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium
              text-white bg-primary-600 hover:bg-primary-700 rounded-lg
              transition-colors duration-150 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Create Workflow
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-3">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search workflows..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg
              focus:ring-2 focus:ring-primary-500 focus:border-primary-500
              bg-white transition-colors placeholder-gray-400"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-400">Loading workflows...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6 text-safety-red" />
            </div>
            <h3 className="text-sm font-semibold text-gray-700 mb-1">Failed to load</h3>
            <p className="text-xs text-gray-400 mb-4">{error}</p>
            <button
              onClick={fetchWorkflows}
              className="px-4 py-2 text-sm font-medium text-primary-600 bg-primary-50
                hover:bg-primary-100 rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : filteredWorkflows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <GitMerge className="w-7 h-7 text-gray-400" />
            </div>
            {searchQuery ? (
              <>
                <h3 className="text-sm font-semibold text-gray-700 mb-1">No results found</h3>
                <p className="text-xs text-gray-400">
                  No workflows match "{searchQuery}"
                </p>
              </>
            ) : (
              <>
                <h3 className="text-sm font-semibold text-gray-700 mb-1">No workflows yet</h3>
                <p className="text-xs text-gray-400 text-center max-w-sm mb-6">
                  Create your first approval workflow to automate form review and sign-off processes.
                </p>
                <button
                  onClick={handleCreateNew}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium
                    text-white bg-primary-600 hover:bg-primary-700 rounded-lg
                    transition-colors duration-150 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Create Workflow
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="max-w-5xl mx-auto px-6 py-6">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                      Linked Form
                    </th>
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                      Steps
                    </th>
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="text-right px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredWorkflows.map((wf) => {
                    const steps = wf.steps_jsonb || []
                    return (
                      <tr
                        key={wf.id}
                        className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                        onClick={() => handleEdit(wf)}
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-primary-50 flex items-center justify-center">
                              <GitMerge className="w-3.5 h-3.5 text-primary-600" />
                            </div>
                            <span className="text-sm font-medium text-gray-900">
                              {wf.name || 'Untitled'}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-xs text-gray-500 line-clamp-1 max-w-[200px] block">
                            {wf.description || '—'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-xs text-gray-600">
                              {getFormName(wf.form_definition_id)}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <StatusBadge status={wf.status || 'draft'} />
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-xs text-gray-600">
                            {steps.length} step{steps.length !== 1 ? 's' : ''}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-xs text-gray-500">
                              {formatDate(wf.created_at || wf.createdAt)}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEdit(wf)
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium
                              text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Edit
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <p className="text-center text-[11px] text-gray-400 mt-4">
              {filteredWorkflows.length} workflow{filteredWorkflows.length !== 1 ? 's' : ''} total
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
