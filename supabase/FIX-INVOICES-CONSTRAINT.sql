-- ═══════════════════════════════════════════════════════════════════════════
-- FIX: Asegurar que user_id sea nullable en invoices
-- Ejecutar en Supabase SQL Editor si las facturas no se crean
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Verificar si la constraint existe (esto no fallará si ya es nullable)
ALTER TABLE public.invoices 
ALTER COLUMN user_id DROP NOT NULL;

-- 2. Agregar columna guest_email si no existe
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS guest_email TEXT;

-- 3. Verificar facturas existentes sin user_id
SELECT 
  id,
  invoice_number,
  customer_email,
  user_id,
  created_at
FROM public.invoices 
WHERE user_id IS NULL
ORDER BY created_at DESC
LIMIT 10;

-- 4. Si hay pedidos sin factura, este query los muestra:
SELECT 
  o.id AS order_id,
  o.order_number,
  o.status,
  o.total,
  o.guest_email,
  o.user_id,
  o.created_at,
  i.id AS invoice_id
FROM public.orders o
LEFT JOIN public.invoices i ON i.order_id = o.id
WHERE i.id IS NULL
  AND o.status IN ('paid', 'processing', 'shipped', 'delivered')
ORDER BY o.created_at DESC
LIMIT 20;

-- 5. Crear facturas faltantes para pedidos pagados (ejecutar manualmente si hay resultados arriba)
-- NOTA: Revisa el resultado del query anterior antes de descomentar esto
/*
INSERT INTO public.invoices (
  order_id,
  user_id,
  invoice_number,
  customer_name,
  customer_email,
  customer_address,
  subtotal,
  tax_rate,
  tax_amount,
  total,
  status,
  payment_method,
  items
)
SELECT 
  o.id,
  o.user_id,
  'FM-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD((ROW_NUMBER() OVER(ORDER BY o.created_at) + (SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 'FM-[0-9]{4}-([0-9]+)') AS INTEGER)), 0) FROM public.invoices WHERE invoice_number LIKE 'FM-' || TO_CHAR(NOW(), 'YYYY') || '-%'))::TEXT, 6, '0'),
  COALESCE(o.shipping_name, 'Cliente'),
  COALESCE(o.guest_email, (SELECT email FROM auth.users WHERE id = o.user_id)),
  jsonb_build_object(
    'full_name', o.shipping_name,
    'address_line1', o.shipping_address_line1,
    'city', o.shipping_city,
    'postal_code', o.shipping_postal_code,
    'country', COALESCE(o.shipping_country, 'España')
  ),
  o.subtotal,
  21,
  ROUND(o.total * 21 / 121),
  o.total,
  'paid',
  o.payment_method,
  (
    SELECT jsonb_agg(jsonb_build_object(
      'name', oi.product_name,
      'quantity', oi.quantity,
      'unit_price', oi.price,
      'total', oi.price * oi.quantity,
      'size', oi.size
    ))
    FROM public.order_items oi 
    WHERE oi.order_id = o.id
  )
FROM public.orders o
LEFT JOIN public.invoices i ON i.order_id = o.id
WHERE i.id IS NULL
  AND o.status IN ('paid', 'processing', 'shipped', 'delivered')
  AND o.total > 0;
*/
