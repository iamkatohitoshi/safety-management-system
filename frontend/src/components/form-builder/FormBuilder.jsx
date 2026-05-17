import React, { useState, useCallback, useRef } from 'react'
import {
  Save,
  Eye,
  Download,
  Upload,
  FileJson,
  ArrowLeft,
} from 'lucide-react'
import FieldPalette from './FieldPalette'
import FormCanvas from './FormCanvas'
import FieldProperties from './FieldProperties'

function generateKey(label) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    || 'field'
}

const CATEGORIES = [
  { value: 'toolbox', label: 'Toolbox Talk' },
  { value: 'ptw', label: 'Permit to Work' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'action', label: 'Action' },
  { value: 'general', label: 'General' },
]

function mapFieldTypeToJsonSchema(field) {
  const typeMap = {
    text: 'string',
    textarea: 'string',
    number: 'number',
    select: 'string',
    multiselect: 'array',
    date: 'string',
    checkbox: 'boolean',
    file: 'string',
    signature: 'string',
    section: 'object',
  }

  const schemaType = typeMap[field.type] || 'string'

  const schema = {
    type: schemaType,
    title: field.label,
    description: field.helpText || undefined,
  }

  if (field.defaultValue !== '' && field.defaultValue !== undefined) {
    if (schemaType === 'number') {
      schema.default = Number(field.defaultValue)
    } else if (schemaType === 'boolean') {
      schema.default = field.defaultValue === 'true' || field.defaultValue === true
    } else {
      schema.default = field.defaultValue
    }
  }

  if (field.type === 'select' && field.options?.length) {
    schema.enum = field.options
  }

  if (field.type === 'multiselect' && field.options?.length) {
    schema.items = { type: 'string', enum: field.options }
    schema.uniqueItems = true
  }

  if (field.type === 'date') {
    schema.format = 'date'
  }

  if (field.type === 'file') {
    schema.format = 'data-url'
  }

  if (field.validation) {
    if (field.validation.min !== undefined && field.validation.min !== null) {
      const minKey = field.type === 'text' || field.type === 'textarea' ? 'minLength' : 'minimum'
      schema[minKey] = field.validation.min
    }
    if (field.validation.max !== undefined && field.validation.max !== null) {
      const maxKey = field.type === 'text' || field.type === 'textarea' ? 'maxLength' : 'maximum'
      schema[maxKey] = field.validation.max
    }
  }

  return schema
}

function mapFieldToUiSchema(field) {
  const ui = {}

  if (field.type === 'textarea') {
    ui['ui:widget'] = 'textarea'
    if (field.rows) {
      ui['ui:options'] = { rows: field.rows }
    }
  } else if (field.type === 'select') {
    ui['ui:widget'] = 'select'
  } else if (field.type === 'multiselect') {
    ui['ui:widget'] = 'checkboxes'
  } else if (field.type === 'checkbox') {
    ui['ui:widget'] = 'checkbox'
  } else if (field.type === 'date') {
    ui['ui:widget'] = 'date'
  } else if (field.type === 'file') {
    ui['ui:widget'] = 'file'
  } else if (field.type === 'signature') {
    ui['ui:widget'] = 'signature'
  }

  if (field.placeholder) {
    ui['ui:placeholder'] = field.placeholder
  }

  if (field.helpText) {
    ui['ui:help'] = field.helpText
  }

  return ui
}

function generateSchema(fields) {
  const properties = {}
  const required = []
  const uiSchema = {}

  fields.forEach((field) => {
    if (field.type === 'section') {
      properties[field.key || field.id] = {
        type: 'object',
        title: field.label,
        'ui:widget': 'section',
      }
      return
    }

    const key = field.key || field.id
    properties[key] = mapFieldTypeToJsonSchema(field)
    uiSchema[key] = mapFieldToUiSchema(field)

    if (field.required) {
      required.push(key)
    }
  })

  return {
    schema_jsonb: {
      type: 'object',
      title: 'Form',
      properties,
      required: required.length > 0 ? required : undefined,
    },
    ui_schema_jsonb: uiSchema,
  }
}

export default function FormBuilder({
  initialFields,
  initialFormMeta,
  onSave,
  onBack,
}) {
  const [fields, setFields] = useState(initialFields || [])
  const [selectedFieldId, setSelectedFieldId] = useState(null)
  const [formMeta, setFormMeta] = useState(
    initialFormMeta || {
      name: '',
      slug: '',
      category: 'general',
      description: '',
      version: 1,
      status: 'draft',
    }
  )
  const [autoSlug, setAutoSlug] = useState(true)
  const [showPreview, setShowPreview] = useState(false)
  const [previewData, setPreviewData] = useState({})
  const [jsonOutput, setJsonOutput] = useState(null)
  const [showJson, setShowJson] = useState(false)
  const [importError, setImportError] = useState(null)
  const fileInputRef = useRef(null)

  const selectedField = fields.find((f) => f.id === selectedFieldId) || null

  const handleFieldsChange = useCallback((newFields) => {
    setFields(newFields)
  }, [])

  const handleSelectField = useCallback((id) => {
    setSelectedFieldId(id)
  }, [])

  const handleUpdateField = useCallback((fieldId, updates) => {
    setFields((prev) =>
      prev.map((f) => (f.id === fieldId ? { ...f, ...updates } : f))
    )
  }, [])

  const handleAddField = useCallback((field) => {
    setFields((prev) => [...prev, field])
    setSelectedFieldId(field.id)
  }, [])

  const handleMetaChange = useCallback(
    (key, value) => {
      const updates = { [key]: value }
      if (key === 'name' && autoSlug) {
        updates.slug = generateKey(value)
      }
      setFormMeta((prev) => ({ ...prev, ...updates }))
    },
    [autoSlug]
  )

  const handleSave = useCallback(() => {
    const { schema_jsonb, ui_schema_jsonb } = generateSchema(fields)
    const payload = {
      ...formMeta,
      fields: fields.map(({ id, ...rest }) => ({ ...rest, id })),
      schema_jsonb,
      ui_schema_jsonb,
    }
    if (onSave) {
      onSave(payload)
    }
  }, [fields, formMeta, onSave])

  const handlePreview = useCallback(() => {
    setShowPreview(true)
    setShowJson(false)
  }, [])

  const handleExportJson = useCallback(() => {
    const { schema_jsonb, ui_schema_jsonb } = generateSchema(fields)
    const payload = {
      meta: formMeta,
      fields: fields.map(({ id, ...rest }) => ({ ...rest, id })),
      schema_jsonb,
      ui_schema_jsonb,
    }
    setJsonOutput(JSON.stringify(payload, null, 2))
    setShowJson(true)
    setShowPreview(false)
  }, [fields, formMeta])

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleImportFile = useCallback(
    (e) => {
      const file = e.target.files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result)
          if (data.fields && Array.isArray(data.fields)) {
            setFields(data.fields)
            setSelectedFieldId(null)
            if (data.meta) {
              setFormMeta(data.meta)
            }
            setImportError(null)
          } else {
            setImportError('Invalid form definition: missing "fields" array')
          }
        } catch {
          setImportError('Invalid JSON file')
        }
      }
      reader.readAsText(file)
      e.target.value = ''
    },
    []
  )

  const handleImportPaste = useCallback(() => {
    const text = window.prompt('Paste JSON form definition:')
    if (!text) return
    try {
      const data = JSON.parse(text)
      if (data.fields && Array.isArray(data.fields)) {
        setFields(data.fields)
        setSelectedFieldId(null)
        if (data.meta) {
          setFormMeta(data.meta)
        }
        setImportError(null)
      } else {
        setImportError('Invalid form definition: missing "fields" array')
      }
    } catch {
      setImportError('Invalid JSON')
    }
  }, [])

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Top Bar */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200">
        {/* Meta inputs row */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-4 flex-wrap">
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            )}

            <div className="flex-1 min-w-[200px] max-w-xs">
              <input
                type="text"
                value={formMeta.name}
                onChange={(e) => handleMetaChange('name', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg
                           focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                           placeholder-gray-400 bg-white transition-colors"
                placeholder="Form Name"
              />
            </div>

            <div className="flex-1 min-w-[160px] max-w-[200px]">
              <div className="relative">
                <input
                  type="text"
                  value={autoSlug ? generateKey(formMeta.name || '') : formMeta.slug}
                  onChange={(e) => {
                    setAutoSlug(false)
                    handleMetaChange('slug', e.target.value)
                  }}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg font-mono text-xs
                             focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                             placeholder-gray-400 bg-white transition-colors"
                  placeholder="form_slug"
                />
                <button
                  onClick={() => {
                    setAutoSlug(!autoSlug)
                    if (autoSlug) {
                      handleMetaChange('slug', generateKey(formMeta.name || ''))
                    }
                  }}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 text-[10px] px-1.5 py-0.5 rounded
                              ${autoSlug ? 'text-primary-600 bg-primary-50' : 'text-gray-400 bg-gray-100'}`}
                >
                  {autoSlug ? 'Auto' : 'Manual'}
                </button>
              </div>
            </div>

            <select
              value={formMeta.category}
              onChange={(e) => handleMetaChange('category', e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg
                         focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                         bg-white transition-colors min-w-[140px]"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>

            <input
              type="text"
              value={formMeta.description}
              onChange={(e) => handleMetaChange('description', e.target.value)}
              className="flex-1 min-w-[200px] max-w-sm px-3 py-2 text-sm border border-gray-200 rounded-lg
                         focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                         placeholder-gray-400 bg-white transition-colors"
              placeholder="Brief description..."
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="px-4 py-2 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium
                         text-white bg-primary-600 hover:bg-primary-700 rounded-lg
                         transition-colors duration-150 shadow-sm"
            >
              <Save className="w-4 h-4" />
              Save Form
            </button>
            <button
              onClick={handlePreview}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium
                         text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg
                         transition-colors duration-150"
            >
              <Eye className="w-4 h-4" />
              Preview
            </button>
            <button
              onClick={handleExportJson}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium
                         text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg
                         transition-colors duration-150"
            >
              <Download className="w-4 h-4" />
              Export JSON
            </button>
            <button
              onClick={handleImportClick}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium
                         text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg
                         transition-colors duration-150"
            >
              <Upload className="w-4 h-4" />
              Import JSON
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImportFile}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">
              {fields.length} field{fields.length !== 1 ? 's' : ''}
            </span>
            {formMeta.status && (
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wider
                                ${formMeta.status === 'published'
                                  ? 'bg-safety-green/10 text-safety-green'
                                  : formMeta.status === 'archived'
                                  ? 'bg-gray-100 text-gray-500'
                                  : 'bg-safety-amber/10 text-safety-amber'
                                }`}
              >
                {formMeta.status}
              </span>
            )}
          </div>
        </div>

        {/* Import error */}
        {importError && (
          <div className="px-4 py-2 bg-red-50 border-b border-red-100">
            <p className="text-xs text-red-600 flex items-center gap-1.5">
              <span className="font-medium">Import Error:</span> {importError}
              <button
                onClick={() => setImportError(null)}
                className="ml-auto text-red-400 hover:text-red-600 font-medium"
              >
                Dismiss
              </button>
            </p>
          </div>
        )}
      </div>

      {/* Main 3-column layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Field Palette */}
        <div className="flex-shrink-0 w-[220px]">
          <FieldPalette onAddField={handleAddField} />
        </div>

        {/* Center: Form Canvas */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Canvas header */}
          {!showPreview && !showJson && (
            <div className="flex-shrink-0 px-5 py-2.5 bg-white border-b border-gray-200">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gray-300" />
                <div className="w-2 h-2 rounded-full bg-gray-300" />
                <div className="w-2 h-2 rounded-full bg-gray-300" />
                <span className="ml-2 text-[10px] text-gray-400 font-medium uppercase tracking-wider">
                  Form Canvas
                </span>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto scrollbar-thin bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-50 to-gray-100/50">
            {showPreview ? (
              <div className="max-w-2xl mx-auto p-6">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                  <div className="px-5 py-4 border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-900">{formMeta.name || 'Form Preview'}</h3>
                    {formMeta.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{formMeta.description}</p>
                    )}
                  </div>
                  <div className="p-5 space-y-4">
                    {fields.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-8">No fields to preview</p>
                    ) : (
                      fields.map((field) => (
                        <div key={field.id}>
                          {field.type === 'section' ? (
                            <div className="flex items-center gap-3 py-2">
                              <div className="h-px flex-1 bg-gray-200" />
                              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                {field.label}
                              </span>
                              <div className="h-px flex-1 bg-gray-200" />
                            </div>
                          ) : (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                {field.label}
                                {field.required && <span className="text-red-500 ml-0.5">*</span>}
                              </label>
                              {field.type === 'textarea' ? (
                                <textarea
                                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50"
                                  rows={field.rows || 3}
                                  placeholder={field.placeholder}
                                  disabled
                                />
                              ) : field.type === 'select' ? (
                                <select className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50" disabled>
                                  <option>{field.placeholder || 'Select...'}</option>
                                  {field.options?.map((opt, i) => (
                                    <option key={i}>{opt}</option>
                                  ))}
                                </select>
                              ) : field.type === 'multiselect' ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {field.options?.map((opt, i) => (
                                    <label key={i} className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
                                      <input type="checkbox" className="rounded border-gray-300" disabled />
                                      {opt}
                                    </label>
                                  ))}
                                </div>
                              ) : field.type === 'checkbox' ? (
                                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                                  <input type="checkbox" className="rounded border-gray-300" disabled />
                                  {field.placeholder || 'Enable option'}
                                </label>
                              ) : field.type === 'date' ? (
                                <input type="date" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50" disabled />
                              ) : field.type === 'file' ? (
                                <div className="h-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center">
                                  <span className="text-xs text-gray-400">File upload area</span>
                                </div>
                              ) : field.type === 'signature' ? (
                                <div className="h-20 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center">
                                  <span className="text-xs text-gray-400">Signature pad</span>
                                </div>
                              ) : (
                                <input
                                  type={field.type === 'number' ? 'number' : 'text'}
                                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50"
                                  placeholder={field.placeholder}
                                  disabled
                                />
                              )}
                              {field.helpText && (
                                <p className="text-[11px] text-gray-400 mt-1">{field.helpText}</p>
                              )}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                  <div className="px-5 py-3 border-t border-gray-100 flex justify-end">
                    <button
                      onClick={() => setShowPreview(false)}
                      className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                    >
                      Close Preview
                    </button>
                  </div>
                </div>
              </div>
            ) : showJson ? (
              <div className="max-w-3xl mx-auto p-6">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileJson className="w-4 h-4 text-gray-500" />
                      <h3 className="text-sm font-semibold text-gray-900">JSON Schema Export</h3>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard?.writeText(jsonOutput || '')
                      }}
                      className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                    >
                      Copy to Clipboard
                    </button>
                  </div>
                  <pre className="p-4 text-xs font-mono text-gray-700 overflow-x-auto bg-gray-50 max-h-[600px] scrollbar-thin">
                    {jsonOutput || 'No data'}
                  </pre>
                  <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-2">
                    <button
                      onClick={() => setShowJson(false)}
                      className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => {
                        const blob = new Blob([jsonOutput], { type: 'application/json' })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = `${formMeta.slug || 'form'}.json`
                        a.click()
                        URL.revokeObjectURL(url)
                      }}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md transition-colors"
                    >
                      Download
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="max-w-2xl mx-auto p-6">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                  <FormCanvas
                    fields={fields}
                    onFieldsChange={handleFieldsChange}
                    selectedFieldId={selectedFieldId}
                    onSelectField={handleSelectField}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Field Properties */}
        <div className="flex-shrink-0 w-[280px] border-l border-gray-200">
          <FieldProperties field={selectedField} onUpdate={handleUpdateField} />
        </div>
      </div>
    </div>
  )
}
