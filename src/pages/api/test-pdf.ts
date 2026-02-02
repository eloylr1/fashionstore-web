/**
 * API de prueba para verificar que el PDF se genera correctamente
 */

import type { APIRoute } from 'astro';
import { generateInvoicePDF } from '../../lib/pdf/invoiceGenerator';

export const GET: APIRoute = async () => {
  try {
    console.log('🧪 Iniciando prueba de generación de PDF...');
    
    const pdfBuffer = generateInvoicePDF({
      invoice_number: 'FM-2026-TEST001',
      issue_date: new Date().toISOString(),
      customer_name: 'Cliente de Prueba',
      customer_email: 'test@test.com',
      customer_address: {
        address_line1: 'Calle Test 123',
        city: 'Madrid',
        postal_code: '28001',
        province: 'Madrid',
        country: 'España',
      },
      items: [
        {
          name: 'Producto de prueba',
          quantity: 2,
          unit_price: 1999,
          total: 3998,
          size: 'M',
        },
      ],
      subtotal: 3998,
      tax_rate: 21,
      tax_amount: 694,
      total: 3998,
      company_name: 'FashionMarket S.L.',
      company_nif: 'B12345678',
      company_address: 'Calle Moda 123, 28001 Madrid, España',
      status: 'paid',
    });

    console.log('✅ PDF generado, tamaño:', pdfBuffer.length, 'bytes');

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="test-factura.pdf"',
      },
    });
  } catch (error: any) {
    console.error('❌ Error generando PDF:', error.message);
    console.error('❌ Stack:', error.stack);
    
    return new Response(JSON.stringify({
      error: error.message,
      stack: error.stack,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
