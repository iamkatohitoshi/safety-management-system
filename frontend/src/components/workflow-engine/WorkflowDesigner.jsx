import React, { useState, useCallback, useEffect } from 'react'
import {
  Save,
  AlertTriangle,
  CheckCircle2,
  FileText,
} from 'lucide-react'
import WorkflowCanvas from './WorkflowCanvas'
import client from '../../api/client'

export default function WorkflowDesigner({
  initialSteps,
  onSave,
  workflowMeta: initialMeta,
}) {
  const [steps, setSteps] = useState(initialSteps || [])
  const [meta, setMeta] = useState(
    initialMeta || {
      name: '',
      description: '',
      form_definition_id: '',
    }
  )
  const [formDefinitions, setFormDefinitions] = useState([])
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState(null)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    const fetchFormDefs = async () => {
      try {
        const res = await client.get('/form-definitions')
        const data = res.data?.data || res.data || []
        setFormDefinitions(Array.isArray(data) ? data : [])
      } catch {
        setFormDefinitions([])
      }
    }
    fetchFormDefs()
  }, [])

  const validate = useCallback(() => {
    const newErrors = {}

    if (!meta.name?.trim()) {
      newErrors.name = 'Workflow name is required'
    }

    if (steps.length === 0) {
      newErrors.steps = 'At least one approval step is required'
    } else {
      steps.forEach((step, i) => {
        const stepErrors = {}
        if (!step.name?.trim()) {
          stepErrors.name = 'Step name is required'
        }
        if (!step.assigneeRole) {
          stepErrors.assigneeRole = 'Assignee role is required'
        }
        if (!step.onApprove) {
          stepErrors.onApprove = 'Must define what happens on approval'
        }
        if (Object.keys(stepErrors).length > 0) {
          newErrors[`step_${i}`] = stepErrors
        }
      })
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [meta, steps])

  const handleSave = useCallback(() => {
    if (!validate()) return

    setSaving(true)
    setSaveMessage(null)

    const payload = {
      ...meta,
      steps_jsonb: steps.map((step) => ({
        name: step.name,
        assigneeRole: step.assigneeRole,
        approvalType: step.approvalType || 'sequential',
        onApprove: step.onApprove || '__end__',
        onReject: step.onReject || '',
        onRevision: step.onRevision || '',
      })),
    }

    if (onSave) {
      onSave(payload)
    }

    setSaving(false)
    setSaveMessage({ type: 'success', text: 'Workflow saved successfully' })
    setTimeout(() => setSaveMessage(null), 3000)
  }, [meta, steps, validate, onSave])

  const handleMetaChange = (key, value) => {
    setMeta((prev) => ({ ...prev, [key]: value }))
  }

  const handleStepsChange = useCallback((newSteps) => {
    setSteps(newSteps)
  }, [])

  const getValidationSummary = () => {
    const items = []

    if (!meta.name?.trim()) {
      items.push('Workflow name is required')
    }

    if (steps.length === 0) {
      items.push('Add at least one approval step')
    } else {
      steps.forEach((step, i) => {
        if (!step.name?.trim()) {
          items.push(`Step ${i + 1}: Name is required`)
        }
        if (!step.assigneeRole) {
          items.push(`Step ${i + 1}: Assignee role is required`)
        }
        if (!step.onApprove) {
          items.push(`Step ${i + 1}: Approval routing is required`)
        }
      })
    }

    return items
  }

  const validationItems = getValidationSummary()
  const isValid = validationItems.length === 0

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Meta section */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Workflow Name */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Workflow Name <span className="text-safety-red">*</span>
              </label>
              <input
                type="text"
                value={meta.name}
                onChange={(e) => handleMetaChange('name', e.target.value)}
                className={`w-full px-3 py-2 text-sm border rounded-lg
                  focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                  bg-white transition-colors
                  ${errors.name ? 'border-safety-red' : 'border-gray-200'}
                `}
                placeholder="e.g. Toolbox Talk Approval"
              />
              {errors.name && (
                <p className="text-xs text-safety-red mt-1">{errors.name}</p>
              )}
            </div>

            {/* Linked Form */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Linked Form Definition
              </label>
              <select
                value={meta.form_definition_id}
                onChange={(e) => handleMetaChange('form_definition_id', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg
                  focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                  bg-white transition-colors"
              >
                <option value="">No form linked</option>
                {formDefinitions.map((fd) => (
                  <option key={fd.id} value={fd.id}>
                    {fd.name || fd.slug || `Form #${fd.id}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Status indicator */}
            <div className="flex items-end pb-1">
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    steps.length > 0 ? 'bg-safety-green' : 'bg-gray-300'
                  }`}
                />
                <span className="text-xs text-gray-500">
                  {steps.length} step{steps.length !== 1 ? 's' : ''} defined
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Description
            </label>
            <textarea
              value={meta.description}
              onChange={(e) => handleMetaChange('description', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg
                focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                bg-white transition-colors resize-none"
              placeholder="Brief description of this workflow..."
            />
          </div>
        </div>
      </div>

      {/* Main canvas area */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-3xl mx-auto px-6 py-6">
          <WorkflowCanvas steps={steps} onStepsChange={handleStepsChange} />
        </div>
      </div>

      {/* Bottom bar */}
      <div className="flex-shrink-0 bg-white border-t border-gray-200 px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          {/* Validation summary */}
          <div className="flex items-center gap-2">
            {isValid ? (
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-safety-green" />
                <span className="text-xs text-gray-500">All validations passed</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-safety-amber" />
                <span className="text-xs text-gray-500">
                  {validationItems.length} issue{validationItems.length !== 1 ? 's' : ''}
                </span>
              </div>
            )}

            {!isValid && (
              <div className="hidden lg:flex items-center gap-2 ml-4">
                {validationItems.map((item, i) => (
                  <span
                    key={i}
                    className="text-[10px] text-safety-amber bg-amber-50 px-1.5 py-0.5 rounded"
                  >
                    {item}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Save button + message */}
          <div className="flex items-center gap-3">
            {saveMessage && (
              <span
                className={`text-xs font-medium ${
                  saveMessage.type === 'success'
                    ? 'text-safety-green'
                    : 'text-safety-red'
                }`}
              >
                {saveMessage.text}
              </span>
            )}

            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium
                text-white bg-primary-600 hover:bg-primary-700 rounded-lg
                transition-colors duration-150 shadow-sm
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Workflow
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
