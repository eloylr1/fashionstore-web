/**
 * ═══════════════════════════════════════════════════════════════════════════
 * API: Ver/Descargar Nota de Crédito (Factura de Abono)
 * Genera un HTML visualizable de la nota de crédito
 * ═══════════════════════════════════════════════════════════════════════════
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

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

    // Generar HTML de la nota de crédito
    const items = creditNote.items as any[];
    const itemsHTML = items.map((item: any) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e5e5;">
          ${item.name}${item.size ? ` - Talla: ${item.size}` : ''}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e5e5; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e5e5; text-align: right; color: #dc2626;">${(item.unit_price / 100).toFixed(2)}€</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e5e5; text-align: right; color: #dc2626;">${(item.total / 100).toFixed(2)}€</td>
      </tr>
    `).join('');

    const customerAddress = creditNote.customer_address as any;
    const addressHTML = customerAddress ? `
      ${customerAddress.address_line1 || ''}<br>
      ${customerAddress.address_line2 ? customerAddress.address_line2 + '<br>' : ''}
      ${customerAddress.postal_code || ''} ${customerAddress.city || ''}<br>
      ${customerAddress.country || 'España'}
    ` : '';

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Nota de Crédito ${creditNote.credit_note_number}</title>
  <style>
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      color: #1a1a2e;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid #dc2626;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
    }
    .logo span {
      color: #b8860b;
    }
    .credit-note-badge {
      background: #dc2626;
      color: white;
      padding: 8px 16px;
      border-radius: 4px;
      font-weight: bold;
      text-transform: uppercase;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-bottom: 40px;
    }
    .info-box h3 {
      color: #6b7280;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 8px;
    }
    .info-box p {
      margin: 4px 0;
      line-height: 1.6;
    }
    .cn-number {
      font-size: 20px;
      font-weight: bold;
      color: #dc2626;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 30px 0;
    }
    th {
      background: #fef2f2;
      padding: 12px;
      text-align: left;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #dc2626;
    }
    th:nth-child(2), th:nth-child(3), th:nth-child(4) {
      text-align: right;
    }
    td {
      text-align: left;
    }
    td:nth-child(2), td:nth-child(3), td:nth-child(4) {
      text-align: right;
    }
    .totals {
      margin-left: auto;
      width: 300px;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e5e5e5;
      color: #dc2626;
    }
    .totals-row.total {
      font-size: 18px;
      font-weight: bold;
      border-bottom: 2px solid #dc2626;
      padding-top: 12px;
    }
    .footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 1px solid #e5e5e5;
      font-size: 12px;
      color: #6b7280;
      text-align: center;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
    }
    .status-refunded {
      background: #dcfce7;
      color: #166534;
    }
    .status-pending {
      background: #fef9c3;
      color: #854d0e;
    }
    .reason-box {
      background: #fef2f2;
      border-left: 4px solid #dc2626;
      padding: 16px;
      margin: 20px 0;
    }
    .reason-box h4 {
      color: #dc2626;
      margin: 0 0 8px 0;
      font-size: 14px;
    }
    @media print {
      body {
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">Fashion<span>Market</span></div>
      <p style="color: #6b7280; margin-top: 8px;">Moda Masculina Premium</p>
    </div>
    <div style="text-align: right;">
      <div class="credit-note-badge">Nota de Crédito</div>
      <p class="cn-number" style="margin-top: 12px;">${creditNote.credit_note_number}</p>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-box">
      <h3>Datos del Cliente</h3>
      <p><strong>${creditNote.customer_name}</strong></p>
      <p>${creditNote.customer_email}</p>
      ${creditNote.customer_nif ? `<p>NIF: ${creditNote.customer_nif}</p>` : ''}
      <p>${addressHTML}</p>
    </div>
    <div class="info-box" style="text-align: right;">
      <h3>Datos de la Nota de Crédito</h3>
      <p><strong>Fecha de Emisión:</strong> ${new Date(creditNote.issue_date).toLocaleDateString('es-ES')}</p>
      ${creditNote.refunded_date ? `<p><strong>Fecha de Reembolso:</strong> ${new Date(creditNote.refunded_date).toLocaleDateString('es-ES')}</p>` : ''}
      <p>
        <strong>Estado:</strong> 
        <span class="status-badge ${creditNote.status === 'refunded' ? 'status-refunded' : 'status-pending'}">
          ${creditNote.status === 'refunded' ? 'Reembolsada' : creditNote.status === 'pending' ? 'Pendiente' : creditNote.status}
        </span>
      </p>
      <p><strong>Método:</strong> ${creditNote.refund_method === 'stripe' ? 'Tarjeta' : creditNote.refund_method === 'bank_transfer' ? 'Transferencia' : creditNote.refund_method}</p>
    </div>
  </div>

  <div class="reason-box">
    <h4>Motivo de la Nota de Crédito</h4>
    <p style="margin: 0; color: #6b7280;">${creditNote.reason}</p>
  </div>

  <table>
    <thead>
      <tr>
        <th style="text-align: left;">Descripción</th>
        <th style="text-align: center;">Cantidad</th>
        <th style="text-align: right;">Precio Unit.</th>
        <th style="text-align: right;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHTML}
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-row">
      <span>Subtotal</span>
      <span>${(creditNote.subtotal / 100).toFixed(2)}€</span>
    </div>
    <div class="totals-row">
      <span>IVA (${creditNote.tax_rate}%)</span>
      <span>${(creditNote.tax_amount / 100).toFixed(2)}€</span>
    </div>
    <div class="totals-row total">
      <span>Total a Reembolsar</span>
      <span>${(creditNote.total / 100).toFixed(2)}€</span>
    </div>
  </div>

  <div class="info-box" style="margin-top: 40px;">
    <h3>Datos del Emisor</h3>
    <p><strong>${creditNote.company_name}</strong></p>
    <p>NIF: ${creditNote.company_nif}</p>
    <p>${creditNote.company_address}</p>
  </div>

  ${creditNote.notes ? `
    <div style="margin-top: 30px; padding: 16px; background: #f9fafb; border-radius: 8px;">
      <h4 style="margin: 0 0 8px 0; color: #374151;">Observaciones</h4>
      <p style="margin: 0; color: #6b7280;">${creditNote.notes}</p>
    </div>
  ` : ''}

  <div class="footer">
    <p>Esta nota de crédito rectifica importes de la factura original.</p>
    <p>Los importes mostrados son negativos y deben descontarse de la caja.</p>
    <p>${creditNote.company_name} - ${creditNote.company_nif}</p>
  </div>
</body>
</html>
    `;

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });

  } catch (error) {
    console.error('Error generating credit note:', error);
    return new Response('Error generando nota de crédito', { status: 500 });
  }
};
