import React, { useState, useCallback } from 'react'
import {
  GripVertical,
  X,
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
  Plus,
} from 'lucide-react'

const FIELD_ICONS = {
  text: Type,
  textarea: AlignLeft,
  number: Hash,
  select: ChevronDown,
  multiselect: List,
  date: Calendar,
  checkbox: CheckSquare,
  file: Upload,
  signature: Pen,
  section: Heading,
}

const FIELD_COLORS = {
  text: 'border-l-gray-400',
  textarea: 'border-l-blue-400',
  number: 'border-l-amber-400',
  select: 'border-l-purple-400',
  multiselect: 'border-l-pink-400',
  date: 'border-l-green-400',
  checkbox: 'border-l-primary-400',
  file: 'border-l-teal-400',
  signature: 'border-l-indigo-400',
  section: 'border-l-safety-amber',
}

function FieldPreview({ type, placeholder, options, rows }) {
  switch (type) {
    case 'text':
      return (
        <div className="h-8 bg-gray-50 rounded-md border border-gray-200 px-3 flex items-center">
          <span className="text-xs text-gray-400">{placeholder || 'Text input...'}</span>
        </div>
      )
    case 'textarea':
      return (
        <div
          className="bg-gray-50 rounded-md border border-gray-200 px-3 py-2"
          style={{ minHeight: rows ? `${rows * 28 + 16}px` : '64px' }}
        >
          <span className="text-xs text-gray-400">{placeholder || 'Text area...'}</span>
        </div>
      )
    case 'number':
      return (
        <div className="h-8 bg-gray-50 rounded-md border border-gray-200 px-3 flex items-center">
          <span className="text-xs text-gray-400">{placeholder || '0'}</span>
        </div>
      )
    case 'select':
      return (
        <div className="h-8 bg-gray-50 rounded-md border border-gray-200 px-3 flex items-center justify-between">
          <span className="text-xs text-gray-400">{placeholder || 'Select an option...'}</span>
          <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
        </div>
      )
    case 'multiselect':
      return (
        <div className="h-8 bg-gray-50 rounded-md border border-gray-200 px-3 flex items-center gap-1.5">
          {options?.slice(0, 2).map((opt, i) => (
            <span key={i} className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
              {opt}
            </span>
          ))}
          {options?.length > 2 && (
            <span className="text-[10px] text-gray-400">+{options.length - 2}</span>
          )}
        </div>
      )
    case 'date':
      return (
        <div className="h-8 bg-gray-50 rounded-md border border-gray-200 px-3 flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs text-gray-400">Select date...</span>
        </div>
      )
    case 'checkbox':
      return (
        <div className="flex items-center gap-2 py-1">
          <div className="w-4 h-4 rounded border-2 border-gray-300 flex items-center justify-center">
            <CheckSquare className="w-3 h-3 text-primary-500" />
          </div>
          <span className="text-xs text-gray-400">Enable this option</span>
        </div>
      )
    case 'file':
      return (
        <div className="h-16 bg-gray-50 rounded-md border-2 border-dashed border-gray-200 flex items-center justify-center gap-2">
          <Upload className="w-4 h-4 text-gray-400" />
          <span className="text-xs text-gray-400">Drop files or click to upload</span>
        </div>
      )
    case 'signature':
      return (
        <div className="h-16 bg-gray-50 rounded-md border border-gray-200 flex items-center justify-center">
          <Pen className="w-4 h-4 text-gray-400" />
          <span className="text-xs text-gray-400 ml-2">Sign here</span>
        </div>
      )
    default:
      return null
  }
}

export default function FormCanvas({
  fields,
  onFieldsChange,
  selectedFieldId,
  onSelectField,
}) {
  const [dragOverIndex, setDragOverIndex] = useState(null)
  const [draggedFieldId, setDraggedFieldId] = useState(null)

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault()
      const fieldType = e.dataTransfer.getData('text/plain')
      if (!fieldType) return

      const newField = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
        type: fieldType,
        label: fieldType.charAt(0).toUpperCase() + fieldType.slice(1).replace(/([A-Z])/g, ' $1').trim(),
        key: fieldType.toLowerCase().replace(/\s+/g, '_'),
        required: false,
        placeholder: '',
        helpText: '',
        defaultValue: '',
        options: fieldType === 'select' || fieldType === 'multiselect' ? ['Option 1'] : [],
        validation: {},
        rows: fieldType === 'textarea' ? 3 : undefined,
      }

      if (fieldType === 'section') {
        newField.label = 'Section Name'
      }

      onFieldsChange([...fields, newField])
      onSelectField(newField.id)
      setDragOverIndex(null)
    },
    [fields, onFieldsChange, onSelectField]
  )

  const handleFieldDragStart = useCallback((e, fieldId) => {
    setDraggedFieldId(fieldId)
    e.dataTransfer.setData('application/json', fieldId)
    e.dataTransfer.effectAllowed = 'move'
    e.currentTarget.style.opacity = '0.5'
  }, [])

  const handleFieldDragEnd = useCallback((e) => {
    setDraggedFieldId(null)
    setDragOverIndex(null)
    e.currentTarget.style.opacity = '1'
  }, [])

  const handleFieldDragOver = useCallback(
    (e, index) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      setDragOverIndex(index)
    },
    []
  )

  const handleFieldDrop = useCallback(
    (e, dropIndex) => {
      e.preventDefault()
      const draggedId = e.dataTransfer.getData('application/json')
      if (!draggedId) return

      const fromIndex = fields.findIndex((f) => f.id === draggedId)
      if (fromIndex === -1 || fromIndex === dropIndex) {
        setDragOverIndex(null)
        setDraggedFieldId(null)
        return
      }

      const newFields = [...fields]
      const [moved] = newFields.splice(fromIndex, 1)
      newFields.splice(dropIndex, 0, moved)
      onFieldsChange(newFields)
      setDragOverIndex(null)
      setDraggedFieldId(null)
    },
    [fields, onFieldsChange]
  )

  const handleDelete = useCallback(
    (e, fieldId) => {
      e.stopPropagation()
      const newFields = fields.filter((f) => f.id !== fieldId)
      onFieldsChange(newFields)
      if (selectedFieldId === fieldId) {
        onSelectField(null)
      }
    },
    [fields, onFieldsChange, selectedFieldId, onSelectField]
  )

  if (!fields || fields.length === 0) {
    return (
      <div
        className="flex-1 flex items-center justify-center min-h-[400px]"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="text-center px-8 py-12 border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50/50 max-w-md mx-auto">
          <div className="mx-auto w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
            <Plus className="w-6 h-6 text-gray-400" />
          </div>
          <h3 className="text-sm font-semibold text-gray-700 mb-1">Drag fields here</h3>
          <p className="text-xs text-gray-400 leading-relaxed">
            Drag field types from the left panel onto this canvas to build your form.
            <br />
            You can also click a field type to add it instantly.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="flex-1 min-h-[400px]"
      onDragOver={(e) => {
        e.preventDefault()
        if (!draggedFieldId) {
          e.dataTransfer.dropEffect = 'copy'
        }
      }}
      onDrop={handleDrop}
    >
      <div className="space-y-1.5 p-1">
        {fields.map((field, index) => {
          const Icon = FIELD_ICONS[field.type] || Type
          const isSelected = selectedFieldId === field.id
          const isDragging = draggedFieldId === field.id

          return (
            <React.Fragment key={field.id}>
              {/* Drop indicator above */}
              {dragOverIndex === index && !isDragging && (
                <div className="h-1 rounded-full bg-primary-400 mx-2 transition-all duration-150" />
              )}

              <div
                draggable
                onDragStart={(e) => handleFieldDragStart(e, field.id)}
                onDragEnd={handleFieldDragEnd}
                onDragOver={(e) => handleFieldDragOver(e, index)}
                onDrop={(e) => handleFieldDrop(e, index)}
                onClick={() => onSelectField(field.id)}
                className={`
                  group relative flex items-start gap-2 px-3 py-3 rounded-xl cursor-pointer
                  border-2 bg-white transition-all duration-150
                  ${isSelected
                    ? 'border-primary-500 shadow-md shadow-primary-100 bg-primary-50/30'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                  }
                  ${isDragging ? 'opacity-50 shadow-lg' : ''}
                  ${field.type === 'section' ? 'bg-gradient-to-r from-amber-50/40 to-white' : ''}
                  border-l-4
                  ${FIELD_COLORS[field.type] || 'border-l-gray-400'}
                `}
              >
                {/* Drag handle */}
                <div className="flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  <GripVertical className="w-4 h-4 text-gray-300 cursor-grab active:cursor-grabbing" />
                </div>

                {/* Field content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`
                      flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center
                      ${isSelected ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-500'}
                    `}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className={`text-sm font-medium truncate ${isSelected ? 'text-primary-800' : 'text-gray-700'}`}>
                      {field.label}
                    </span>
                    {field.required && (
                      <span className="text-xs text-safety-red font-medium">*</span>
                    )}
                    <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded uppercase tracking-wider ml-auto">
                      {field.type}
                    </span>
                  </div>

                  {field.type === 'section' ? (
                    <div className="flex items-center gap-3">
                      <div className="h-px flex-1 bg-gray-200" />
                      <span className="text-[10px] text-gray-400 uppercase tracking-widest">Section</span>
                      <div className="h-px flex-1 bg-gray-200" />
                    </div>
                  ) : (
                    <div className="ml-9">
                      <FieldPreview
                        type={field.type}
                        placeholder={field.placeholder}
                        options={field.options}
                        rows={field.rows}
                      />
                      {field.helpText && (
                        <p className="text-[10px] text-gray-400 mt-1 ml-1">{field.helpText}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Delete button */}
                <button
                  onClick={(e) => handleDelete(e, field.id)}
                  className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center
                             opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500
                             text-gray-300 transition-all duration-150 mt-0.5"
                  title="Remove field"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </React.Fragment>
          )
        })}

        {/* Drop indicator at the end */}
        {dragOverIndex === fields.length && (
          <div className="h-1 rounded-full bg-primary-400 mx-2 transition-all duration-150" />
        )}
      </div>
    </div>
  )
}
