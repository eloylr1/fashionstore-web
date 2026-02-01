/**
 * ═══════════════════════════════════════════════════════════════════════════
 * API: Ver Nota de Crédito
 * Muestra la nota de crédito en HTML para visualización
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

    // Obtener nota de crédito con factura original
    const { data: creditNote, error: cnError } = await supabase
      .from('credit_notes')
      .select('*, invoices!credit_notes_original_invoice_id_fkey(invoice_number)')
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
    const items = creditNote.items as any[] || [];
    const itemsHTML = items.map((item: any) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #fecaca;">
          ${item.name}${item.size ? ` - Talla: ${item.size}` : ''}${item.color ? ` - Color: ${item.color}` : ''}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #fecaca; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #fecaca; text-align: right;">${(item.unit_price / 100).toFixed(2)}€</td>
        <td style="padding: 12px; border-bottom: 1px solid #fecaca; text-align: right; color: #dc2626;">-${(item.total / 100).toFixed(2)}€</td>
      </tr>
    `).join('');

    const customerAddress = creditNote.customer_address as any;
    const addressHTML = customerAddress ? `
      ${customerAddress.address_line1 || ''}<br>
      ${customerAddress.address_line2 ? customerAddress.address_line2 + '<br>' : ''}
      ${customerAddress.postal_code || ''} ${customerAddress.city || ''}<br>
      ${customerAddress.country || 'España'}
    ` : '';

    const originalInvoiceNumber = creditNote.invoices?.invoice_number || 'N/A';

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
      border-bottom: 2px solid #dc2626;
    }
    .logo {
      font-family: Georgia, serif;
      font-size: 24px;
      font-weight: bold;
    }
    .logo span { color: #b8a067; }
    .invoice-info {
      text-align: right;
    }
    .invoice-number {
      font-size: 20px;
      font-weight: bold;
      color: #dc2626;
    }
    .reason-box {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 30px;
    }
    .reason-box h4 {
      margin: 0 0 8px;
      color: #dc2626;
    }
    .addresses {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
    }
    .address-block {
      width: 45%;
    }
    .address-block h3 {
      color: #dc2626;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 10px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    th {
      background: #dc2626;
      color: white;
      padding: 12px;
      text-align: left;
      font-size: 12px;
      text-transform: uppercase;
    }
    th:nth-child(2), th:nth-child(3), th:nth-child(4) {
      text-align: center;
    }
    th:last-child { text-align: right; }
    .totals {
      width: 300px;
      margin-left: auto;
    }
    .totals table { margin-bottom: 0; }
    .totals td {
      padding: 8px 12px;
      border-bottom: 1px solid #fecaca;
    }
    .totals .total-row {
      font-weight: bold;
      font-size: 18px;
      background: #fef2f2;
      color: #dc2626;
    }
    .footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 1px solid #e5e5e5;
      font-size: 12px;
      color: #666;
      text-align: center;
    }
    .status-badge {
      display: inline-block;
      background: #fef2f2;
      color: #dc2626;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
      border: 1px solid #fecaca;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">Fashion<span>Market</span></div>
      <p style="margin: 5px 0; font-size: 14px; color: #666;">Moda masculina premium</p>
    </div>
    <div class="invoice-info">
      <div class="invoice-number">NOTA DE CRÉDITO</div>
      <p style="margin: 5px 0;"><strong>${creditNote.credit_note_number}</strong></p>
      <p style="margin: 5px 0; font-size: 14px;">Fecha: ${new Date(creditNote.issue_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
      <p style="margin: 5px 0; font-size: 12px; color: #666;">Ref. Factura: ${originalInvoiceNumber}</p>
      <span class="status-badge">ABONO</span>
    </div>
  </div>

  <div class="reason-box">
    <h4>📋 Motivo del abono</h4>
    <p style="margin: 0 0 8px; color: #991b1b;">${creditNote.reason || 'Cancelación de pedido'}</p>
    <p style="margin: 0; font-size: 14px; color: #666;">Método de reembolso: ${creditNote.refund_method || 'Devolución a tarjeta original'}</p>
  </div>

  <div class="addresses">
    <div class="address-block">
      <h3>Cliente:</h3>
      <p>
        <strong>${creditNote.customer_name}</strong><br>
        ${creditNote.customer_nif ? `NIF: ${creditNote.customer_nif}<br>` : ''}
        ${addressHTML}
        ${creditNote.customer_email}
      </p>
    </div>
    <div class="address-block">
      <h3>Datos del vendedor:</h3>
      <p>
        <strong>${creditNote.company_name || 'FashionMarket S.L.'}</strong><br>
        NIF: ${creditNote.company_nif || 'B12345678'}<br>
        ${creditNote.company_address || 'Calle Ejemplo 123, 28001 Madrid'}
      </p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Descripción</th>
        <th>Cant.</th>
        <th>Precio unit.</th>
        <th>Importe</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHTML}
    </tbody>
  </table>

  <div class="totals">
    <table>
      <tr>
        <td>Subtotal</td>
        <td style="text-align: right; color: #dc2626;">-${(Math.abs(creditNote.subtotal) / 100).toFixed(2)}€</td>
      </tr>
      <tr>
        <td>IVA (${creditNote.tax_rate || 21}%)</td>
        <td style="text-align: right; color: #dc2626;">-${(Math.abs(creditNote.tax_amount) / 100).toFixed(2)}€</td>
      </tr>
      <tr class="total-row">
        <td>TOTAL A DEVOLVER</td>
        <td style="text-align: right;">-${(Math.abs(creditNote.total) / 100).toFixed(2)}€</td>
      </tr>
    </table>
  </div>

  <div class="footer">
    <p><strong>${creditNote.company_name || 'FashionMarket S.L.'}</strong> - ${creditNote.company_address || 'Calle Ejemplo 123, 28001 Madrid'}</p>
    <p>NIF: ${creditNote.company_nif || 'B12345678'} | Email: info@fashionmarket.es | Web: www.fashionmarket.es</p>
    <p style="margin-top: 20px;">Este documento rectifica la factura indicada y sirve como justificante de devolución.</p>
  </div>
</body>
</html>
    `;

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="nota-credito-${creditNote.credit_note_number}.html"`,
      },
    });

  } catch (error: any) {
    console.error('Error generating credit note:', error);
    return new Response('Error al generar la nota de crédito', { status: 500 });
  }
};
