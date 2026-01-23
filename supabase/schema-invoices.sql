-- ═══════════════════════════════════════════════════════════════════════════
-- FASHIONMARKET - Esquema de Facturas
-- Ejecutar en Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLA: invoices - Facturas de compras
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  -- Datos fiscales del cliente
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_nif VARCHAR(20),
  customer_address JSONB,
  -- Datos de la empresa
  company_name VARCHAR(255) DEFAULT 'FashionMarket S.L.',
  company_nif VARCHAR(20) DEFAULT 'B12345678',
  company_address TEXT DEFAULT 'Calle Principal 123, 28001 Madrid, España',
  -- Importes (en céntimos)
  subtotal INTEGER NOT NULL,
  tax_rate INTEGER DEFAULT 21, -- IVA 21%
  tax_amount INTEGER NOT NULL,
  total INTEGER NOT NULL,
  -- Estado
  status VARCHAR(20) DEFAULT 'issued', -- issued, paid, cancelled
  payment_method VARCHAR(50),
  stripe_payment_intent_id VARCHAR(255),
  -- Fechas
  issue_date TIMESTAMPTZ DEFAULT NOW(),
  due_date TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  paid_date TIMESTAMPTZ,
  -- Metadata
  items JSONB NOT NULL, -- Array de items de la factura
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_invoices_order ON public.invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON public.invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);

-- Deshabilitar RLS (la seguridad se maneja en el código)
ALTER TABLE public.invoices DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- FUNCIÓN: Generar número de factura secuencial
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS VARCHAR(50) AS $$
DECLARE
  year_part VARCHAR(4);
  seq_num INTEGER;
  new_invoice_number VARCHAR(50);
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');
  
  -- Obtener el siguiente número secuencial para este año
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 'FM-[0-9]{4}-([0-9]+)') AS INTEGER)), 0) + 1
  INTO seq_num
  FROM public.invoices
  WHERE invoice_number LIKE 'FM-' || year_part || '-%';
  
  new_invoice_number := 'FM-' || year_part || '-' || LPAD(seq_num::TEXT, 6, '0');
  
  RETURN new_invoice_number;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────────────────────
-- TRIGGER: Actualizar updated_at
-- ─────────────────────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS update_invoices_updated_at ON public.invoices;
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ─────────────────────────────────────────────────────────────────────────────
-- Actualizar tabla orders para agregar campos de pago
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS discount_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS discount_amount INTEGER DEFAULT 0;
