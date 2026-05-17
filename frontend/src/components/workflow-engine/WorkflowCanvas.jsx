import React, { useState } from 'react'
import { Plus, ArrowDown, GitMerge } from 'lucide-react'
import StepNode from './StepNode'

function generateId() {
  return 'step_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 6)
}

function createDefaultStep(index) {
  return {
    id: generateId(),
    name: '',
    assigneeRole: '',
    approvalType: 'sequential',
    onApprove: index === 0 ? '__end__' : '',
    onReject: '',
    onRevision: '',
  }
}

export default function WorkflowCanvas({ steps, onStepsChange }) {
  const [activeStepId, setActiveStepId] = useState(null)

  const handleAddStep = () => {
    const newStep = createDefaultStep(steps.length)
    onStepsChange([...steps, newStep])
    setActiveStepId(newStep.id)
  }

  const handleUpdate = (stepId, updates) => {
    onStepsChange(
      steps.map((s) => (s.id === stepId ? { ...s, ...updates } : s))
    )
  }

  const handleDelete = (stepId) => {
    onStepsChange(steps.filter((s) => s.id !== stepId))
    if (activeStepId === stepId) {
      setActiveStepId(null)
    }
  }

  const handleMoveUp = (stepId) => {
    const idx = steps.findIndex((s) => s.id === stepId)
    if (idx <= 0) return
    const newSteps = [...steps]
    ;[newSteps[idx - 1], newSteps[idx]] = [newSteps[idx], newSteps[idx - 1]]
    onStepsChange(newSteps)
  }

  const handleMoveDown = (stepId) => {
    const idx = steps.findIndex((s) => s.id === stepId)
    if (idx === -1 || idx >= steps.length - 1) return
    const newSteps = [...steps]
    ;[newSteps[idx], newSteps[idx + 1]] = [newSteps[idx + 1], newSteps[idx]]
    onStepsChange(newSteps)
  }

  if (!steps || steps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
          <GitMerge className="w-7 h-7 text-gray-400" />
        </div>
        <h3 className="text-sm font-semibold text-gray-700 mb-1">No workflow steps defined</h3>
        <p className="text-xs text-gray-400 text-center max-w-sm mb-6">
          Add approval steps to build your workflow. Each step represents a person or role that needs to approve.
        </p>
        <button
          onClick={handleAddStep}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium
            text-white bg-primary-600 hover:bg-primary-700 rounded-lg
            transition-colors duration-150 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add First Step
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="space-y-0">
        {steps.map((step, index) => (
          <div key={step.id}>
            {/* Arrow connector between steps */}
            {index > 0 && (
              <div className="flex justify-center py-1">
                <div className="flex flex-col items-center">
                  <div className="w-0.5 h-4 bg-gray-300" />
                  <ArrowDown className="w-4 h-4 text-gray-400 -mt-0.5" />
                </div>
              </div>
            )}

            {/* Flow label showing what triggers the next step */}
            {index > 0 && (
              <div className="flex justify-center mb-1">
                <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                  {steps[index - 1]?.onApprove === `step_${index}`
                    ? 'On Approve →'
                    : steps[index - 1]?.onReject === `step_${index}`
                    ? 'On Reject →'
                    : steps[index - 1]?.onRevision === `step_${index}`
                    ? 'On Revision →'
                    : '→ Next'}
                </span>
              </div>
            )}

            <StepNode
              step={step}
              index={index}
              totalSteps={steps.length}
              isActive={activeStepId === step.id}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
            />
          </div>
        ))}
      </div>

      {/* Add step button */}
      <div className="flex justify-center mt-4">
        <button
          onClick={handleAddStep}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium
            text-primary-700 bg-primary-50 border border-primary-200
            hover:bg-primary-100 rounded-lg transition-colors duration-150"
        >
          <Plus className="w-4 h-4" />
          Add Step
        </button>
      </div>
    </div>
  )
}
