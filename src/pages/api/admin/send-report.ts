/**
 * ═══════════════════════════════════════════════════════════════════════════
 * API: POST /api/admin/send-report
 * Envía el reporte de ventas por email usando Gmail/Nodemailer
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

const supabase = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY
);

// Crear transportador de Gmail
function createGmailTransporter() {
  const gmailUser = import.meta.env.GMAIL_USER;
  const gmailPass = import.meta.env.GMAIL_APP_PASSWORD;

  console.log('Gmail config check:', { hasUser: !!gmailUser, hasPass: !!gmailPass });

  if (!gmailUser || !gmailPass) {
    console.error('Gmail credentials missing - GMAIL_USER:', !!gmailUser, 'GMAIL_APP_PASSWORD:', !!gmailPass);
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: gmailPass,
    },
  });
}

export const POST: APIRoute = async ({ request, cookies }) => {
  // Verificar autenticación admin
  const token = cookies.get('sb-access-token')?.value;
  if (!token) {
    return new Response(JSON.stringify({ error: 'No autorizado - Sin token' }), { status: 401 });
  }

  try {
    // Verificar rol admin
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.error('Auth error in send-report:', authError);
      return new Response(JSON.stringify({ error: 'No autorizado - Token inválido' }), { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    console.log('send-report - User ID:', user.id, 'Profile role:', profile?.role);

    // Verificar si es admin (también acepta 'Admin' o 'ADMIN')
    const isAdmin = profile?.role?.toLowerCase() === 'admin';
    if (!isAdmin) {
      return new Response(JSON.stringify({ 
        error: `Acceso denegado - Rol: ${profile?.role || 'sin rol'}` 
      }), { status: 403 });
    }

    // Obtener email del body
    const body = await request.json();
    const { email } = body;

    if (!email || !email.includes('@')) {
      return new Response(JSON.stringify({ error: 'Email inválido' }), { status: 400 });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // OBTENER DATOS DEL REPORTE
    // ═══════════════════════════════════════════════════════════════════════

    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // KPIs del mes
    const { data: monthOrders } = await supabase
      .from('orders')
      .select('total_cents, status')
      .gte('created_at', firstDayOfMonth);

    const monthSalesCents = monthOrders?.reduce((sum, o) => sum + (o.total_cents || 0), 0) || 0;
    const pendingCount = monthOrders?.filter(o => o.status === 'pending').length || 0;
    const totalMonthOrders = monthOrders?.length || 0;

    // Totales generales
    const { count: totalOrders } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true });

    const { count: totalCustomers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'customer');

    const { count: totalProducts } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });

    // Producto más vendido
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('product_id, quantity, products(name)');

    const productSales: Record<string, { name: string; units: number }> = {};
    orderItems?.forEach((item: any) => {
      const id = item.product_id;
      const name = item.products?.name || 'Producto';
      if (!productSales[id]) {
        productSales[id] = { name, units: 0 };
      }
      productSales[id].units += item.quantity || 0;
    });

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.units - a.units)
      .slice(0, 5);

    // Formatear precio
    const formatPrice = (cents: number) => {
      return (cents / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
    };

    // ═══════════════════════════════════════════════════════════════════════
    // GENERAR EMAIL HTML
    // ═══════════════════════════════════════════════════════════════════════

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f4f4f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d4a6f 100%); padding: 40px 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">FashionMarket</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 16px;">Reporte de Ventas y Métricas</p>
          </div>

          <!-- Content -->
          <div style="padding: 40px 30px;">
            <p style="color: #374151; font-size: 14px; margin: 0 0 30px;">
              Generado el <strong>${now.toLocaleDateString('es-ES', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</strong>
            </p>

            <!-- KPIs Grid -->
            <h2 style="color: #1e3a5f; font-size: 18px; margin: 0 0 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
              📊 Indicadores del Mes
            </h2>
            
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
              <tr>
                <td style="padding: 15px; background: #f0f9ff; border-radius: 8px; text-align: center; width: 50%;">
                  <div style="color: #1e3a5f; font-size: 24px; font-weight: 700;">${formatPrice(monthSalesCents)}</div>
                  <div style="color: #6b7280; font-size: 12px; margin-top: 5px;">Ventas del Mes</div>
                </td>
                <td style="width: 10px;"></td>
                <td style="padding: 15px; background: #fef3c7; border-radius: 8px; text-align: center; width: 50%;">
                  <div style="color: #92400e; font-size: 24px; font-weight: 700;">${pendingCount}</div>
                  <div style="color: #6b7280; font-size: 12px; margin-top: 5px;">Pedidos Pendientes</div>
                </td>
              </tr>
            </table>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
              <tr>
                <td style="padding: 12px; background: #f9fafb; border-radius: 8px; text-align: center; width: 33%;">
                  <div style="color: #1f2937; font-size: 20px; font-weight: 600;">${totalOrders || 0}</div>
                  <div style="color: #6b7280; font-size: 11px;">Total Pedidos</div>
                </td>
                <td style="width: 8px;"></td>
                <td style="padding: 12px; background: #f9fafb; border-radius: 8px; text-align: center; width: 33%;">
                  <div style="color: #1f2937; font-size: 20px; font-weight: 600;">${totalCustomers || 0}</div>
                  <div style="color: #6b7280; font-size: 11px;">Clientes</div>
                </td>
                <td style="width: 8px;"></td>
                <td style="padding: 12px; background: #f9fafb; border-radius: 8px; text-align: center; width: 33%;">
                  <div style="color: #1f2937; font-size: 20px; font-weight: 600;">${totalProducts || 0}</div>
                  <div style="color: #6b7280; font-size: 11px;">Productos</div>
                </td>
              </tr>
            </table>

            <!-- Top Products -->
            <h2 style="color: #1e3a5f; font-size: 18px; margin: 0 0 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
              🏆 Productos Más Vendidos
            </h2>
            
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
              ${topProducts.map((p, i) => `
                <tr style="border-bottom: 1px solid #e5e7eb;">
                  <td style="padding: 12px 0;">
                    <span style="display: inline-block; width: 24px; height: 24px; background: ${i === 0 ? '#fbbf24' : '#e5e7eb'}; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: 600; color: ${i === 0 ? '#fff' : '#374151'}; margin-right: 10px;">
                      ${i + 1}
                    </span>
                    <span style="color: #374151; font-size: 14px;">${p.name}</span>
                  </td>
                  <td style="padding: 12px 0; text-align: right;">
                    <span style="color: #1e3a5f; font-weight: 600;">${p.units} uds</span>
                  </td>
                </tr>
              `).join('')}
            </table>

            <!-- CTA -->
            <div style="text-align: center; margin-top: 40px;">
              <a href="${import.meta.env.PUBLIC_SITE_URL || 'https://fashionmarket.com'}/admin" 
                 style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #1e3a5f 0%, #2d4a6f 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
                Ver Panel de Administración
              </a>
            </div>
          </div>

          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 12px; margin: 0;">
              Este es un email automático generado desde el panel de administración de FashionMarket.
            </p>
            <p style="color: #9ca3af; font-size: 11px; margin: 10px 0 0;">
              © ${now.getFullYear()} FashionMarket. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    // ═══════════════════════════════════════════════════════════════════════
    // ENVIAR EMAIL CON GMAIL
    // ═══════════════════════════════════════════════════════════════════════

    const transporter = createGmailTransporter();
    
    if (!transporter) {
      console.error('Gmail no configurado - faltan variables GMAIL_USER y/o GMAIL_APP_PASSWORD');
      return new Response(JSON.stringify({ 
        error: 'Gmail no configurado en el servidor. Configura GMAIL_USER y GMAIL_APP_PASSWORD en Coolify.' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const gmailUser = import.meta.env.GMAIL_USER;

    const mailResult = await transporter.sendMail({
      from: `FashionMarket <${gmailUser}>`,
      to: email,
      subject: `📊 Reporte de Ventas - ${now.toLocaleDateString('es-ES')}`,
      html: emailHtml,
    });

    if (!mailResult.messageId) {
      console.error('Error sending email: No messageId');
      return new Response(JSON.stringify({ error: 'Error al enviar email' }), { status: 500 });
    }

    console.log('✅ Email de reporte enviado:', mailResult.messageId);

    return new Response(JSON.stringify({ 
      success: true, 
      messageId: mailResult.messageId 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in send-report:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
};
