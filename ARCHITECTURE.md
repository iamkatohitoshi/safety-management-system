# Safety Management System - Architecture Plan

## Goal
Build a multi-tenant safety management platform where all modules are form-based,
with a dynamic form builder and configurable approval workflow engine.

## Architecture

```
Frontend (Vite + React + Tailwind)  -->  Vercel Static
API (Vercel Serverless Functions)   -->  Neon PostgreSQL
```

### Multi-Tenant
- Every table has `tenant_id`
- JWT contains `tenant_id` in claims
- Middleware enforces tenant isolation on every request

### Form Builder
- JSON Schema output stored in `form_definitions.schema_jsonb`
- Field types: text, number, textarea, select, multiselect, date, file, checkbox, signature, section
- Dynamic form renderer reads schema_jsonb at runtime, renders form UI

### Approval Workflow Engine
- Configurable multi-step approval flows in `workflow_definitions.steps_jsonb`
- Steps: role-based assignment, sequential/parallel, conditions
- States: draft -> submitted -> in_review -> approved/rejected/revision_requested
- Full audit trail in `approval_actions`

### Module System (all form-based)
- Toolbox Meeting = category "toolbox"
- Permit-to-Work = category "ptw"
- Safety Inspection = category "inspection"
- Equipment Inspection = category "equipment"
- Safety Action = category "action"

## Database (Neon PostgreSQL)
- full schema in api/src/db/schema.sql
- Migrations via api/src/db/migrate.js

## Tech Stack
- Frontend: React 18 + Vite + Tailwind CSS + react-router + axios
- Backend: Vercel Serverless Functions (Node.js/TypeScript)
- Database: Neon PostgreSQL (serverless, pg + @neondatabase/serverless)
- Auth: JWT (bcryptjs + jsonwebtoken)
