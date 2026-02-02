/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GENERADOR DE PDF PARA FACTURAS Y NOTAS DE CRÉDITO
 * Genera documentos PDF profesionales usando jsPDF
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// Tipos para extender jsPDF con autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: { finalY: number };
  }
}

interface InvoiceItem {
  name: string;
  quantity: number;
  unit_price: number;
  total: number;
  size?: string;
  color?: string;
}

interface CustomerAddress {
  address_line1?: string;
  address_line2?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  province?: string;
}

interface InvoiceData {
  invoice_number: string;
  issue_date: string;
  customer_name: string;
  customer_email: string;
  customer_nif?: string;
  customer_address?: CustomerAddress;
  items: InvoiceItem[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  discount_amount?: number;
  company_name: string;
  company_nif: string;
  company_address: string;
  status: string;
  paid_date?: string;
}

interface CreditNoteData {
  credit_note_number: string;
  issue_date: string;
  original_invoice_number: string;
  customer_name: string;
  customer_email: string;
  customer_nif?: string;
  customer_address?: CustomerAddress;
  items: InvoiceItem[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  reason: string;
  refund_method: string;
  company_name: string;
  company_nif: string;
  company_address: string;
}

// Colores corporativos
const COLORS = {
  primary: [26, 26, 46] as [number, number, number],      // #1a1a2e
  gold: [184, 160, 103] as [number, number, number],     // #b8a067
  text: [55, 65, 81] as [number, number, number],        // #374151
  lightGray: [249, 250, 251] as [number, number, number], // #f9fafb
  green: [16, 185, 129] as [number, number, number],     // #10b981
  red: [239, 68, 68] as [number, number, number],        // #ef4444
};

/**
 * Genera un PDF de factura
 */
export function generateInvoicePDF(invoice: InvoiceData): Buffer {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 20;

  // ─── HEADER ────────────────────────────────────────────────────────────────
  
  // Logo / Nombre empresa
  doc.setFontSize(24);
  doc.setTextColor(...COLORS.primary);
  doc.setFont('helvetica', 'bold');
  doc.text('Fashion', margin, y);
  doc.setTextColor(...COLORS.gold);
  doc.text('Market', margin + doc.getTextWidth('Fashion'), y);
  
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.text);
  doc.setFont('helvetica', 'normal');
  doc.text('Moda masculina premium', margin, y + 6);
  
  // Número de factura (derecha)
  doc.setFontSize(24);
  doc.setTextColor(...COLORS.primary);
  doc.setFont('helvetica', 'bold');
  doc.text('FACTURA', pageWidth - margin, y, { align: 'right' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(invoice.invoice_number, pageWidth - margin, y + 8, { align: 'right' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const issueDate = new Date(invoice.issue_date).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  doc.text(`Fecha: ${issueDate}`, pageWidth - margin, y + 15, { align: 'right' });
  
  // Badge de estado
  if (invoice.status === 'paid') {
    doc.setFillColor(...COLORS.green);
    doc.roundedRect(pageWidth - margin - 30, y + 19, 30, 8, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('PAGADA', pageWidth - margin - 15, y + 25, { align: 'center' });
  }

  // Línea separadora
  y = 50;
  doc.setDrawColor(...COLORS.gold);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  
  // ─── DIRECCIONES ───────────────────────────────────────────────────────────
  
  y = 60;
  
  // Facturado a
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.gold);
  doc.setFont('helvetica', 'bold');
  doc.text('FACTURADO A:', margin, y);
  
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.primary);
  doc.text(invoice.customer_name, margin, y + 7);
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.text);
  let customerY = y + 14;
  
  if (invoice.customer_nif) {
    doc.text(`NIF: ${invoice.customer_nif}`, margin, customerY);
    customerY += 5;
  }
  
  if (invoice.customer_address) {
    const addr = invoice.customer_address;
    if (addr.address_line1) {
      doc.text(addr.address_line1, margin, customerY);
      customerY += 5;
    }
    if (addr.address_line2) {
      doc.text(addr.address_line2, margin, customerY);
      customerY += 5;
    }
    if (addr.postal_code || addr.city) {
      doc.text(`${addr.postal_code || ''} ${addr.city || ''}`.trim(), margin, customerY);
      customerY += 5;
    }
    doc.text(addr.country || 'España', margin, customerY);
  }
  
  doc.text(invoice.customer_email, margin, customerY + 5);

  // Datos del vendedor
  const rightCol = pageWidth / 2 + 10;
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.gold);
  doc.setFont('helvetica', 'bold');
  doc.text('DATOS DEL VENDEDOR:', rightCol, y);
  
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.primary);
  doc.text(invoice.company_name, rightCol, y + 7);
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.text);
  doc.text(`NIF: ${invoice.company_nif}`, rightCol, y + 14);
  
  // Dividir dirección si es muy larga
  const addressLines = doc.splitTextToSize(invoice.company_address, 70);
  doc.text(addressLines, rightCol, y + 21);

  // ─── TABLA DE ITEMS ────────────────────────────────────────────────────────
  
  y = 110;
  
  const tableBody = invoice.items.map(item => {
    let desc = item.name;
    if (item.size) desc += ` - Talla: ${item.size}`;
    if (item.color) desc += ` - Color: ${item.color}`;
    
    return [
      desc,
      item.quantity.toString(),
      `${(item.unit_price / 100).toFixed(2)}€`,
      `${(item.total / 100).toFixed(2)}€`
    ];
  });

  doc.autoTable({
    startY: y,
    head: [['Descripción', 'Cant.', 'Precio unit.', 'Total']],
    body: tableBody,
    theme: 'plain',
    headStyles: {
      fillColor: COLORS.primary,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    columnStyles: {
      0: { cellWidth: 90 },
      1: { halign: 'center', cellWidth: 20 },
      2: { halign: 'right', cellWidth: 30 },
      3: { halign: 'right', cellWidth: 30 },
    },
    styles: {
      fontSize: 9,
      cellPadding: 5,
    },
    alternateRowStyles: {
      fillColor: COLORS.lightGray,
    },
    margin: { left: margin, right: margin },
  });

  // ─── TOTALES ───────────────────────────────────────────────────────────────
  
  y = doc.lastAutoTable.finalY + 10;
  
  const totalsX = pageWidth - margin - 80;
  const valuesX = pageWidth - margin;
  
  // Subtotal
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.text);
  doc.text('Subtotal', totalsX, y);
  doc.text(`${(invoice.subtotal / 100).toFixed(2)}€`, valuesX, y, { align: 'right' });
  
  // Descuento (si aplica)
  if (invoice.discount_amount && invoice.discount_amount > 0) {
    y += 7;
    doc.setTextColor(...COLORS.green);
    doc.text('Descuento', totalsX, y);
    doc.text(`-${(invoice.discount_amount / 100).toFixed(2)}€`, valuesX, y, { align: 'right' });
  }
  
  // IVA
  y += 7;
  doc.setTextColor(...COLORS.text);
  doc.text(`IVA (${invoice.tax_rate}%)`, totalsX, y);
  doc.text(`${(invoice.tax_amount / 100).toFixed(2)}€`, valuesX, y, { align: 'right' });
  
  // Línea separadora
  y += 5;
  doc.setDrawColor(...COLORS.gold);
  doc.line(totalsX - 5, y, pageWidth - margin, y);
  
  // Total
  y += 8;
  doc.setFontSize(14);
  doc.setTextColor(...COLORS.primary);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL', totalsX, y);
  doc.text(`${(invoice.total / 100).toFixed(2)}€`, valuesX, y, { align: 'right' });

  // ─── FOOTER ────────────────────────────────────────────────────────────────
  
  const footerY = doc.internal.pageSize.getHeight() - 30;
  
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, footerY - 10, pageWidth - margin, footerY - 10);
  
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.text);
  doc.setFont('helvetica', 'normal');
  doc.text(`${invoice.company_name} - ${invoice.company_address}`, pageWidth / 2, footerY, { align: 'center' });
  doc.text(`NIF: ${invoice.company_nif} | Email: info@fashionmarket.es | Web: www.fashionmarket.es`, pageWidth / 2, footerY + 5, { align: 'center' });
  doc.text('Gracias por tu compra. Este documento sirve como comprobante de pago.', pageWidth / 2, footerY + 12, { align: 'center' });

  // Retornar como Buffer
  return Buffer.from(doc.output('arraybuffer'));
}

/**
 * Genera un PDF de nota de crédito
 */
export function generateCreditNotePDF(creditNote: CreditNoteData): Buffer {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 20;

  // ─── HEADER ────────────────────────────────────────────────────────────────
  
  // Logo / Nombre empresa
  doc.setFontSize(24);
  doc.setTextColor(...COLORS.primary);
  doc.setFont('helvetica', 'bold');
  doc.text('Fashion', margin, y);
  doc.setTextColor(...COLORS.gold);
  doc.text('Market', margin + doc.getTextWidth('Fashion'), y);
  
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.text);
  doc.setFont('helvetica', 'normal');
  doc.text('Moda masculina premium', margin, y + 6);
  
  // Título NOTA DE CRÉDITO (derecha)
  doc.setFontSize(20);
  doc.setTextColor(...COLORS.red);
  doc.setFont('helvetica', 'bold');
  doc.text('NOTA DE CRÉDITO', pageWidth - margin, y, { align: 'right' });
  
  doc.setFontSize(12);
  doc.setTextColor(...COLORS.primary);
  doc.text(creditNote.credit_note_number, pageWidth - margin, y + 8, { align: 'right' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.text);
  const issueDate = new Date(creditNote.issue_date).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  doc.text(`Fecha: ${issueDate}`, pageWidth - margin, y + 15, { align: 'right' });
  
  // Referencia a factura original
  doc.setFontSize(9);
  doc.text(`Ref. Factura: ${creditNote.original_invoice_number}`, pageWidth - margin, y + 22, { align: 'right' });

  // Línea separadora
  y = 55;
  doc.setDrawColor(...COLORS.red);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  
  // ─── MOTIVO ────────────────────────────────────────────────────────────────
  
  y = 62;
  doc.setFillColor(254, 242, 242); // Rojo muy claro
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 15, 2, 2, 'F');
  
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.red);
  doc.setFont('helvetica', 'bold');
  doc.text('Motivo:', margin + 5, y + 7);
  doc.setFont('helvetica', 'normal');
  doc.text(creditNote.reason, margin + 25, y + 7);
  
  doc.text(`Método de reembolso: ${creditNote.refund_method}`, margin + 5, y + 12);

  // ─── DIRECCIONES ───────────────────────────────────────────────────────────
  
  y = 85;
  
  // Cliente
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.gold);
  doc.setFont('helvetica', 'bold');
  doc.text('CLIENTE:', margin, y);
  
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.primary);
  doc.text(creditNote.customer_name, margin, y + 7);
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.text);
  let customerY = y + 14;
  
  if (creditNote.customer_nif) {
    doc.text(`NIF: ${creditNote.customer_nif}`, margin, customerY);
    customerY += 5;
  }
  
  if (creditNote.customer_address) {
    const addr = creditNote.customer_address;
    if (addr.address_line1) {
      doc.text(addr.address_line1, margin, customerY);
      customerY += 5;
    }
    if (addr.postal_code || addr.city) {
      doc.text(`${addr.postal_code || ''} ${addr.city || ''}`.trim(), margin, customerY);
    }
  }

  // Datos del vendedor
  const rightCol = pageWidth / 2 + 10;
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.gold);
  doc.setFont('helvetica', 'bold');
  doc.text('DATOS DEL VENDEDOR:', rightCol, y);
  
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.primary);
  doc.text(creditNote.company_name, rightCol, y + 7);
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.text);
  doc.text(`NIF: ${creditNote.company_nif}`, rightCol, y + 14);

  // ─── TABLA DE ITEMS ────────────────────────────────────────────────────────
  
  y = 125;
  
  const tableBody = creditNote.items.map(item => {
    let desc = item.name;
    if (item.size) desc += ` - Talla: ${item.size}`;
    if (item.color) desc += ` - Color: ${item.color}`;
    
    return [
      desc,
      item.quantity.toString(),
      `${(item.unit_price / 100).toFixed(2)}€`,
      `-${(item.total / 100).toFixed(2)}€` // Negativo en nota de crédito
    ];
  });

  doc.autoTable({
    startY: y,
    head: [['Descripción', 'Cant.', 'Precio unit.', 'Importe']],
    body: tableBody,
    theme: 'plain',
    headStyles: {
      fillColor: COLORS.red,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    columnStyles: {
      0: { cellWidth: 90 },
      1: { halign: 'center', cellWidth: 20 },
      2: { halign: 'right', cellWidth: 30 },
      3: { halign: 'right', cellWidth: 30 },
    },
    styles: {
      fontSize: 9,
      cellPadding: 5,
    },
    alternateRowStyles: {
      fillColor: [254, 242, 242], // Rojo muy claro
    },
    margin: { left: margin, right: margin },
  });

  // ─── TOTALES ───────────────────────────────────────────────────────────────
  
  y = doc.lastAutoTable.finalY + 10;
  
  const totalsX = pageWidth - margin - 80;
  const valuesX = pageWidth - margin;
  
  // Subtotal
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.text);
  doc.text('Subtotal', totalsX, y);
  doc.setTextColor(...COLORS.red);
  doc.text(`-${(creditNote.subtotal / 100).toFixed(2)}€`, valuesX, y, { align: 'right' });
  
  // IVA
  y += 7;
  doc.setTextColor(...COLORS.text);
  doc.text(`IVA (${creditNote.tax_rate}%)`, totalsX, y);
  doc.setTextColor(...COLORS.red);
  doc.text(`-${(creditNote.tax_amount / 100).toFixed(2)}€`, valuesX, y, { align: 'right' });
  
  // Línea separadora
  y += 5;
  doc.setDrawColor(...COLORS.red);
  doc.line(totalsX - 5, y, pageWidth - margin, y);
  
  // Total a devolver
  y += 8;
  doc.setFontSize(14);
  doc.setTextColor(...COLORS.red);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL A DEVOLVER', totalsX - 20, y);
  doc.text(`-${(creditNote.total / 100).toFixed(2)}€`, valuesX, y, { align: 'right' });

  // ─── FOOTER ────────────────────────────────────────────────────────────────
  
  const footerY = doc.internal.pageSize.getHeight() - 30;
  
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, footerY - 10, pageWidth - margin, footerY - 10);
  
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.text);
  doc.setFont('helvetica', 'normal');
  doc.text(`${creditNote.company_name} - ${creditNote.company_address}`, pageWidth / 2, footerY, { align: 'center' });
  doc.text(`NIF: ${creditNote.company_nif} | Email: info@fashionmarket.es`, pageWidth / 2, footerY + 5, { align: 'center' });
  doc.text('Este documento rectifica la factura indicada y sirve como justificante de devolución.', pageWidth / 2, footerY + 12, { align: 'center' });

  // Retornar como Buffer
  return Buffer.from(doc.output('arraybuffer'));
}

/**
 * Genera un PDF de factura directamente con los datos proporcionados
 * Útil para generar el PDF antes de guardar en la BD
 */
export function generateInvoicePDFDirect(data: {
  invoiceNumber: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerAddress?: {
    address_line1?: string;
    address_line2?: string;
    city?: string;
    postal_code?: string;
    province?: string;
    country?: string;
  };
  items: Array<{
    name: string;
    quantity: number;
    unit_price: number;
    size?: string | null;
    color?: string | null;
  }>;
  subtotal: number;
  shippingCost: number;
  codExtraCost?: number;
  discount?: number;
  taxRate?: number;
  total: number;
  paymentMethod: string;
  status: string;
}): Buffer {
  // Calcular tax amount
  const baseImponible = Math.round(data.total / 1.21);
  const taxAmount = data.total - baseImponible;
  
  // Convertir items al formato esperado
  const invoiceItems: InvoiceItem[] = data.items.map(item => ({
    name: item.name,
    quantity: item.quantity,
    unit_price: item.unit_price,
    total: item.unit_price * item.quantity,
    size: item.size || undefined,
    color: item.color || undefined,
  }));

  // Agregar línea de envío si hay costo
  if (data.shippingCost > 0) {
    invoiceItems.push({
      name: 'Gastos de envío',
      quantity: 1,
      unit_price: data.shippingCost,
      total: data.shippingCost,
    });
  }

  // Agregar cargo por contrareembolso si aplica
  if (data.codExtraCost && data.codExtraCost > 0) {
    invoiceItems.push({
      name: 'Cargo por contrareembolso',
      quantity: 1,
      unit_price: data.codExtraCost,
      total: data.codExtraCost,
    });
  }

  return generateInvoicePDF({
    invoice_number: data.invoiceNumber,
    issue_date: new Date().toISOString(),
    customer_name: data.customerName,
    customer_email: data.customerEmail,
    customer_address: data.customerAddress,
    items: invoiceItems,
    subtotal: data.subtotal + (data.shippingCost || 0) + (data.codExtraCost || 0),
    tax_rate: data.taxRate || 21,
    tax_amount: taxAmount,
    total: data.total,
    discount_amount: data.discount,
    company_name: 'FashionMarket S.L.',
    company_nif: 'B12345678',
    company_address: 'Calle Moda 123, 28001 Madrid, España',
    status: data.status,
  });
}

/**
 * Obtiene los datos de factura desde Supabase y genera el PDF
 */
export async function generateInvoicePDFFromDB(
  supabase: any,
  invoiceId: string
): Promise<{ pdf: Buffer; filename: string; invoice: any } | null> {
  const { data: invoice, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', invoiceId)
    .single();

  if (error || !invoice) {
    console.error('Error fetching invoice:', error);
    return null;
  }

  const pdf = generateInvoicePDF({
    invoice_number: invoice.invoice_number,
    issue_date: invoice.issue_date,
    customer_name: invoice.customer_name,
    customer_email: invoice.customer_email,
    customer_nif: invoice.customer_nif,
    customer_address: invoice.customer_address,
    items: invoice.items || [],
    subtotal: invoice.subtotal,
    tax_rate: invoice.tax_rate || 21,
    tax_amount: invoice.tax_amount,
    total: invoice.total,
    discount_amount: invoice.discount_amount,
    company_name: invoice.company_name || 'FashionMarket S.L.',
    company_nif: invoice.company_nif || 'B12345678',
    company_address: invoice.company_address || 'Calle Ejemplo 123, 28001 Madrid',
    status: invoice.status,
    paid_date: invoice.paid_date,
  });

  return {
    pdf,
    filename: `factura-${invoice.invoice_number}.pdf`,
    invoice,
  };
}

/**
 * Obtiene los datos de nota de crédito desde Supabase y genera el PDF
 */
export async function generateCreditNotePDFFromDB(
  supabase: any,
  creditNoteId: string
): Promise<{ pdf: Buffer; filename: string; creditNote: any } | null> {
  const { data: creditNote, error } = await supabase
    .from('credit_notes')
    .select('*, invoices!credit_notes_original_invoice_id_fkey(invoice_number)')
    .eq('id', creditNoteId)
    .single();

  if (error || !creditNote) {
    console.error('Error fetching credit note:', error);
    return null;
  }

  const pdf = generateCreditNotePDF({
    credit_note_number: creditNote.credit_note_number,
    issue_date: creditNote.issue_date,
    original_invoice_number: creditNote.invoices?.invoice_number || 'N/A',
    customer_name: creditNote.customer_name,
    customer_email: creditNote.customer_email,
    customer_nif: creditNote.customer_nif,
    customer_address: creditNote.customer_address,
    items: creditNote.items || [],
    subtotal: Math.abs(creditNote.subtotal),
    tax_rate: creditNote.tax_rate || 21,
    tax_amount: Math.abs(creditNote.tax_amount),
    total: Math.abs(creditNote.total),
    reason: creditNote.reason || 'Cancelación de pedido',
    refund_method: creditNote.refund_method || 'Devolución a tarjeta',
    company_name: creditNote.company_name || 'FashionMarket S.L.',
    company_nif: creditNote.company_nif || 'B12345678',
    company_address: creditNote.company_address || 'Calle Ejemplo 123, 28001 Madrid',
  });

  return {
    pdf,
    filename: `nota-credito-${creditNote.credit_note_number}.pdf`,
    creditNote,
  };
}
