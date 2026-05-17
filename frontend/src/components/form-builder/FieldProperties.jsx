import React, { useState, useEffect } from 'react'
import {
  Settings2,
  Plus,
  Trash2,
  GripVertical,
  AlertCircle,
} from 'lucide-react'

function generateKey(label) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    || 'field'
}

export default function FieldProperties({ field, onUpdate }) {
  const [localKey, setLocalKey] = useState('')
  const [autoKey, setAutoKey] = useState(true)

  useEffect(() => {
    if (field) {
      setLocalKey(field.key || '')
      setAutoKey(!field.key)
    }
  }, [field?.id])

  if (!field) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 py-12 text-center">
        <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-4">
          <Settings2 className="w-5 h-5 text-gray-400" />
        </div>
        <h4 className="text-sm font-medium text-gray-500 mb-1">No field selected</h4>
        <p className="text-xs text-gray-400 leading-relaxed">
          Select a field on the canvas to edit its properties here.
        </p>
      </div>
    )
  }

  const handleChange = (key, value) => {
    const updates = { [key]: value }
    if (key === 'label' && autoKey) {
      updates.key = generateKey(value)
    }
    if (key === 'label' && value === '') {
      updates.key = ''
    }
    onUpdate(field.id, updates)
  }

  const handleKeyChange = (value) => {
    setAutoKey(false)
    setLocalKey(value)
    onUpdate(field.id, { key: value })
  }

  const handleValidationChange = (key, value) => {
    const newVal = value === '' ? undefined : Number(value)
    onUpdate(field.id, {
      validation: { ...field.validation, [key]: newVal },
    })
  }

  const handleAddOption = () => {
    const newOptions = [...(field.options || []), `Option ${(field.options?.length || 0) + 1}`]
    onUpdate(field.id, { options: newOptions })
  }

  const handleOptionChange = (index, value) => {
    const newOptions = [...(field.options || [])]
    newOptions[index] = value
    onUpdate(field.id, { options: newOptions })
  }

  const handleRemoveOption = (index) => {
    const newOptions = (field.options || []).filter((_, i) => i !== index)
    onUpdate(field.id, { options: newOptions })
  }

  const isSelectType = field.type === 'select' || field.type === 'multiselect'
  const isTextType = field.type === 'text'
  const isTextareaType = field.type === 'textarea'
  const isNumberType = field.type === 'number'
  const isSection = field.type === 'section'

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Field Properties
        </h3>
        <p className="text-sm text-gray-700 mt-0.5 truncate">{field.label}</p>
      </div>

      {/* Properties */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="p-4 space-y-5">

          {/* Label */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Field Label
            </label>
            <input
              type="text"
              value={field.label || ''}
              onChange={(e) => handleChange('label', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg
                         focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                         placeholder-gray-400 bg-white transition-colors"
              placeholder="Enter field label"
            />
          </div>

          {/* Key / Slug */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Field Key / Slug
            </label>
            <div className="relative">
              <input
                type="text"
                value={autoKey ? generateKey(field.label || '') : localKey}
                onChange={(e) => handleKeyChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg font-mono text-xs
                           focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                           placeholder-gray-400 bg-gray-50 transition-colors"
                placeholder="field_key"
              />
              <button
                onClick={() => {
                  setAutoKey(!autoKey)
                  if (autoKey) {
                    setLocalKey(field.key || generateKey(field.label || ''))
                  } else {
                    onUpdate(field.id, { key: generateKey(field.label || '') })
                  }
                }}
                className={`absolute right-2 top-1/2 -translate-y-1/2 text-[10px] px-1.5 py-0.5 rounded
                            ${autoKey ? 'text-primary-600 bg-primary-50' : 'text-gray-400 bg-gray-100'}`}
                title={autoKey ? 'Auto-generate from label' : 'Manual entry'}
              >
                {autoKey ? 'Auto' : 'Manual'}
              </button>
            </div>
          </div>

          {/* Placeholder (text, textarea, number, select) */}
          {!isSection && !(field.type === 'checkbox') && !(field.type === 'signature') && !(field.type === 'file') && !(field.type === 'date') && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                Placeholder
              </label>
              <input
                type="text"
                value={field.placeholder || ''}
                onChange={(e) => handleChange('placeholder', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg
                           focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                           placeholder-gray-400 bg-white transition-colors"
                placeholder="Placeholder text..."
              />
            </div>
          )}

          {/* Required toggle */}
          {!isSection && (
            <div className="flex items-center justify-between py-1">
              <label className="text-sm font-medium text-gray-700 cursor-pointer">
                Required Field
              </label>
              <button
                onClick={() => handleChange('required', !field.required)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200
                            ${field.required ? 'bg-primary-600' : 'bg-gray-200'}`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200
                              ${field.required ? 'translate-x-[18px]' : 'translate-x-[3px]'}`}
                />
              </button>
            </div>
          )}

          {/* Default Value */}
          {!isSection && field.type !== 'checkbox' && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                Default Value
              </label>
              <input
                type="text"
                value={field.defaultValue || ''}
                onChange={(e) => handleChange('defaultValue', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg
                           focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                           placeholder-gray-400 bg-white transition-colors"
                placeholder="Default value"
              />
            </div>
          )}

          {/* Options (select, multiselect) */}
          {isSelectType && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-gray-500">
                  Options
                </label>
                <button
                  onClick={handleAddOption}
                  className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium"
                >
                  <Plus className="w-3 h-3" />
                  Add Option
                </button>
              </div>
              <div className="space-y-1.5">
                {(field.options || []).map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <GripVertical className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      className="flex-1 px-2.5 py-1.5 text-sm border border-gray-200 rounded-md
                                 focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                                 bg-white transition-colors"
                      placeholder={`Option ${index + 1}`}
                    />
                    <button
                      onClick={() => handleRemoveOption(index)}
                      className="flex-shrink-0 w-6 h-6 flex items-center justify-center
                                 rounded hover:bg-red-50 hover:text-red-500 text-gray-300 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {(!field.options || field.options.length === 0) && (
                  <p className="text-xs text-gray-400 italic">No options defined</p>
                )}
              </div>
            </div>
          )}

          {/* Help Text */}
          {!isSection && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                Help Text
              </label>
              <textarea
                value={field.helpText || ''}
                onChange={(e) => handleChange('helpText', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg
                           focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                           placeholder-gray-400 bg-white transition-colors resize-none"
                placeholder="Additional instructions for this field..."
              />
            </div>
          )}

          {/* Validation */}
          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center gap-1.5 mb-3">
              <AlertCircle className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Validation
              </span>
            </div>

            <div className="space-y-3">
              {/* Min / Max for text */}
              {isTextType && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Min Length
                    </label>
                    <input
                      type="number"
                      value={field.validation?.min ?? ''}
                      onChange={(e) => handleValidationChange('min', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg
                                 focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                                 bg-white transition-colors"
                      placeholder="No minimum"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Max Length
                    </label>
                    <input
                      type="number"
                      value={field.validation?.max ?? ''}
                      onChange={(e) => handleValidationChange('max', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg
                                 focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                                 bg-white transition-colors"
                      placeholder="No maximum"
                      min="0"
                    />
                  </div>
                </>
              )}

              {/* Min / Max for number */}
              {isNumberType && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Minimum Value
                    </label>
                    <input
                      type="number"
                      value={field.validation?.min ?? ''}
                      onChange={(e) => handleValidationChange('min', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg
                                 focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                                 bg-white transition-colors"
                      placeholder="No minimum"
                      step="any"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Maximum Value
                    </label>
                    <input
                      type="number"
                      value={field.validation?.max ?? ''}
                      onChange={(e) => handleValidationChange('max', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg
                                 focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                                 bg-white transition-colors"
                      placeholder="No maximum"
                      step="any"
                    />
                  </div>
                </>
              )}

              {/* Rows for textarea */}
              {isTextareaType && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Number of Rows
                  </label>
                  <input
                    type="number"
                    value={field.rows ?? 3}
                    onChange={(e) => handleChange('rows', Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg
                               focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                               bg-white transition-colors"
                    min="1"
                    max="20"
                  />
                </div>
              )}

              {!isTextType && !isNumberType && !isTextareaType && (
                <p className="text-xs text-gray-400 italic">
                  No validation options for this field type
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
