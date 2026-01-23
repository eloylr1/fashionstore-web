/**
 * ═══════════════════════════════════════════════════════════════════════════
 * API: Descargar Factura en PDF
 * Genera un PDF de la factura para descarga
 * ═══════════════════════════════════════════════════════════════════════════
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

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

    // Generar HTML de la factura
    const items = invoice.items as any[];
    const itemsHTML = items.map((item: any) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e5e5;">
          ${item.name}${item.size ? ` - Talla: ${item.size}` : ''}${item.color ? ` - Color: ${item.color}` : ''}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e5e5; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e5e5; text-align: right;">${(item.unit_price / 100).toFixed(2)}€</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e5e5; text-align: right;">${(item.total / 100).toFixed(2)}€</td>
      </tr>
    `).join('');

    const customerAddress = invoice.customer_address as any;
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
  <title>Factura ${invoice.invoice_number}</title>
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
      border-bottom: 2px solid #b8a067;
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
      font-size: 24px;
      font-weight: bold;
      color: #1a1a2e;
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
      color: #b8a067;
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
      background: #1a1a2e;
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
      border-bottom: 1px solid #e5e5e5;
    }
    .totals .total-row {
      font-weight: bold;
      font-size: 18px;
      background: #f8f7f5;
    }
    .footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 1px solid #e5e5e5;
      font-size: 12px;
      color: #666;
      text-align: center;
    }
    .status-paid {
      display: inline-block;
      background: #10b981;
      color: white;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
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
      <div class="invoice-number">FACTURA</div>
      <p style="margin: 5px 0;"><strong>${invoice.invoice_number}</strong></p>
      <p style="margin: 5px 0; font-size: 14px;">Fecha: ${new Date(invoice.issue_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
      <span class="status-paid">PAGADA</span>
    </div>
  </div>

  <div class="addresses">
    <div class="address-block">
      <h3>Facturado a:</h3>
      <p>
        <strong>${invoice.customer_name}</strong><br>
        ${invoice.customer_nif ? `NIF: ${invoice.customer_nif}<br>` : ''}
        ${addressHTML}
        ${invoice.customer_email}
      </p>
    </div>
    <div class="address-block">
      <h3>Datos del vendedor:</h3>
      <p>
        <strong>${invoice.company_name}</strong><br>
        NIF: ${invoice.company_nif}<br>
        ${invoice.company_address}
      </p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Descripción</th>
        <th>Cant.</th>
        <th>Precio unit.</th>
        <th>Total</th>
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
        <td style="text-align: right;">${(invoice.subtotal / 100).toFixed(2)}€</td>
      </tr>
      <tr>
        <td>IVA (${invoice.tax_rate}%)</td>
        <td style="text-align: right;">${(invoice.tax_amount / 100).toFixed(2)}€</td>
      </tr>
      <tr class="total-row">
        <td>TOTAL</td>
        <td style="text-align: right;">${(invoice.total / 100).toFixed(2)}€</td>
      </tr>
    </table>
  </div>

  <div class="footer">
    <p><strong>FashionMarket S.L.</strong> - ${invoice.company_address}</p>
    <p>NIF: ${invoice.company_nif} | Email: info@fashionmarket.es | Web: www.fashionmarket.es</p>
    <p style="margin-top: 20px;">Gracias por tu compra. Este documento sirve como comprobante de pago.</p>
  </div>
</body>
</html>
    `;

    // Devolver HTML (el navegador puede imprimirlo a PDF o usar una librería como puppeteer)
    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="factura-${invoice.invoice_number}.html"`,
      },
    });

  } catch (error: any) {
    console.error('Error generating invoice:', error);
    return new Response('Error al generar la factura', { status: 500 });
  }
};
