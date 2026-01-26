/**
 * ═══════════════════════════════════════════════════════════════════════════
 * API: POST /api/admin/send-report
 * Envía el reporte de ventas por email con PDF y Excel adjuntos
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const supabase = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY
);

// Crear transportador de Gmail
function createGmailTransporter() {
  const gmailUser = import.meta.env.GMAIL_USER;
  const gmailPass = import.meta.env.GMAIL_APP_PASSWORD;

  if (!gmailUser || !gmailPass) {
    console.error('Gmail credentials missing');
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

// Formatear precio
function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
}

// Formatear fecha
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

export const POST: APIRoute = async ({ request, cookies }) => {
  const token = cookies.get('sb-access-token')?.value;
  if (!token) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
  }

  try {
    // Verificar rol admin
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single();

    const isAdmin = profile?.role?.toLowerCase() === 'admin';
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403 });
    }

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
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // KPIs del mes
    const { data: monthOrders } = await supabase
      .from('orders')
      .select('total_cents, status')
      .gte('created_at', firstDayOfMonth);

    const monthSalesCents = monthOrders?.reduce((sum, o) => sum + (o.total_cents || 0), 0) || 0;
    const pendingCount = monthOrders?.filter(o => o.status === 'pending').length || 0;

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

    // Productos más vendidos con revenue
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('product_id, quantity, unit_price_cents, products(name)');

    const productSales: Record<string, { name: string; units: number; revenue: number }> = {};
    orderItems?.forEach((item: any) => {
      const id = item.product_id;
      const name = item.products?.name || 'Producto';
      if (!productSales[id]) {
        productSales[id] = { name, units: 0, revenue: 0 };
      }
      productSales[id].units += item.quantity || 0;
      productSales[id].revenue += (item.unit_price_cents || 0) * (item.quantity || 0);
    });

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.units - a.units)
      .slice(0, 10);

    // Ventas últimos 7 días
    const { data: recentOrdersData } = await supabase
      .from('orders')
      .select('created_at, total_cents')
      .gte('created_at', sevenDaysAgo)
      .order('created_at', { ascending: true });

    const salesByDay: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      salesByDay[dateStr] = 0;
    }
    recentOrdersData?.forEach((order: any) => {
      const dateStr = new Date(order.created_at).toISOString().split('T')[0];
      if (salesByDay.hasOwnProperty(dateStr)) {
        salesByDay[dateStr] += order.total_cents || 0;
      }
    });

    // Pedidos recientes
    const { data: ordersForReport } = await supabase
      .from('orders')
      .select('id, created_at, total_cents, status, profiles(full_name, email)')
      .order('created_at', { ascending: false })
      .limit(20);

    const recentOrders = ordersForReport?.map((o: any) => ({
      id: o.id,
      date: o.created_at,
      customer: o.profiles?.full_name || o.profiles?.email || 'Cliente',
      total: o.total_cents || 0,
      status: o.status,
    })) || [];

    // ═══════════════════════════════════════════════════════════════════════
    // GENERAR PDF
    // ═══════════════════════════════════════════════════════════════════════

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(30, 58, 95);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('FashionMarket', 14, 20);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Reporte de Ventas y Metricas', 14, 30);
    doc.text(`Generado: ${now.toLocaleDateString('es-ES')}`, pageWidth - 60, 30);

    doc.setTextColor(0, 0, 0);
    let yPos = 55;

    // KPIs
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Indicadores Clave del Mes', 14, yPos);
    yPos += 10;

    autoTable(doc, {
      startY: yPos,
      head: [['Metrica', 'Valor']],
      body: [
        ['Ventas del Mes', formatPrice(monthSalesCents)],
        ['Pedidos Pendientes', pendingCount.toString()],
        ['Total Pedidos', (totalOrders || 0).toString()],
        ['Total Clientes', (totalCustomers || 0).toString()],
        ['Total Productos', (totalProducts || 0).toString()],
      ],
      theme: 'grid',
      headStyles: { fillColor: [30, 58, 95] },
      styles: { fontSize: 10 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Ventas por día
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Ventas Ultimos 7 Dias', 14, yPos);
    yPos += 10;

    autoTable(doc, {
      startY: yPos,
      head: [['Fecha', 'Ventas']],
      body: Object.entries(salesByDay).map(([date, sales]) => [formatDate(date), formatPrice(sales)]),
      theme: 'striped',
      headStyles: { fillColor: [139, 90, 43] },
      styles: { fontSize: 9 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Top productos
    if (yPos > 200) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Productos Mas Vendidos', 14, yPos);
    yPos += 10;

    autoTable(doc, {
      startY: yPos,
      head: [['Producto', 'Unidades', 'Ingresos']],
      body: topProducts.map(p => [p.name, p.units.toString(), formatPrice(p.revenue)]),
      theme: 'striped',
      headStyles: { fillColor: [30, 58, 95] },
      styles: { fontSize: 9 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Pedidos recientes
    if (yPos > 200) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Pedidos Recientes', 14, yPos);
    yPos += 10;

    const statusTranslations: Record<string, string> = {
      'pending': 'Pendiente',
      'processing': 'Procesando',
      'shipped': 'Enviado',
      'delivered': 'Entregado',
      'cancelled': 'Cancelado',
    };

    autoTable(doc, {
      startY: yPos,
      head: [['ID', 'Fecha', 'Cliente', 'Total', 'Estado']],
      body: recentOrders.map(o => [
        o.id.substring(0, 8) + '...',
        formatDate(o.date),
        o.customer,
        formatPrice(o.total),
        statusTranslations[o.status] || o.status
      ]),
      theme: 'striped',
      headStyles: { fillColor: [30, 58, 95] },
      styles: { fontSize: 8 },
    });

    // Footer en todas las páginas
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128);
      doc.text(
        `FashionMarket - Pagina ${i} de ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    // ═══════════════════════════════════════════════════════════════════════
    // GENERAR EXCEL
    // ═══════════════════════════════════════════════════════════════════════

    const wb = XLSX.utils.book_new();

    // Hoja 1: Resumen
    const summaryData = [
      ['REPORTE DE VENTAS - FASHIONMARKET'],
      ['Fecha de generacion:', now.toLocaleDateString('es-ES')],
      [''],
      ['INDICADORES CLAVE'],
      ['Ventas del mes', formatPrice(monthSalesCents)],
      ['Pedidos pendientes', pendingCount],
      ['Total pedidos', totalOrders || 0],
      ['Total clientes', totalCustomers || 0],
      ['Total productos', totalProducts || 0],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    wsSummary['!cols'] = [{ wch: 25 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen');

    // Hoja 2: Ventas por día
    const salesData = [['Fecha', 'Ventas'], ...Object.entries(salesByDay).map(([date, sales]) => [formatDate(date), formatPrice(sales)])];
    const wsSales = XLSX.utils.aoa_to_sheet(salesData);
    wsSales['!cols'] = [{ wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsSales, 'Ventas Diarias');

    // Hoja 3: Productos
    const productsData = [['Producto', 'Unidades', 'Ingresos'], ...topProducts.map(p => [p.name, p.units, formatPrice(p.revenue)])];
    const wsProducts = XLSX.utils.aoa_to_sheet(productsData);
    wsProducts['!cols'] = [{ wch: 30 }, { wch: 10 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsProducts, 'Top Productos');

    // Hoja 4: Pedidos
    const ordersData = [
      ['ID Pedido', 'Fecha', 'Cliente', 'Total', 'Estado'],
      ...recentOrders.map(o => [o.id, formatDate(o.date), o.customer, formatPrice(o.total), statusTranslations[o.status] || o.status])
    ];
    const wsOrders = XLSX.utils.aoa_to_sheet(ordersData);
    wsOrders['!cols'] = [{ wch: 40 }, { wch: 12 }, { wch: 25 }, { wch: 12 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsOrders, 'Pedidos Recientes');

    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // ═══════════════════════════════════════════════════════════════════════
    // ENVIAR EMAIL PROFESIONAL CON ADJUNTOS
    // ═══════════════════════════════════════════════════════════════════════

    const transporter = createGmailTransporter();
    
    if (!transporter) {
      return new Response(JSON.stringify({ 
        error: 'Gmail no configurado. Configura GMAIL_USER y GMAIL_APP_PASSWORD.' 
      }), { status: 500 });
    }

    const gmailUser = import.meta.env.GMAIL_USER;
    const dateStr = now.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
    const adminName = profile?.full_name || 'Administrador';

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d4a6f 100%); padding: 40px 30px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">FashionMarket</h1>
      <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px; font-weight: 400;">Sistema de Gestion Empresarial</p>
    </div>

    <!-- Content -->
    <div style="padding: 40px 30px;">
      
      <p style="color: #1f2937; font-size: 16px; margin: 0 0 20px; line-height: 1.6;">
        Estimado/a <strong>${adminName}</strong>,
      </p>
      
      <p style="color: #4b5563; font-size: 15px; margin: 0 0 25px; line-height: 1.7;">
        Adjunto encontrara el reporte completo de ventas y metricas de <strong>FashionMarket</strong> correspondiente a la fecha <strong>${now.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</strong>.
      </p>

      <!-- Archivos adjuntos info -->
      <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 12px; padding: 25px; margin: 30px 0; border-left: 4px solid #0284c7;">
        <h3 style="color: #0369a1; margin: 0 0 15px; font-size: 15px; font-weight: 600;">
          Archivos adjuntos
        </h3>
        <ul style="margin: 0; padding: 0 0 0 20px; color: #475569; font-size: 14px; line-height: 2;">
          <li><strong>FashionMarket_Reporte_${dateStr}.pdf</strong> - Informe visual completo</li>
          <li><strong>FashionMarket_Reporte_${dateStr}.xlsx</strong> - Datos en Excel para analisis</li>
        </ul>
      </div>

      <!-- Resumen rápido -->
      <div style="background: #fafafa; border-radius: 12px; padding: 25px; margin: 30px 0;">
        <h3 style="color: #1e3a5f; margin: 0 0 20px; font-size: 15px; font-weight: 600;">
          Resumen Ejecutivo
        </h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">Ventas del Mes</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #1e3a5f; font-size: 14px; font-weight: 600; text-align: right;">${formatPrice(monthSalesCents)}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">Pedidos Pendientes</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #f59e0b; font-size: 14px; font-weight: 600; text-align: right;">${pendingCount}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">Total Clientes</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #1e3a5f; font-size: 14px; font-weight: 600; text-align: right;">${totalCustomers || 0}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Total Productos</td>
            <td style="padding: 10px 0; color: #1e3a5f; font-size: 14px; font-weight: 600; text-align: right;">${totalProducts || 0}</td>
          </tr>
        </table>
      </div>

      <p style="color: #4b5563; font-size: 14px; margin: 25px 0; line-height: 1.7;">
        Para mas detalles, consulte los archivos adjuntos o acceda al panel de administracion.
      </p>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 35px 0;">
        <a href="${import.meta.env.PUBLIC_SITE_URL || 'https://fashionmarket.com'}/admin" 
           style="display: inline-block; padding: 14px 40px; background: linear-gradient(135deg, #1e3a5f 0%, #2d4a6f 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; box-shadow: 0 4px 14px rgba(30, 58, 95, 0.25);">
          Acceder al Panel de Administracion
        </a>
      </div>

      <p style="color: #6b7280; font-size: 13px; margin: 30px 0 0; line-height: 1.6;">
        Atentamente,<br>
        <strong style="color: #1e3a5f;">El equipo de FashionMarket</strong>
      </p>

    </div>

    <!-- Footer -->
    <div style="background-color: #f8fafc; padding: 25px 30px; border-top: 1px solid #e5e7eb;">
      <p style="color: #9ca3af; font-size: 11px; margin: 0; text-align: center; line-height: 1.6;">
        Este es un correo electronico automatico generado por el sistema de FashionMarket.<br>
        Por favor, no responda a este mensaje.
      </p>
      <p style="color: #d1d5db; font-size: 10px; margin: 15px 0 0; text-align: center;">
        © ${now.getFullYear()} FashionMarket. Todos los derechos reservados.
      </p>
    </div>

  </div>
</body>
</html>
    `;

    const mailResult = await transporter.sendMail({
      from: `FashionMarket <${gmailUser}>`,
      to: email,
      subject: `Reporte de Ventas FashionMarket - ${now.toLocaleDateString('es-ES')}`,
      html: emailHtml,
      attachments: [
        {
          filename: `FashionMarket_Reporte_${dateStr}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
        {
          filename: `FashionMarket_Reporte_${dateStr}.xlsx`,
          content: excelBuffer,
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      ],
    });

    console.log('Email con adjuntos enviado:', mailResult.messageId);

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
