/**
 * ═══════════════════════════════════════════════════════════════════════════
 * API: Descargar Nota de Crédito en PDF
 * Genera un PDF real de la nota de crédito para descarga
 * ═══════════════════════════════════════════════════════════════════════════
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { generateCreditNotePDFFromDB } from '../../../../lib/pdf/invoiceGenerator';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

export const GET: APIRoute = async ({ params, cookies }) => {
  try {
    const creditNoteId = params.id;

    if (!creditNoteId) {
      return new Response('ID de nota de crédito requerido', { status: 400 });
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

    // Obtener nota de crédito
    const { data: creditNote, error: cnError } = await supabase
      .from('credit_notes')
      .select('*')
      .eq('id', creditNoteId)
      .single();

    if (cnError || !creditNote) {
      return new Response('Nota de crédito no encontrada', { status: 404 });
    }

    // Verificar que pertenece al usuario (o es admin)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (creditNote.user_id !== user.id && profile?.role !== 'admin') {
      return new Response('No autorizado', { status: 403 });
    }

    // Generar PDF
    const result = await generateCreditNotePDFFromDB(supabase, creditNoteId);
    
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
    console.error('Error generating credit note PDF:', error);
    return new Response('Error al generar el PDF', { status: 500 });
  }
};
