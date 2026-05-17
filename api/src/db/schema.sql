-- Safety Management System - PostgreSQL Schema
-- Compatible with Neon PostgreSQL (serverless)

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TENANTS
-- ============================================================
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    config JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'worker' CHECK (role IN ('admin', 'supervisor', 'worker')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, email)
);

-- ============================================================
-- FORM DEFINITIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS form_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    schema_jsonb JSONB NOT NULL DEFAULT '{}',
    ui_schema_jsonb JSONB DEFAULT '{}',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
    version INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, slug)
);

-- ============================================================
-- WORKFLOW DEFINITIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS workflow_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    form_definition_id UUID REFERENCES form_definitions(id) ON DELETE SET NULL,
    steps_jsonb JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Note: steps_jsonb format: [{step_order:int, name:string, assignee_role:string, type:'sequential'|'parallel', conditions:object, next_on_approve:int|null, next_on_reject:int|null, next_on_revision:int|null}]

-- ============================================================
-- FORM SUBMISSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS form_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    form_definition_id UUID NOT NULL REFERENCES form_definitions(id) ON DELETE CASCADE,
    workflow_definition_id UUID REFERENCES workflow_definitions(id) ON DELETE SET NULL,
    data_jsonb JSONB NOT NULL DEFAULT '{}',
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'in_review', 'approved', 'rejected', 'revision_requested')),
    current_step INT DEFAULT 0,
    submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- APPROVAL ACTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS approval_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    submission_id UUID NOT NULL REFERENCES form_submissions(id) ON DELETE CASCADE,
    step_order INT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('approve', 'reject', 'request_revision')),
    comment TEXT,
    actioned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- EQUIPMENT
-- ============================================================
CREATE TABLE IF NOT EXISTS equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    serial_number TEXT,
    cert_expiry_date DATE,
    status TEXT DEFAULT 'active',
    form_data_jsonb JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_submissions_tenant_status ON form_submissions(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_users_tenant_email ON users(tenant_id, email);
CREATE INDEX IF NOT EXISTS idx_form_definitions_tenant_slug ON form_definitions(tenant_id, slug);
CREATE INDEX IF NOT EXISTS idx_form_definitions_tenant_status ON form_definitions(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_workflow_definitions_tenant ON workflow_definitions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_approval_actions_submission ON approval_actions(submission_id);
CREATE INDEX IF NOT EXISTS idx_equipment_tenant ON equipment(tenant_id);
