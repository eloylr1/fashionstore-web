/**
 * ═══════════════════════════════════════════════════════════════════════════
 * API: Descargar Factura en PDF
 * Genera un PDF real de la factura para descarga
 * ═══════════════════════════════════════════════════════════════════════════
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { generateInvoicePDFFromDB } from '../../../../lib/pdf/invoiceGenerator';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

export const GET: APIRoute = async ({ params, cookies }) => {
  try {
    const invoiceId = params.id;

    if (!invoiceId) {
      return new Response('ID de factura requerido', { status: 400 });
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response('Configuración del servidor incompleta', { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verificar autenticación
    const accessToken = cookies.get('sb-access-token')?.value;
    if (!accessToken) {
      return new Response('No autenticado', { status: 401 });
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    if (userError || !user) {
      return new Response('Usuario no válido', { status: 401 });
    }

    // Obtener factura
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      return new Response('Factura no encontrada', { status: 404 });
    }

    // Verificar que la factura pertenece al usuario (o es admin)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (invoice.user_id !== user.id && profile?.role !== 'admin') {
      return new Response('No autorizado', { status: 403 });
    }

    // Generar PDF
    const result = await generateInvoicePDFFromDB(supabase, invoiceId);
    
    if (!result) {
      return new Response('Error al generar el PDF', { status: 500 });
    }

    // Convertir Buffer a Uint8Array para Response
    const pdfData = new Uint8Array(result.pdf);

    // Devolver PDF
    return new Response(pdfData, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'Content-Length': pdfData.length.toString(),
      },
    });

  } catch (error: any) {
    console.error('Error generating invoice PDF:', error);
    return new Response('Error al generar el PDF', { status: 500 });
  }
};
