/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - Report Exporter Component
 * Exportación de métricas en PDF, Excel y envío por email
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportData {
  kpis: {
    monthSalesCents: number;
    pendingCount: number;
    topProductName: string;
    topProductUnits: number;
    totalOrders: number;
    totalCustomers: number;
    totalProducts: number;
  };
  salesByDay: { date: string; sales: number }[];
  topProducts: { name: string; units: number; revenue: number }[];
  recentOrders: { id: string; date: string; customer: string; total: number; status: string }[];
}

export default function ReportExporter() {
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [email, setEmail] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Obtener datos del reporte
  const fetchReportData = async (): Promise<ReportData> => {
    const response = await fetch('/api/admin/report-data');
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Error ${response.status}: No se pudieron obtener los datos`);
    }
    return response.json();
  };

  // Formatear precio
  const formatPrice = (cents: number) => {
    return (cents / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
  };

  // Formatear fecha
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPORTAR A EXCEL
  // ═══════════════════════════════════════════════════════════════════════════
  const exportToExcel = async () => {
    setLoading(true);
    try {
      const data = await fetchReportData();
      const wb = XLSX.utils.book_new();

      // Hoja 1: Resumen KPIs
      const kpisData = [
        ['REPORTE DE VENTAS - FASHIONMARKET'],
        ['Fecha de generación:', new Date().toLocaleDateString('es-ES')],
        [''],
        ['INDICADORES CLAVE'],
        ['Ventas del mes', formatPrice(data.kpis.monthSalesCents)],
        ['Pedidos pendientes', data.kpis.pendingCount],
        ['Total pedidos', data.kpis.totalOrders],
        ['Total clientes', data.kpis.totalCustomers],
        ['Total productos', data.kpis.totalProducts],
        ['Producto más vendido', data.kpis.topProductName],
        ['Unidades vendidas (top)', data.kpis.topProductUnits],
      ];
      const wsKpis = XLSX.utils.aoa_to_sheet(kpisData);
      wsKpis['!cols'] = [{ wch: 25 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, wsKpis, 'Resumen');

      // Hoja 2: Ventas por día
      const salesHeaders = ['Fecha', 'Ventas (€)'];
      const salesRows = data.salesByDay.map(d => [formatDate(d.date), formatPrice(d.sales)]);
      const wsSales = XLSX.utils.aoa_to_sheet([salesHeaders, ...salesRows]);
      wsSales['!cols'] = [{ wch: 15 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, wsSales, 'Ventas Diarias');

      // Hoja 3: Productos más vendidos
      const productsHeaders = ['Producto', 'Unidades', 'Ingresos'];
      const productsRows = data.topProducts.map(p => [p.name, p.units, formatPrice(p.revenue)]);
      const wsProducts = XLSX.utils.aoa_to_sheet([productsHeaders, ...productsRows]);
      wsProducts['!cols'] = [{ wch: 30 }, { wch: 10 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, wsProducts, 'Top Productos');

      // Hoja 4: Pedidos recientes
      const ordersHeaders = ['ID Pedido', 'Fecha', 'Cliente', 'Total', 'Estado'];
      const ordersRows = data.recentOrders.map(o => [
        o.id,
        formatDate(o.date),
        o.customer,
        formatPrice(o.total),
        o.status
      ]);
      const wsOrders = XLSX.utils.aoa_to_sheet([ordersHeaders, ...ordersRows]);
      wsOrders['!cols'] = [{ wch: 15 }, { wch: 12 }, { wch: 25 }, { wch: 12 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, wsOrders, 'Pedidos Recientes');

      // Descargar
      const fileName = `FashionMarket_Reporte_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);

      setMessage({ type: 'success', text: 'Excel descargado correctamente' });
    } catch (error) {
      console.error('Error Excel:', error);
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Error al generar Excel' });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPORTAR A PDF
  // ═══════════════════════════════════════════════════════════════════════════
  const exportToPDF = async () => {
    setLoading(true);
    try {
      const data = await fetchReportData();
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Header
      doc.setFillColor(30, 58, 95); // navy-900
      doc.rect(0, 0, pageWidth, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('FashionMarket', 14, 20);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('Reporte de Ventas y Métricas', 14, 30);
      doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')}`, pageWidth - 60, 30);

      // Reset colors
      doc.setTextColor(0, 0, 0);
      let yPos = 55;

      // KPIs Section
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Indicadores Clave del Mes', 14, yPos);
      yPos += 10;

      // KPIs Grid
      const kpisGrid = [
        ['Ventas del Mes', formatPrice(data.kpis.monthSalesCents)],
        ['Pedidos Pendientes', data.kpis.pendingCount.toString()],
        ['Total Pedidos', data.kpis.totalOrders.toString()],
        ['Total Clientes', data.kpis.totalCustomers.toString()],
        ['Total Productos', data.kpis.totalProducts.toString()],
        ['Más Vendido', data.kpis.topProductName || 'Sin datos'],
      ];

      autoTable(doc, {
        startY: yPos,
        head: [['Métrica', 'Valor']],
        body: kpisGrid,
        theme: 'grid',
        headStyles: { fillColor: [30, 58, 95], textColor: 255 },
        styles: { fontSize: 10 },
        columnStyles: { 0: { fontStyle: 'bold' } },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;

      // Ventas por día
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Ventas Últimos 7 Días', 14, yPos);
      yPos += 10;

      autoTable(doc, {
        startY: yPos,
        head: [['Fecha', 'Ventas']],
        body: data.salesByDay.map(d => [formatDate(d.date), formatPrice(d.sales)]),
        theme: 'striped',
        headStyles: { fillColor: [139, 90, 43] }, // leather color
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
      doc.text('Productos Más Vendidos', 14, yPos);
      yPos += 10;

      autoTable(doc, {
        startY: yPos,
        head: [['Producto', 'Unidades', 'Ingresos']],
        body: data.topProducts.map(p => [p.name, p.units.toString(), formatPrice(p.revenue)]),
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

      autoTable(doc, {
        startY: yPos,
        head: [['ID', 'Fecha', 'Cliente', 'Total', 'Estado']],
        body: data.recentOrders.map(o => [
          o.id.substring(0, 8) + '...',
          formatDate(o.date),
          o.customer,
          formatPrice(o.total),
          o.status
        ]),
        theme: 'striped',
        headStyles: { fillColor: [30, 58, 95] },
        styles: { fontSize: 8 },
      });

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128);
        doc.text(
          `FashionMarket - Página ${i} de ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }

      // Descargar
      const fileName = `FashionMarket_Reporte_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

      setMessage({ type: 'success', text: 'PDF descargado correctamente' });
    } catch (error) {
      console.error('Error PDF:', error);
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Error al generar PDF' });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // ENVIAR POR EMAIL
  // ═══════════════════════════════════════════════════════════════════════════
  const sendByEmail = async () => {
    if (!email) {
      setMessage({ type: 'error', text: 'Introduce un email válido' });
      return;
    }

    setSendingEmail(true);
    try {
      const response = await fetch('/api/admin/send-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json().catch(() => ({}));
      
      if (!response.ok) {
        throw new Error(data.error || `Error ${response.status}`);
      }

      setMessage({ type: 'success', text: `Reporte enviado a ${email}` });
      setShowModal(false);
      setEmail('');
    } catch (error) {
      console.error('Error email:', error);
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Error al enviar el email' });
    } finally {
      setSendingEmail(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  return (
    <>
      {/* Botones de exportación */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Excel */}
        <button
          onClick={exportToExcel}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-all shadow-sm disabled:opacity-50"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Exportar Excel
        </button>

        {/* PDF */}
        <button
          onClick={exportToPDF}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-all shadow-sm disabled:opacity-50"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          Exportar PDF
        </button>

        {/* Email */}
        <button
          onClick={() => setShowModal(true)}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-all shadow-sm disabled:opacity-50"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Enviar por Email
        </button>

        {loading && (
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Generando...
          </div>
        )}
      </div>

      {/* Mensaje de feedback */}
      {message && (
        <div className={`mt-3 px-4 py-2 rounded-lg text-sm ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* Modal de Email */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Enviar Reporte por Email</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dirección de email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@fashionmarket.com"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
              />
              <p className="text-xs text-gray-500 mt-2">
                Recibirás un PDF con el reporte completo de ventas
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={sendByEmail}
                disabled={sendingEmail || !email}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {sendingEmail ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Enviando...
                  </>
                ) : (
                  'Enviar Reporte'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
