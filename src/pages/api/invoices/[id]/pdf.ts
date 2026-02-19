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

    // Obtener factura - primero por ID directo, luego por order_id
    let invoice: any = null;
    let invoiceError: any = null;

    const { data: invoiceById, error: errById } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (invoiceById) {
      invoice = invoiceById;
    } else {
      // Fallback: buscar por order_id (cuando se pasa el ID del pedido)
      const { data: invoiceByOrder, error: errByOrder } = await supabase
        .from('invoices')
        .select('*')
        .eq('order_id', invoiceId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (invoiceByOrder) {
        invoice = invoiceByOrder;
      } else {
        invoiceError = errById || errByOrder;
      }
    }

    if (!invoice) {
      return new Response('Factura no encontrada', { status: 404 });
    }

    // Usar el ID real de la factura para generar el PDF
    const realInvoiceId = invoice.id;

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
    const result = await generateInvoicePDFFromDB(supabase, realInvoiceId);
    
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
