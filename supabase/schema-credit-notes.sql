-- ═══════════════════════════════════════════════════════════════════════════
-- FASHIONMARKET - Esquema de Notas de Crédito (Facturas de Abono)
-- Ejecutar en Supabase SQL Editor DESPUÉS de tener la tabla 'returns'
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLA: credit_notes - Facturas de abono (notas de crédito)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.credit_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  credit_note_number VARCHAR(50) UNIQUE NOT NULL, -- CN-2026-000001
  original_invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE RESTRICT,
  return_id UUID REFERENCES public.returns(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Datos del cliente (copiados de factura original)
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_nif VARCHAR(20),
  customer_address JSONB,
  -- Datos de la empresa
  company_name VARCHAR(255) DEFAULT 'FashionMarket S.L.',
  company_nif VARCHAR(20) DEFAULT 'B12345678',
  company_address TEXT DEFAULT 'Calle Principal 123, 28001 Madrid, España',
  -- Importes NEGATIVOS (en céntimos)
  subtotal INTEGER NOT NULL, -- Negativo
  tax_rate INTEGER DEFAULT 21,
  tax_amount INTEGER NOT NULL, -- Negativo
  total INTEGER NOT NULL, -- Negativo
  -- Estado y método de reembolso
  status VARCHAR(20) DEFAULT 'pending', -- pending, refunded, cancelled
  refund_method VARCHAR(50) NOT NULL, -- 'stripe', 'bank_transfer', 'store_credit'
  stripe_refund_id VARCHAR(255),
  -- Motivo
  reason TEXT NOT NULL,
  -- Fechas
  issue_date TIMESTAMPTZ DEFAULT NOW(),
  refunded_date TIMESTAMPTZ,
  -- Items devueltos
  items JSONB NOT NULL, -- Array de items devueltos con cantidades
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_credit_notes_invoice ON public.credit_notes(original_invoice_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_user ON public.credit_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_return ON public.credit_notes(return_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_number ON public.credit_notes(credit_note_number);
CREATE INDEX IF NOT EXISTS idx_credit_notes_status ON public.credit_notes(status);

-- Trigger updated_at (usa función existente o crea una nueva)
CREATE OR REPLACE FUNCTION update_credit_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_credit_notes_updated_at ON public.credit_notes;
CREATE TRIGGER set_credit_notes_updated_at
  BEFORE UPDATE ON public.credit_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_credit_notes_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- FUNCIÓN: Generar número de nota de crédito
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION generate_credit_note_number()
RETURNS VARCHAR(50) AS $$
DECLARE
  year_part VARCHAR(4);
  seq_num INTEGER;
  new_cn_number VARCHAR(50);
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(credit_note_number FROM 'CN-[0-9]{4}-([0-9]+)') AS INTEGER)), 0) + 1
  INTO seq_num
  FROM public.credit_notes
  WHERE credit_note_number LIKE 'CN-' || year_part || '-%';
  
  new_cn_number := 'CN-' || year_part || '-' || LPAD(seq_num::TEXT, 6, '0');
  
  RETURN new_cn_number;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────────────────────
-- RPC: Procesar devolución con factura de abono
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION process_return_with_credit_note(
  p_return_id UUID,
  p_refund_method VARCHAR DEFAULT 'stripe',
  p_stripe_refund_id VARCHAR DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  credit_note_number VARCHAR,
  refund_amount INTEGER
) AS $$
DECLARE
  v_return RECORD;
  v_invoice RECORD;
  v_order RECORD;
  v_credit_note_number VARCHAR(50);
  v_subtotal INTEGER;
  v_tax_amount INTEGER;
  v_total INTEGER;
  v_items JSONB;
BEGIN
  -- Obtener datos de la devolución
  SELECT r.*, o.order_number
  INTO v_return
  FROM public.returns r
  JOIN public.orders o ON o.id = r.order_id
  WHERE r.id = p_return_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Devolución no encontrada'::TEXT, NULL::VARCHAR, NULL::INTEGER;
    RETURN;
  END IF;
  
  -- Verificar que la devolución esté aprobada
  IF v_return.status NOT IN ('approved', 'received') THEN
    RETURN QUERY SELECT false, 'La devolución debe estar aprobada o recibida'::TEXT, NULL::VARCHAR, NULL::INTEGER;
    RETURN;
  END IF;
  
  -- Obtener la factura original del pedido
  SELECT * INTO v_invoice
  FROM public.invoices
  WHERE order_id = v_return.order_id
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Factura original no encontrada'::TEXT, NULL::VARCHAR, NULL::INTEGER;
    RETURN;
  END IF;
  
  -- Calcular importes (negativos para la nota de crédito)
  v_subtotal := -ABS(COALESCE(v_return.refund_amount, 0));
  v_tax_amount := ROUND(v_subtotal * v_invoice.tax_rate / 100);
  v_total := v_subtotal + v_tax_amount;
  
  -- Obtener items devueltos
  SELECT jsonb_agg(jsonb_build_object(
    'name', oi.product_name,
    'quantity', ri.quantity,
    'size', oi.size,
    'unit_price', -ABS(oi.unit_price),
    'total', -ABS(oi.unit_price * ri.quantity)
  ))
  INTO v_items
  FROM public.return_items ri
  JOIN public.order_items oi ON oi.id = ri.order_item_id
  WHERE ri.return_id = p_return_id;
  
  IF v_items IS NULL THEN
    v_items := '[]'::JSONB;
  END IF;
  
  -- Generar número de nota de crédito
  v_credit_note_number := generate_credit_note_number();
  
  -- Crear la nota de crédito
  INSERT INTO public.credit_notes (
    credit_note_number,
    original_invoice_id,
    return_id,
    user_id,
    customer_name,
    customer_email,
    customer_nif,
    customer_address,
    subtotal,
    tax_rate,
    tax_amount,
    total,
    status,
    refund_method,
    stripe_refund_id,
    reason,
    items,
    refunded_date
  ) VALUES (
    v_credit_note_number,
    v_invoice.id,
    p_return_id,
    v_return.user_id,
    v_invoice.customer_name,
    v_invoice.customer_email,
    v_invoice.customer_nif,
    v_invoice.customer_address,
    v_subtotal,
    v_invoice.tax_rate,
    v_tax_amount,
    v_total,
    CASE WHEN p_stripe_refund_id IS NOT NULL THEN 'refunded' ELSE 'pending' END,
    p_refund_method,
    p_stripe_refund_id,
    'Devolución ' || v_return.return_number || ': ' || COALESCE(v_return.reason, 'Sin especificar'),
    v_items,
    CASE WHEN p_stripe_refund_id IS NOT NULL THEN NOW() ELSE NULL END
  );
  
  -- Actualizar estado de la devolución
  UPDATE public.returns
  SET status = 'refunded',
      completed_at = NOW()
  WHERE id = p_return_id;
  
  -- Actualizar estado del pedido si corresponde
  UPDATE public.orders
  SET status = 'refunded'
  WHERE id = v_return.order_id;
  
  RETURN QUERY SELECT 
    true, 
    'Nota de crédito generada correctamente'::TEXT, 
    v_credit_note_number,
    ABS(v_total);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════
-- RLS Policies para credit_notes
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.credit_notes ENABLE ROW LEVEL SECURITY;

-- Los usuarios solo pueden ver sus propias notas de crédito
CREATE POLICY "Users can view their own credit notes" ON public.credit_notes
  FOR SELECT USING (auth.uid() = user_id);

-- Solo admins pueden insertar notas de crédito (vía función SECURITY DEFINER)
-- Las inserciones se hacen a través de process_return_with_credit_note

-- Permisos
GRANT EXECUTE ON FUNCTION generate_credit_note_number() TO authenticated;
GRANT EXECUTE ON FUNCTION process_return_with_credit_note(UUID, VARCHAR, VARCHAR) TO authenticated;
