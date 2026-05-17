import React from 'react'
import { GitMerge } from 'lucide-react'

export default function WorkflowsPage() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="p-4 bg-primary-50 rounded-full mb-4">
        <GitMerge className="w-8 h-8 text-primary-600" />
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Workflow Engine</h2>
      <p className="text-sm text-gray-500">Manage approval workflows and automation</p>
    </div>
  )
}
