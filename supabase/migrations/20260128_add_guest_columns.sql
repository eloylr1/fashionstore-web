-- Migration: Agregar columnas para pedidos de invitados
-- Fecha: 2026-01-28

-- Agregar columnas guest_email y guest_name a la tabla orders
-- Estas columnas permiten que los invitados (no registrados) puedan realizar pedidos

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS guest_email TEXT,
ADD COLUMN IF NOT EXISTS guest_name TEXT;

-- Hacer user_id opcional (nullable) para permitir pedidos de invitados
ALTER TABLE orders 
ALTER COLUMN user_id DROP NOT NULL;

-- Agregar índice para buscar pedidos por email de invitado
CREATE INDEX IF NOT EXISTS idx_orders_guest_email ON orders(guest_email) WHERE guest_email IS NOT NULL;

-- También hacer user_id opcional en invoices para invitados
ALTER TABLE invoices 
ALTER COLUMN user_id DROP NOT NULL;

-- Agregar índice para facturas de invitados
CREATE INDEX IF NOT EXISTS idx_invoices_customer_email ON invoices(customer_email);

-- También hacer user_id opcional en discount_code_redemptions para invitados
ALTER TABLE discount_code_redemptions 
ALTER COLUMN user_id DROP NOT NULL;

COMMENT ON COLUMN orders.guest_email IS 'Email del cliente cuando compra como invitado';
COMMENT ON COLUMN orders.guest_name IS 'Nombre del cliente cuando compra como invitado';
