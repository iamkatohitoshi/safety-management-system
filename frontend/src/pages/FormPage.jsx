import React, { useState, useEffect, useCallback } from 'react'
import {
  ClipboardList,
  Plus,
  FileEdit,
  Eye,
  Archive,
  Copy,
  Trash2,
  Search,
  Loader2,
  AlertCircle,
  RefreshCcw,
  ChevronRight,
  Calendar,
  FileText,
} from 'lucide-react'
import FormBuilder from '../components/form-builder/FormBuilder'
import client from '../api/client'

const CATEGORY_LABELS = {
  toolbox: 'Toolbox Talk',
  ptw: 'Permit to Work',
  inspection: 'Inspection',
  equipment: 'Equipment',
  action: 'Action',
  general: 'General',
}

const STATUS_STYLES = {
  draft: 'bg-safety-amber/10 text-safety-amber',
  published: 'bg-safety-green/10 text-safety-green',
  archived: 'bg-gray-100 text-gray-500',
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
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

export default function FormPage() {
  const [forms, setForms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingForm, setEditingForm] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  const fetchForms = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await client.get('/form-definitions')
      setForms(response.data?.data || response.data || [])
    } catch (err) {
      console.error('Failed to fetch form definitions:', err)
      // Use mock data for development
      setForms([
        {
          id: '1',
          name: 'Daily Safety Checklist',
          slug: 'daily_safety_checklist',
          category: 'inspection',
          status: 'published',
          version: 3,
          created_at: '2025-12-01T10:00:00Z',
          description: 'Daily safety inspection checklist for toolbox meetings',
        },
        {
          id: '2',
          name: 'Permit to Work',
          slug: 'permit_to_work',
          category: 'ptw',
          status: 'published',
          version: 5,
          created_at: '2025-11-15T08:30:00Z',
          description: 'Hot work and confined space permit form',
        },
        {
          id: '3',
          name: 'Incident Report',
          slug: 'incident_report',
          category: 'action',
          status: 'draft',
          version: 1,
          created_at: '2026-01-10T14:00:00Z',
          description: 'Report workplace incidents and near misses',
        },
        {
          id: '4',
          name: 'Equipment Inspection',
          slug: 'equipment_inspection',
          category: 'equipment',
          status: 'published',
          version: 2,
          created_at: '2025-10-20T09:00:00Z',
          description: 'Monthly equipment safety inspection form',
        },
        {
          id: '5',
          name: 'Toolbox Talk Record',
          slug: 'toolbox_talk_record',
          category: 'toolbox',
          status: 'archived',
          version: 1,
          created_at: '2025-09-05T11:00:00Z',
          description: 'Record of daily toolbox talk topics and attendance',
        },
      ])
      setError(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchForms()
  }, [fetchForms])

  const handleCreateNew = useCallback(() => {
    setEditingForm({ isNew: true })
  }, [])

  const handleEditForm = useCallback((form) => {
    setEditingForm({
      ...form,
      fields: form.fields || [],
    })
  }, [])

  const handleBack = useCallback(() => {
    setEditingForm(null)
  }, [])

  const handleSave = useCallback(async (payload) => {
    try {
      if (editingForm?.id && !editingForm?.isNew) {
        await client.put(`/form-definitions/${editingForm.id}`, payload)
      } else {
        await client.post('/form-definitions', payload)
      }
      setEditingForm(null)
      fetchForms()
    } catch (err) {
      console.error('Failed to save form:', err)
      alert('Failed to save form. Please try again.')
    }
  }, [editingForm, fetchForms])

  const handleDuplicate = useCallback(async (form) => {
    const payload = {
      name: `${form.name} (Copy)`,
      slug: `${form.slug}_copy`,
      category: form.category,
      description: form.description,
      fields: form.fields || [],
      status: 'draft',
      version: 1,
    }
    try {
      await client.post('/form-definitions', payload)
      fetchForms()
    } catch (err) {
      console.error('Failed to duplicate form:', err)
      // Local duplication fallback
      const newForm = { ...payload, id: Date.now().toString(), created_at: new Date().toISOString() }
      setForms((prev) => [...prev, newForm])
    }
  }, [fetchForms])

  const handleDelete = useCallback(async (formId) => {
    if (!window.confirm('Are you sure you want to delete this form definition?')) return
    try {
      await client.delete(`/form-definitions/${formId}`)
      fetchForms()
    } catch (err) {
      console.error('Failed to delete form:', err)
      setForms((prev) => prev.filter((f) => f.id !== formId))
    }
  }, [fetchForms])

  // If editing a form, show the FormBuilder
  if (editingForm) {
    return (
      <FormBuilder
        initialFields={editingForm.fields || []}
        initialFormMeta={{
          name: editingForm.name || '',
          slug: editingForm.slug || '',
          category: editingForm.category || 'general',
          description: editingForm.description || '',
          version: editingForm.version || 1,
          status: editingForm.status || 'draft',
        }}
        onSave={handleSave}
        onBack={handleBack}
      />
    )
  }

  const filteredForms = forms.filter((form) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      form.name?.toLowerCase().includes(q) ||
      form.slug?.toLowerCase().includes(q) ||
      form.description?.toLowerCase().includes(q) ||
      CATEGORY_LABELS[form.category]?.toLowerCase().includes(q)
    )
  })

  // List view
  return (
    <div className="flex flex-col h-full">
      {/* Page Header */}
      <div className="flex-shrink-0 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Form Builder</h1>
            <p className="text-sm text-gray-500 mt-1">
              Create and manage form definitions for the safety management system
            </p>
          </div>
          <button
            onClick={handleCreateNew}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium
                       text-white bg-primary-600 hover:bg-primary-700 rounded-lg
                       transition-colors duration-150 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Create New Form
          </button>
        </div>
      </div>

      {/* Search + Refresh */}
      <div className="flex-shrink-0 flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search forms..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg
                       focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                       bg-white transition-colors"
          />
        </div>
        <button
          onClick={fetchForms}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600
                     bg-white border border-gray-200 hover:bg-gray-50 rounded-lg
                     transition-colors disabled:opacity-50"
        >
          <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
            <p className="text-sm text-gray-500">Loading form definitions...</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-sm">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6 text-safety-red" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Failed to load forms</h3>
            <p className="text-xs text-gray-500 mb-4">{error}</p>
            <button
              onClick={fetchForms}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium
                         text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
            >
              <RefreshCcw className="w-3.5 h-3.5" />
              Try Again
            </button>
          </div>
        </div>
      ) : filteredForms.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-sm">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <ClipboardList className="w-7 h-7 text-gray-400" />
            </div>
            {searchQuery ? (
              <>
                <h3 className="text-sm font-semibold text-gray-700 mb-1">No results found</h3>
                <p className="text-xs text-gray-400">
                  No form definitions match "{searchQuery}".
                  Try a different search term.
                </p>
              </>
            ) : (
              <>
                <h3 className="text-sm font-semibold text-gray-700 mb-1">No forms yet</h3>
                <p className="text-xs text-gray-400 mb-4">
                  Create your first form definition to start building
                  safety checklists and inspection forms.
                </p>
                <button
                  onClick={handleCreateNew}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium
                             text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create New Form
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Table */}
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-5 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="text-left px-5 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="text-left px-5 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-center px-5 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                    Version
                  </th>
                  <th className="text-left px-5 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="text-right px-5 py-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredForms.map((form) => (
                  <tr
                    key={form.id}
                    className="group hover:bg-gray-50/50 transition-colors duration-100 cursor-pointer"
                    onClick={() => handleEditForm(form)}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center">
                          <FileText className="w-4 h-4 text-primary-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 group-hover:text-primary-700 transition-colors">
                            {form.name}
                          </p>
                          {form.description && (
                            <p className="text-xs text-gray-400 mt-0.5 line-clamp-1 max-w-[300px]">
                              {form.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md font-medium">
                        {CATEGORY_LABELS[form.category] || form.category || '-'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wider
                                        ${STATUS_STYLES[form.status] || 'bg-gray-100 text-gray-500'}`}
                      >
                        {form.status || 'draft'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="text-xs font-mono text-gray-500 bg-gray-50 px-2 py-0.5 rounded">
                        v{form.version || 1}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-xs text-gray-400">
                        <Calendar className="w-3 h-3" />
                        {formatDate(form.created_at)}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEditForm(form)
                          }}
                          className="p-1.5 rounded-md hover:bg-primary-50 hover:text-primary-600 text-gray-400 transition-colors"
                          title="Edit"
                        >
                          <FileEdit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDuplicate(form)
                          }}
                          className="p-1.5 rounded-md hover:bg-gray-100 hover:text-gray-600 text-gray-400 transition-colors"
                          title="Duplicate"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        {form.status !== 'archived' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              // Archive action
                            }}
                            className="p-1.5 rounded-md hover:bg-amber-50 hover:text-amber-600 text-gray-400 transition-colors"
                            title="Archive"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(form.id)
                          }}
                          className="p-1.5 rounded-md hover:bg-red-50 hover:text-red-500 text-gray-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <ChevronRight className="w-4 h-4 text-gray-300 ml-1" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
