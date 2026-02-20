-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: Update credit note number prefix to FR (Factura Rectificativa)
-- ═══════════════════════════════════════════════════════════════════════════

-- Actualizar la función de generación de números de factura rectificativa
-- Nuevo formato: FR-YYYY-LNNNNN (ej: FR-2026-A00001)
CREATE OR REPLACE FUNCTION generate_credit_note_number()
RETURNS VARCHAR(50) AS $$
DECLARE
  year_part VARCHAR(4);
  seq_num INTEGER;
  letter_char CHAR(1);
  digit_part INTEGER;
  new_cn_number VARCHAR(50);
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');
  
  -- Buscar tanto el prefijo antiguo (CN-, NC-) como el nuevo (FR-) con formato letra+digitos
  SELECT COALESCE(
    GREATEST(
      (SELECT COALESCE(MAX(
        (ASCII(SUBSTRING(credit_note_number FROM 'CN-[0-9]{4}-([A-Z])')) - 65) * 99999 +
        CAST(SUBSTRING(credit_note_number FROM 'CN-[0-9]{4}-[A-Z]([0-9]+)') AS INTEGER)
      ), 0) FROM public.credit_notes WHERE credit_note_number ~ ('^CN-' || year_part || '-[A-Z][0-9]+')),
      (SELECT COALESCE(MAX(
        (ASCII(SUBSTRING(credit_note_number FROM 'NC-[0-9]{4}-([A-Z])')) - 65) * 99999 +
        CAST(SUBSTRING(credit_note_number FROM 'NC-[0-9]{4}-[A-Z]([0-9]+)') AS INTEGER)
      ), 0) FROM public.credit_notes WHERE credit_note_number ~ ('^NC-' || year_part || '-[A-Z][0-9]+')),
      (SELECT COALESCE(MAX(
        (ASCII(SUBSTRING(credit_note_number FROM 'FR-[0-9]{4}-([A-Z])')) - 65) * 99999 +
        CAST(SUBSTRING(credit_note_number FROM 'FR-[0-9]{4}-[A-Z]([0-9]+)') AS INTEGER)
      ), 0) FROM public.credit_notes WHERE credit_note_number ~ ('^FR-' || year_part || '-[A-Z][0-9]+')),
      -- Compatibilidad con formato antiguo solo dígitos
      (SELECT COALESCE(MAX(CAST(SUBSTRING(credit_note_number FROM '[A-Z]{2}-[0-9]{4}-([0-9]+)') AS INTEGER)), 0)
       FROM public.credit_notes
       WHERE credit_note_number LIKE '%-' || year_part || '-%' AND credit_note_number !~ '-[A-Z][0-9]+$')
    ),
    0
  ) + 1 INTO seq_num;
  
  letter_char := CHR(65 + ((seq_num - 1) / 99999));
  digit_part := ((seq_num - 1) % 99999) + 1;
  new_cn_number := 'FR-' || year_part || '-' || letter_char || LPAD(digit_part::TEXT, 5, '0');
  
  RETURN new_cn_number;
END;
$$ LANGUAGE plpgsql;
