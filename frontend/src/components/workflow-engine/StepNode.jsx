import React from 'react'
import {
  ChevronUp,
  ChevronDown,
  Trash2,
  ArrowRight,
  GitBranch,
} from 'lucide-react'

const ROLE_OPTIONS = [
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'worker', label: 'Worker' },
  { value: 'hse', label: 'HSE Officer' },
  { value: 'director', label: 'Director' },
]

const APPROVAL_TYPE_OPTIONS = [
  { value: 'sequential', label: 'Sequential' },
  { value: 'parallel', label: 'Parallel' },
]

const DECISION_OPTIONS = [
  { value: 'approve', label: 'Approve' },
  { value: 'reject', label: 'Reject' },
  { value: 'revision', label: 'Request Revision' },
]

export default function StepNode({
  step,
  index,
  totalSteps,
  isActive,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
}) {
  const handleChange = (key, value) => {
    onUpdate(step.id, { [key]: value })
  }

  const getStepColorClass = () => {
    switch (step.approvalType) {
      case 'parallel':
        return 'border-l-safety-blue'
      default:
        return 'border-l-primary-500'
    }
  }

  return (
    <div
      className={`bg-white rounded-xl border shadow-sm transition-all duration-200
        ${isActive ? 'border-primary-300 shadow-md ring-1 ring-primary-100' : 'border-gray-200'}
        border-l-4 ${getStepColorClass()}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
              ${isActive
                ? 'bg-primary-100 text-primary-700'
                : 'bg-gray-100 text-gray-500'
              }
            `}
          >
            {index + 1}
          </div>
          <span className="text-sm font-medium text-gray-700">Step {index + 1}</span>
          {step.approvalType === 'parallel' && (
            <span className="flex items-center gap-1 text-[10px] font-medium text-safety-blue bg-blue-50 px-1.5 py-0.5 rounded-full">
              <GitBranch className="w-3 h-3" />
              Parallel
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onMoveUp(step.id)}
            disabled={index === 0}
            className={`p-1 rounded-md transition-colors
              ${index === 0
                ? 'text-gray-200 cursor-not-allowed'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              }
            `}
            title="Move up"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            onClick={() => onMoveDown(step.id)}
            disabled={index === totalSteps - 1}
            className={`p-1 rounded-md transition-colors
              ${index === totalSteps - 1
                ? 'text-gray-200 cursor-not-allowed'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              }
            `}
            title="Move down"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(step.id)}
            className="p-1 rounded-md text-gray-400 hover:text-safety-red hover:bg-red-50 transition-colors ml-1"
            title="Delete step"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-3">
        {/* Step Name */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Step Name
          </label>
          <input
            type="text"
            value={step.name || ''}
            onChange={(e) => handleChange('name', e.target.value)}
            className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg
              focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white
              placeholder-gray-400 transition-colors"
            placeholder="e.g. Supervisor Review"
          />
        </div>

        {/* Assignee Role */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Assignee Role
          </label>
          <select
            value={step.assigneeRole || ''}
            onChange={(e) => handleChange('assigneeRole', e.target.value)}
            className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg
              focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white transition-colors"
          >
            <option value="" disabled>
              Select a role...
            </option>
            {ROLE_OPTIONS.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
        </div>

        {/* Approval Type */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Approval Type
          </label>
          <div className="flex gap-2">
            {APPROVAL_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleChange('approvalType', opt.value)}
                className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors
                  ${step.approvalType === opt.value
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                  }
                `}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Decision Routing */}
        <div className="space-y-2 pt-1 border-t border-gray-100">
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
            Decision Routing
          </span>

          {DECISION_OPTIONS.map((decision) => {
            const routeKey = `on${decision.value.charAt(0).toUpperCase() + decision.value.slice(1)}`
            const routeValue = step[routeKey] || ''

            return (
              <div key={decision.value} className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-medium w-20 flex-shrink-0
                    ${decision.value === 'approve'
                      ? 'text-safety-green'
                      : decision.value === 'reject'
                      ? 'text-safety-red'
                      : 'text-safety-amber'
                    }
                  `}
                >
                  {decision.label}
                </span>
                <ArrowRight className="w-3 h-3 text-gray-300 flex-shrink-0" />
                <select
                  value={routeValue}
                  onChange={(e) => handleChange(routeKey, e.target.value)}
                  className="flex-1 px-2 py-1 text-[11px] border border-gray-200 rounded-md
                    focus:ring-1 focus:ring-primary-500 focus:border-primary-500 bg-white transition-colors"
                >
                  <option value="" disabled>
                    Next step...
                  </option>
                  <option value="__end__">End Workflow</option>
                  {Array.from({ length: totalSteps }, (_, i) => (
                    <option key={i} value={`step_${i}`}>
                      Step {i + 1}
                    </option>
                  ))}
                </select>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
