-- Safety Management System - Seed Data
-- NOTE: Passwords below use placeholders. Real passwords are set via the migration script
-- or a dedicated password-setup script using bcrypt.

-- ============================================================
-- TENANTS
-- ============================================================
INSERT INTO tenants (name, slug, config)
VALUES
    ('Demo Construction Co', 'demo', '{"timezone": "America/New_York", "locale": "en-US"}'),
    ('Demo Manufacturing Inc', 'demo2', '{"timezone": "America/Chicago", "locale": "en-US"}')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- USERS (Demo Construction Co - slug: 'demo')
-- ============================================================
-- Password note: '$2a$10$placeholder...' is a bcrypt placeholder.
-- Actual password hashes should be generated with bcrypt and updated via the migration script
-- or a dedicated admin user creation script.
INSERT INTO users (tenant_id, email, name, password_hash, role)
SELECT
    t.id,
    u.email,
    u.name,
    u.password_hash,
    u.role
FROM (VALUES
    ('admin@demo.com',       'Alice Admin',      '$2a$10$placeholder_hash_for_admin_demo',      'admin'),
    ('supervisor@demo.com',  'Bob Supervisor',   '$2a$10$placeholder_hash_for_supervisor_demo',  'supervisor'),
    ('worker@demo.com',      'Charlie Worker',   '$2a$10$placeholder_hash_for_worker_demo',      'worker')
) AS u(email, name, password_hash, role)
CROSS JOIN tenants t
WHERE t.slug = 'demo'
ON CONFLICT (tenant_id, email) DO NOTHING;

-- ============================================================
-- USERS (Demo Manufacturing Inc - slug: 'demo2')
-- ============================================================
INSERT INTO users (tenant_id, email, name, password_hash, role)
SELECT
    t.id,
    u.email,
    u.name,
    u.password_hash,
    u.role
FROM (VALUES
    ('admin@demo2.com',       'Diana Admin',       '$2a$10$placeholder_hash_for_admin_demo2',      'admin'),
    ('supervisor@demo2.com',  'Eve Supervisor',    '$2a$10$placeholder_hash_for_supervisor_demo2',  'supervisor'),
    ('worker@demo2.com',      'Frank Worker',      '$2a$10$placeholder_hash_for_worker_demo2',      'worker')
) AS u(email, name, password_hash, role)
CROSS JOIN tenants t
WHERE t.slug = 'demo2'
ON CONFLICT (tenant_id, email) DO NOTHING;
