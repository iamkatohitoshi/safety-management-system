import React, { useCallback } from 'react'
import {
  HelpCircle,
  Asterisk,
  Upload,
  PenLine,
  ChevronDown,
  Calendar,
  CheckSquare,
  FileText,
} from 'lucide-react'

function FormTextField({ fieldKey, field, value, onChange, error, readOnly, required, uiOptions }) {
  return (
    <div className="space-y-1.5">
      <input
        type="text"
        id={fieldKey}
        value={value ?? ''}
        onChange={(e) => onChange(fieldKey, e.target.value)}
        readOnly={readOnly}
        placeholder={uiOptions?.placeholder || field.default || ''}
        className={`w-full px-3 py-2 text-sm border rounded-lg bg-white transition-colors
          focus:ring-2 focus:ring-primary-500 focus:border-primary-500
          ${readOnly ? 'bg-gray-50 text-gray-600 cursor-default' : ''}
          ${error ? 'border-safety-red' : 'border-gray-200'}
        `}
      />
    </div>
  )
}

function FormTextArea({ fieldKey, field, value, onChange, error, readOnly, required, uiOptions }) {
  const rows = uiOptions?.rows || 3
  return (
    <div className="space-y-1.5">
      <textarea
        id={fieldKey}
        value={value ?? ''}
        onChange={(e) => onChange(fieldKey, e.target.value)}
        readOnly={readOnly}
        placeholder={uiOptions?.placeholder || field.default || ''}
        rows={rows}
        className={`w-full px-3 py-2 text-sm border rounded-lg bg-white transition-colors resize-vertical
          focus:ring-2 focus:ring-primary-500 focus:border-primary-500
          ${readOnly ? 'bg-gray-50 text-gray-600 cursor-default' : ''}
          ${error ? 'border-safety-red' : 'border-gray-200'}
        `}
      />
    </div>
  )
}

function FormNumberField({ fieldKey, field, value, onChange, error, readOnly, required, uiOptions }) {
  return (
    <div className="space-y-1.5">
      <input
        type="number"
        id={fieldKey}
        value={value ?? ''}
        onChange={(e) => onChange(fieldKey, e.target.value === '' ? '' : Number(e.target.value))}
        readOnly={readOnly}
        placeholder={uiOptions?.placeholder || field.default || ''}
        min={field.minimum}
        max={field.maximum}
        step={field.multipleOf || 'any'}
        className={`w-full px-3 py-2 text-sm border rounded-lg bg-white transition-colors
          focus:ring-2 focus:ring-primary-500 focus:border-primary-500
          ${readOnly ? 'bg-gray-50 text-gray-600 cursor-default' : ''}
          ${error ? 'border-safety-red' : 'border-gray-200'}
        `}
      />
    </div>
  )
}

function FormSelect({ fieldKey, field, value, onChange, error, readOnly, required, uiOptions }) {
  const options = field.enum || []
  return (
    <div className="space-y-1.5">
      <div className="relative">
        <select
          id={fieldKey}
          value={value ?? ''}
          onChange={(e) => onChange(fieldKey, e.target.value)}
          disabled={readOnly}
          className={`w-full px-3 py-2 text-sm border rounded-lg bg-white transition-colors appearance-none
            focus:ring-2 focus:ring-primary-500 focus:border-primary-500
            ${readOnly ? 'bg-gray-50 text-gray-600 cursor-default' : ''}
            ${error ? 'border-safety-red' : 'border-gray-200'}
            ${!value ? 'text-gray-400' : 'text-gray-900'}
          `}
        >
          <option value="" disabled>
            {uiOptions?.placeholder || field.default || 'Select an option...'}
          </option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>
    </div>
  )
}

function FormMultiSelect({ fieldKey, field, value, onChange, error, readOnly, required, uiOptions }) {
  const options = field.items?.enum || []
  const selected = Array.isArray(value) ? value : []
  const items = field.items?.enum || []

  const handleToggle = (opt) => {
    if (readOnly) return
    const next = selected.includes(opt)
      ? selected.filter((v) => v !== opt)
      : [...selected, opt]
    onChange(fieldKey, next)
  }

  return (
    <div className="space-y-1.5">
      <div className={`space-y-2 p-3 border rounded-lg ${error ? 'border-safety-red' : 'border-gray-200'} ${readOnly ? 'bg-gray-50' : 'bg-white'}`}>
        {items.map((opt) => {
          const isChecked = selected.includes(opt)
          return (
            <label
              key={opt}
              className={`flex items-center gap-2.5 cursor-pointer ${readOnly ? 'cursor-default' : ''}`}
            >
              <div
                onClick={() => handleToggle(opt)}
                className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors
                  ${isChecked
                    ? 'bg-primary-600 border-primary-600'
                    : 'border-gray-300 hover:border-gray-400'
                  }
                  ${readOnly ? 'cursor-default' : ''}
                `}
              >
                {isChecked && <CheckSquare className="w-3 h-3 text-white" />}
              </div>
              <span className="text-sm text-gray-700">{opt}</span>
            </label>
          )
        })}
        {items.length === 0 && (
          <p className="text-xs text-gray-400 italic">No options available</p>
        )}
      </div>
    </div>
  )
}

function FormDateField({ fieldKey, field, value, onChange, error, readOnly, required, uiOptions }) {
  return (
    <div className="space-y-1.5">
      <div className="relative">
        <input
          type="date"
          id={fieldKey}
          value={value ?? ''}
          onChange={(e) => onChange(fieldKey, e.target.value)}
          readOnly={readOnly}
          className={`w-full px-3 py-2 text-sm border rounded-lg bg-white transition-colors
            focus:ring-2 focus:ring-primary-500 focus:border-primary-500
            ${readOnly ? 'bg-gray-50 text-gray-600 cursor-default' : ''}
            ${error ? 'border-safety-red' : 'border-gray-200'}
          `}
        />
        <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>
    </div>
  )
}

function FormCheckbox({ fieldKey, field, value, onChange, error, readOnly, required, uiOptions }) {
  const isChecked = value === true || value === 'true'
  return (
    <div className="space-y-1.5">
      <label className={`flex items-center gap-2.5 ${readOnly ? '' : 'cursor-pointer'}`}>
        <div
          onClick={() => {
            if (!readOnly) onChange(fieldKey, !isChecked)
          }}
          className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0
            ${isChecked
              ? 'bg-primary-600 border-primary-600'
              : 'border-gray-300 hover:border-gray-400'
            }
            ${readOnly ? 'cursor-default' : ''}
          `}
        >
          {isChecked && <CheckSquare className="w-3 h-3 text-white" />}
        </div>
        <span className="text-sm text-gray-700">{field.title || fieldKey}</span>
      </label>
    </div>
  )
}

function FormFileUpload({ fieldKey, field, value, onChange, error, readOnly, required, uiOptions }) {
  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        onChange(fieldKey, {
          name: file.name,
          size: file.size,
          type: file.type,
          data: event.target.result,
        })
      }
      reader.readAsDataURL(file)
    }
    e.target.value = ''
  }

  return (
    <div className="space-y-1.5">
      {readOnly ? (
        <div className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg bg-gray-50">
          <FileText className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600">{value?.name || 'File attached'}</span>
        </div>
      ) : (
        <label
          className={`flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-lg cursor-pointer
            hover:border-primary-400 hover:bg-primary-50/30 transition-colors
            ${error ? 'border-safety-red' : 'border-gray-300'}
          `}
        >
          <div className="flex flex-col items-center gap-1">
            <Upload className="w-5 h-5 text-gray-400" />
            <span className="text-xs text-gray-500 font-medium">
              {value?.name || 'Click to upload file'}
            </span>
            <span className="text-[10px] text-gray-400">PDF, JPG, PNG up to 10MB</span>
          </div>
          <input
            type="file"
            className="hidden"
            onChange={handleFileChange}
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          />
        </label>
      )}
    </div>
  )
}

function FormSignature({ fieldKey, field, value, onChange, error, readOnly, required, uiOptions }) {
  return (
    <div className="space-y-1.5">
      <div
        className={`flex items-center justify-center p-6 border-2 border-dashed rounded-lg
          ${readOnly ? 'bg-gray-50' : 'bg-white'}
          ${error ? 'border-safety-red' : 'border-gray-300'}
        `}
      >
        {value ? (
          <div className="text-center">
            {typeof value === 'string' && value.startsWith('data:image') ? (
              <img src={value} alt="Signature" className="max-h-20 mx-auto" />
            ) : (
              <span className="text-sm text-gray-600 italic font-handwriting">{value}</span>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <PenLine className="w-5 h-5 text-gray-400" />
            <span className="text-xs text-gray-400">
              {readOnly ? 'No signature' : 'Click to sign...'}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

function FormSection({ fieldKey, field }) {
  return (
    <div className="relative pt-6 pb-2">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-gray-200" />
        <h3 className="text-sm font-semibold text-gray-700 whitespace-nowrap">
          {field.title || fieldKey}
        </h3>
        <div className="h-px flex-1 bg-gray-200" />
      </div>
      {field.description && (
        <p className="text-xs text-gray-400 text-center mt-1">{field.description}</p>
      )}
    </div>
  )
}

function FormField({ fieldKey, field, uiFieldSchema, value, onChange, errors, readOnly, required }) {
  const fieldType = field.type || 'string'
  const uiWidget = uiFieldSchema?.['ui:widget']
  const uiOptions = uiFieldSchema?.['ui:options']
  const format = field.format
  const error = errors?.[fieldKey]
  const helpText = uiFieldSchema?.['ui:help'] || field.description

  const renderWidget = () => {
    // Check for ui:widget overrides first
    if (uiWidget === 'textarea' || (fieldType === 'string' && format === 'textarea')) {
      return (
        <FormTextArea
          fieldKey={fieldKey}
          field={field}
          value={value}
          onChange={onChange}
          error={error}
          readOnly={readOnly}
          required={required}
          uiOptions={uiOptions}
        />
      )
    }

    if (uiWidget === 'file') {
      return (
        <FormFileUpload
          fieldKey={fieldKey}
          field={field}
          value={value}
          onChange={onChange}
          error={error}
          readOnly={readOnly}
          required={required}
          uiOptions={uiOptions}
        />
      )
    }

    if (uiWidget === 'signature') {
      return (
        <FormSignature
          fieldKey={fieldKey}
          field={field}
          value={value}
          onChange={onChange}
          error={error}
          readOnly={readOnly}
          required={required}
          uiOptions={uiOptions}
        />
      )
    }

    if (uiWidget === 'heading' || fieldType === 'section' || uiWidget === 'section') {
      return <FormSection fieldKey={fieldKey} field={field} />
    }

    // Type-based rendering
    switch (fieldType) {
      case 'string':
        if (field.enum) {
          return (
            <FormSelect
              fieldKey={fieldKey}
              field={field}
              value={value}
              onChange={onChange}
              error={error}
              readOnly={readOnly}
              required={required}
              uiOptions={uiOptions}
            />
          )
        }
        if (format === 'date' || uiWidget === 'date') {
          return (
            <FormDateField
              fieldKey={fieldKey}
              field={field}
              value={value}
              onChange={onChange}
              error={error}
              readOnly={readOnly}
              required={required}
              uiOptions={uiOptions}
            />
          )
        }
        return (
          <FormTextField
            fieldKey={fieldKey}
            field={field}
            value={value}
            onChange={onChange}
            error={error}
            readOnly={readOnly}
            required={required}
            uiOptions={uiOptions}
          />
        )

      case 'number':
      case 'integer':
        return (
          <FormNumberField
            fieldKey={fieldKey}
            field={field}
            value={value}
            onChange={onChange}
            error={error}
            readOnly={readOnly}
            required={required}
            uiOptions={uiOptions}
          />
        )

      case 'boolean':
        return (
          <FormCheckbox
            fieldKey={fieldKey}
            field={field}
            value={value}
            onChange={onChange}
            error={error}
            readOnly={readOnly}
            required={required}
            uiOptions={uiOptions}
          />
        )

      case 'array':
        if (uiWidget === 'checkboxes' || field.items?.enum) {
          return (
            <FormMultiSelect
              fieldKey={fieldKey}
              field={field}
              value={value}
              onChange={onChange}
              error={error}
              readOnly={readOnly}
              required={required}
              uiOptions={uiOptions}
            />
          )
        }
        return (
          <FormTextField
            fieldKey={fieldKey}
            field={field}
            value={Array.isArray(value) ? value.join(', ') : value}
            onChange={(k, v) => onChange(k, v.split(',').map((s) => s.trim()))}
            error={error}
            readOnly={readOnly}
            required={required}
            uiOptions={uiOptions}
          />
        )

      default:
        return (
          <FormTextField
            fieldKey={fieldKey}
            field={field}
            value={value}
            onChange={onChange}
            error={error}
            readOnly={readOnly}
            required={required}
            uiOptions={uiOptions}
          />
        )
    }
  }

  // Don't render section labels as regular fields
  if (uiWidget === 'heading' || fieldType === 'section' || uiWidget === 'section') {
    return renderWidget()
  }

  return (
    <div className="space-y-1">
      {/* Label */}
      <label
        htmlFor={fieldKey}
        className="flex items-center gap-1 text-sm font-medium text-gray-700"
      >
        {field.title || fieldKey}
        {required && <Asterisk className="w-3 h-3 text-safety-red flex-shrink-0" />}
      </label>

      {/* Field widget */}
      {renderWidget()}

      {/* Help text */}
      {helpText && !error && (
        <div className="flex items-center gap-1 mt-0.5">
          <HelpCircle className="w-3 h-3 text-gray-400 flex-shrink-0" />
          <p className="text-[11px] text-gray-400">{helpText}</p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="text-xs text-safety-red mt-0.5">{error}</p>
      )}
    </div>
  )
}

function evaluateCondition(condition, data) {
  // Basic if/then/else support
  if (!condition || !data) return true
  const { properties, required } = condition
  if (!properties) return true

  for (const [key, schema] of Object.entries(properties)) {
    const val = data[key]
    if (schema.const !== undefined && val !== schema.const) return false
    if (schema.enum && !schema.enum.includes(val)) return false
    if (schema.minimum !== undefined && (val === undefined || val < schema.minimum)) return false
    if (schema.maximum !== undefined && (val === undefined || val > schema.maximum)) return false
  }

  return true
}

export default function DynamicForm({
  schema,
  uiSchema = {},
  data = {},
  onChange,
  readOnly = false,
  errors = {},
}) {
  const handleChange = useCallback(
    (fieldKey, value) => {
      if (onChange) {
        onChange({ ...data, [fieldKey]: value })
      }
    },
    [data, onChange]
  )

  if (!schema || !schema.properties) {
    return (
      <div className="flex items-center justify-center p-8 text-center">
        <div className="text-gray-400">
          <FileText className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm">No form schema defined</p>
        </div>
      </div>
    )
  }

  const { properties, required = [], if: ifCondition, then: thenSchema, else: elseSchema } = schema

  // Determine which fields are visible based on if/then/else
  let visibleFields = Object.keys(properties)
  let fieldOverrides = {}

  if (ifCondition && thenSchema) {
    const conditionMet = evaluateCondition(ifCondition, data)
    const activeSchema = conditionMet ? thenSchema : elseSchema

    if (activeSchema) {
      if (activeSchema.required) {
        // Fields listed in then.required are only visible when condition met
        // Fields not in then.required are hidden when condition met
        if (conditionMet) {
          // For simple case, just use then schema properties
          if (activeSchema.properties) {
            visibleFields = Object.keys(activeSchema.properties)
            fieldOverrides = activeSchema.properties
          }
        } else if (elseSchema?.properties) {
          visibleFields = Object.keys(elseSchema.properties)
          fieldOverrides = elseSchema.properties
        }
      }
    }
  }

  const isRequired = (key) => Array.isArray(required) && required.includes(key)

  return (
    <div className="space-y-5">
      {Object.entries(properties).map(([fieldKey, field]) => {
        // Apply any overrides from if/then/else
        const resolvedField = fieldOverrides[fieldKey] || field
        const uiFieldSchema = uiSchema[fieldKey] || {}

        return (
          <FormField
            key={fieldKey}
            fieldKey={fieldKey}
            field={resolvedField}
            uiFieldSchema={uiFieldSchema}
            value={data[fieldKey]}
            onChange={handleChange}
            errors={errors}
            readOnly={readOnly}
            required={isRequired(fieldKey)}
          />
        )
      })}
    </div>
  )
}
