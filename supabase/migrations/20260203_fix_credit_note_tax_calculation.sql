-- ═══════════════════════════════════════════════════════════════════════════
-- FIX: Corregir cálculo de IVA en notas de crédito
-- El refund_amount ya incluye IVA, hay que extraerlo, no sumarlo
-- ═══════════════════════════════════════════════════════════════════════════

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
  
  -- CORREGIDO: refund_amount ya incluye IVA, extraer el desglose
  -- total = refund_amount (IVA incluido)
  -- subtotal = total * 100 / (100 + tax_rate)
  -- tax_amount = total - subtotal
  v_total := -ABS(COALESCE(v_return.refund_amount, 0));
  v_subtotal := ROUND(v_total::NUMERIC * 100 / (100 + COALESCE(v_invoice.tax_rate, 21)));
  v_tax_amount := v_total - v_subtotal;
  
  -- Obtener items devueltos con precios positivos para unit_price visual
  SELECT jsonb_agg(jsonb_build_object(
    'name', oi.product_name,
    'quantity', ri.quantity,
    'size', oi.size,
    'color', oi.color,
    'unit_price', ABS(oi.unit_price),
    'total', ABS(oi.unit_price * ri.quantity)
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
