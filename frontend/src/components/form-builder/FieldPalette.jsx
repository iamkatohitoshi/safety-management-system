import React from 'react'
import {
  Type,
  AlignLeft,
  Hash,
  ChevronDown,
  List,
  Calendar,
  CheckSquare,
  Upload,
  Pen,
  Heading,
} from 'lucide-react'

const FIELD_TYPES = [
  { type: 'text', label: 'Text Input', icon: Type, description: 'Single line text' },
  { type: 'textarea', label: 'Text Area', icon: AlignLeft, description: 'Multi-line text' },
  { type: 'number', label: 'Number', icon: Hash, description: 'Numeric input' },
  { type: 'select', label: 'Select', icon: ChevronDown, description: 'Single select dropdown' },
  { type: 'multiselect', label: 'Multi-Select', icon: List, description: 'Multiple select' },
  { type: 'date', label: 'Date', icon: Calendar, description: 'Date picker' },
  { type: 'checkbox', label: 'Checkbox', icon: CheckSquare, description: 'Boolean checkbox' },
  { type: 'file', label: 'File Upload', icon: Upload, description: 'File attachment' },
  { type: 'signature', label: 'Signature', icon: Pen, description: 'Signature pad' },
  { type: 'section', label: 'Section Header', icon: Heading, description: 'Section divider with title' },
]

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}

function generateKey(label) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    || 'field'
}

function createDefaultField(type) {
  const base = {
    id: generateId(),
    type,
    label: FIELD_TYPES.find((f) => f.type === type)?.label || type,
    key: '',
    required: false,
    placeholder: '',
    helpText: '',
    defaultValue: '',
    options: [],
    validation: {},
  }

  switch (type) {
    case 'textarea':
      return { ...base, rows: 3 }
    case 'select':
    case 'multiselect':
      return { ...base, options: ['Option 1', 'Option 2', 'Option 3'] }
    case 'number':
      return { ...base, validation: { min: 0, max: 999999 } }
    case 'section':
      return { ...base, label: 'Section Name' }
    default:
      return base
  }
}

export default function FieldPalette({ onAddField }) {
  const handleDragStart = (e, fieldType) => {
    e.dataTransfer.setData('text/plain', fieldType)
    e.dataTransfer.effectAllowed = 'copy'
  }

  const handleClick = (fieldType) => {
    const field = createDefaultField(fieldType)
    field.key = generateKey(field.label)
    if (onAddField) onAddField(field)
  }

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Field Types
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin">
        {FIELD_TYPES.map(({ type, label, icon: Icon, description }) => (
          <div
            key={type}
            draggable
            onDragStart={(e) => handleDragStart(e, type)}
            onClick={() => handleClick(type)}
            className="group flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-grab active:cursor-grabbing
                       border border-transparent hover:border-gray-200 hover:bg-gray-50
                       transition-all duration-150 select-none"
          >
            <div className="flex-shrink-0 w-8 h-8 rounded-md bg-gray-100 group-hover:bg-white
                            flex items-center justify-center border border-gray-200
                            group-hover:border-gray-300 transition-colors duration-150">
              <Icon className="w-4 h-4 text-gray-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900 truncate">
                {label}
              </p>
              <p className="text-xs text-gray-400 truncate">{description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="px-4 py-3 border-t border-gray-200 bg-gray-50/50">
        <p className="text-xs text-gray-400 text-center">
          Drag fields onto the canvas or click to add
        </p>
      </div>
    </div>
  )
}
