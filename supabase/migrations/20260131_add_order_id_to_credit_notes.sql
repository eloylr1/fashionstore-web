-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN: Agregar order_id a credit_notes
-- Permite crear notas de crédito directamente desde cancelaciones de pedido
-- ═══════════════════════════════════════════════════════════════════════════

-- Agregar columna order_id si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'credit_notes' 
    AND column_name = 'order_id'
  ) THEN
    ALTER TABLE public.credit_notes 
    ADD COLUMN order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS idx_credit_notes_order ON public.credit_notes(order_id);
    
    RAISE NOTICE 'Columna order_id agregada a credit_notes';
  ELSE
    RAISE NOTICE 'Columna order_id ya existe en credit_notes';
  END IF;
END $$;

-- Hacer original_invoice_id opcional para cancelaciones sin factura
-- (En caso de cancelaciones antes de generar factura, aunque no debería pasar)
ALTER TABLE public.credit_notes 
ALTER COLUMN original_invoice_id DROP NOT NULL;

-- Actualizar la política RLS para permitir ver notas de crédito por order_id
DROP POLICY IF EXISTS "Users can view their own credit notes" ON public.credit_notes;
CREATE POLICY "Users can view their own credit notes" ON public.credit_notes
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own credit notes" ON public.credit_notes;
CREATE POLICY "Admins can insert credit notes" ON public.credit_notes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
    OR auth.uid() = user_id
  );

-- Comentario de la tabla
COMMENT ON TABLE public.credit_notes IS 'Notas de crédito (facturas de abono) para cancelaciones y devoluciones';
COMMENT ON COLUMN public.credit_notes.order_id IS 'Referencia al pedido cancelado (opcional si es por devolución)';
COMMENT ON COLUMN public.credit_notes.original_invoice_id IS 'Factura original que se rectifica (opcional para cancelaciones sin factura)';
