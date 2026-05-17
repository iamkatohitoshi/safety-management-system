import React from 'react'
import { ClipboardList } from 'lucide-react'

export default function FormsPage() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="p-4 bg-primary-50 rounded-full mb-4">
        <ClipboardList className="w-8 h-8 text-primary-600" />
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Form Builder</h2>
      <p className="text-sm text-gray-500">Create and manage safety forms</p>
    </div>
  )
}
