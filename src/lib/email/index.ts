/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SERVICIO DE EMAIL - Gmail con Nodemailer
 * Envío de emails transaccionales (facturas, confirmación de pedidos, etc.)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import nodemailer from 'nodemailer';

/**
 * Crea el transportador de email con Gmail
 */
function createTransporter() {
  const gmailUser = import.meta.env.GMAIL_USER;
  const gmailPass = import.meta.env.GMAIL_APP_PASSWORD;

  if (!gmailUser || !gmailPass) {
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

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType?: string;
  }>;
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Envía un email usando Gmail
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  const gmailUser = import.meta.env.GMAIL_USER;
  const gmailPass = import.meta.env.GMAIL_APP_PASSWORD;

  if (!gmailUser || !gmailPass) {
    console.warn('⚠️ Credenciales de Gmail no configuradas. Email no enviado.');
    console.warn('   Configura GMAIL_USER y GMAIL_APP_PASSWORD en tu .env');
    return { success: false, error: 'Credenciales de Gmail no configuradas' };
  }

  try {
    const transporter = createTransporter();
    if (!transporter) {
      return { success: false, error: 'No se pudo crear el transportador' };
    }

    const info = await transporter.sendMail({
      from: `"FashionMarket" <${gmailUser}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments?.map(att => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType || 'application/pdf',
      })),
    });

    console.log('📧 Email enviado:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error('❌ Error enviando email:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Formatea precio de céntimos a string con €
 */
function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString('es-ES', {
    style: 'currency',
    currency: 'EUR'
  });
}

interface OrderData {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    size?: string;
    color?: string;
  }>;
  subtotal: number;
  shippingCost: number;
  codExtraCost?: number; // Costo adicional por contrareembolso
  discount?: number;
  tax: number;
  total: number;
  shippingAddress: {
    full_name?: string;
    address_line1?: string;
    address?: string;
    address_line2?: string;
    city?: string;
    province?: string;
    postal_code?: string;
    country?: string;
  };
  shippingMethod?: 'standard' | 'express';
  estimatedDeliveryDays?: number;
  paymentMethod?: string; // 'card', 'transfer', 'cash_on_delivery'
  invoiceNumber: string;
  invoiceUrl: string;
  // PDF de factura adjunto (opcional)
  invoicePdf?: {
    buffer: Buffer;
    filename: string;
  };
  // Datos bancarios para transferencia
  bankDetails?: {
    bank: string;
    iban: string;
    beneficiary: string;
    reference: string;
  };
}

/**
 * Envía email de confirmación de pedido con factura profesional
 */
export async function sendOrderConfirmationEmail(data: OrderData): Promise<EmailResult> {
  // Determinar texto del método de pago
  const paymentMethodText: Record<string, string> = {
    'card': 'Tarjeta de crédito/débito',
    'transfer': 'Transferencia bancaria',
    'cash_on_delivery': 'Contrareembolso',
  };
  
  const paymentLabel = paymentMethodText[data.paymentMethod || 'card'] || 'Tarjeta';
  
  // Determinar método de envío
  const shippingMethodText = data.shippingMethod === 'express' ? 'Express (24-48h)' : 'Estándar (3-5 días)';
  const deliveryDays = data.estimatedDeliveryDays || (data.shippingMethod === 'express' ? 2 : 5);
  
  // Fecha actual formateada
  const invoiceDate = new Date().toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  
  // Fecha estimada de entrega
  const deliveryDate = new Date();
  deliveryDate.setDate(deliveryDate.getDate() + deliveryDays);
  const estimatedDelivery = deliveryDate.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });

  // Calcular base imponible e IVA
  const baseImponible = Math.round(data.total / 1.21);
  const ivaAmount = data.total - baseImponible;
  
  const itemsHtml = data.items.map(item => `
    <tr>
      <td style="padding: 16px 12px; border-bottom: 1px solid #e5e7eb; vertical-align: top;">
        <div style="display: flex; align-items: flex-start; gap: 12px;">
          <div>
            <p style="margin: 0; font-weight: 600; color: #1e3a5f; font-size: 14px;">${item.name}</p>
            ${item.size ? `<p style="margin: 4px 0 0; color: #6b7280; font-size: 13px;">Talla: ${item.size}</p>` : ''}
            ${item.color ? `<p style="margin: 2px 0 0; color: #6b7280; font-size: 13px;">Color: ${item.color}</p>` : ''}
          </div>
        </div>
      </td>
      <td style="padding: 16px 12px; border-bottom: 1px solid #e5e7eb; text-align: center; color: #374151; font-size: 14px; vertical-align: top;">
        ${item.quantity}
      </td>
      <td style="padding: 16px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #374151; font-size: 14px; vertical-align: top;">
        ${formatPrice(item.price)}
      </td>
      <td style="padding: 16px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #1e3a5f; font-weight: 600; font-size: 14px; vertical-align: top;">
        ${formatPrice(item.price * item.quantity)}
      </td>
    </tr>
  `).join('');

  const trackingUrl = `https://eloyfashionstore.victoriafp.online/seguimiento?order=${data.orderNumber}`;

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Factura ${data.invoiceNumber} - FashionMarket</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6; -webkit-font-smoothing: antialiased;">
  <div style="max-width: 680px; margin: 0 auto; padding: 32px 16px;">
    
    <!-- Factura Principal -->
    <div style="background: white; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); overflow: hidden;">
      
      <!-- Cabecera de Factura -->
      <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a8f 100%); padding: 40px; position: relative;">
        <table style="width: 100%;">
          <tr>
            <td style="vertical-align: top;">
              <h1 style="color: white; font-size: 28px; margin: 0; font-weight: 700;">Fashion<span style="color: #c9a227;">Market</span></h1>
              <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px;">Moda masculina con estilo</p>
            </td>
            <td style="vertical-align: top; text-align: right;">
              <div style="background: rgba(255,255,255,0.15); border-radius: 8px; padding: 16px; display: inline-block;">
                <p style="color: rgba(255,255,255,0.7); font-size: 12px; margin: 0; text-transform: uppercase; letter-spacing: 1px;">Factura</p>
                <p style="color: white; font-size: 20px; margin: 4px 0 0; font-weight: 700;">${data.invoiceNumber}</p>
              </div>
            </td>
          </tr>
        </table>
        
        <!-- Sello de confirmación -->
        <div style="position: absolute; top: 20px; right: 20px; width: 80px; height: 80px; border: 3px solid rgba(34,197,94,0.6); border-radius: 50%; display: flex; align-items: center; justify-content: center; transform: rotate(12deg);">
          <span style="color: #22c55e; font-size: 12px; font-weight: 700; text-transform: uppercase; text-align: center; line-height: 1.2;">PEDIDO<br>CONFIRMADO</span>
        </div>
      </div>

      <!-- Información del pedido -->
      <div style="padding: 32px 40px; background: #f8fafc; border-bottom: 1px solid #e5e7eb;">
        <table style="width: 100%;">
          <tr>
            <td style="width: 50%; vertical-align: top; padding-right: 20px;">
              <p style="color: #6b7280; font-size: 12px; margin: 0; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Datos del cliente</p>
              <p style="color: #1e3a5f; font-size: 16px; margin: 8px 0 4px; font-weight: 600;">${data.customerName}</p>
              <p style="color: #4b5563; font-size: 14px; margin: 0; line-height: 1.5;">${data.customerEmail}</p>
            </td>
            <td style="width: 50%; vertical-align: top; text-align: right;">
              <table style="display: inline-block; text-align: left;">
                <tr>
                  <td style="color: #6b7280; font-size: 13px; padding: 3px 12px 3px 0;">Nº Pedido:</td>
                  <td style="color: #1e3a5f; font-size: 13px; font-weight: 600;">${data.orderNumber}</td>
                </tr>
                <tr>
                  <td style="color: #6b7280; font-size: 13px; padding: 3px 12px 3px 0;">Fecha:</td>
                  <td style="color: #1e3a5f; font-size: 13px; font-weight: 500;">${invoiceDate}</td>
                </tr>
                <tr>
                  <td style="color: #6b7280; font-size: 13px; padding: 3px 12px 3px 0;">Método de pago:</td>
                  <td style="color: #1e3a5f; font-size: 13px; font-weight: 500;">${paymentLabel}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>

      <!-- Dirección de envío -->
      <div style="padding: 24px 40px; border-bottom: 1px solid #e5e7eb;">
        <table style="width: 100%;">
          <tr>
            <td style="width: 50%; vertical-align: top;">
              <p style="color: #6b7280; font-size: 12px; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">
                📦 Dirección de envío
              </p>
              <p style="color: #1e3a5f; font-size: 14px; margin: 0; line-height: 1.6;">
                ${data.shippingAddress.full_name || data.customerName}<br>
                ${data.shippingAddress.address_line1 || data.shippingAddress.address || ''}<br>
                ${data.shippingAddress.address_line2 ? data.shippingAddress.address_line2 + '<br>' : ''}
                ${data.shippingAddress.postal_code || ''} ${data.shippingAddress.city || ''}<br>
                ${data.shippingAddress.province ? data.shippingAddress.province + ', ' : ''}España
              </p>
            </td>
            <td style="width: 50%; vertical-align: top; text-align: right;">
              <p style="color: #6b7280; font-size: 12px; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">
                🚚 Método de envío
              </p>
              <p style="color: #1e3a5f; font-size: 14px; margin: 0; font-weight: 600;">${shippingMethodText}</p>
              <p style="color: #059669; font-size: 13px; margin: 4px 0 0;">
                Entrega estimada: ${estimatedDelivery}
              </p>
            </td>
          </tr>
        </table>
      </div>

      <!-- Tabla de productos -->
      <div style="padding: 32px 40px;">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #f8fafc;">
              <th style="padding: 14px 12px; text-align: left; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e5e7eb;">Producto</th>
              <th style="padding: 14px 12px; text-align: center; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e5e7eb;">Cant.</th>
              <th style="padding: 14px 12px; text-align: right; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e5e7eb;">Precio</th>
              <th style="padding: 14px 12px; text-align: right; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e5e7eb;">Importe</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <!-- Resumen de totales -->
        <div style="margin-top: 24px; padding: 24px; background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-radius: 12px; border: 1px solid #e2e8f0;">
          <table style="width: 100%;">
            <tr>
              <td style="color: #6b7280; font-size: 14px; padding: 6px 0;">Subtotal</td>
              <td style="text-align: right; color: #374151; font-size: 14px; padding: 6px 0;">${formatPrice(data.subtotal)}</td>
            </tr>
            ${data.discount && data.discount > 0 ? `
            <tr>
              <td style="color: #059669; font-size: 14px; padding: 6px 0;">
                <span style="background: #d1fae5; padding: 2px 8px; border-radius: 4px; font-size: 12px;">Descuento aplicado</span>
              </td>
              <td style="text-align: right; color: #059669; font-size: 14px; font-weight: 600; padding: 6px 0;">-${formatPrice(data.discount)}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="color: #6b7280; font-size: 14px; padding: 6px 0;">Envío (${shippingMethodText})</td>
              <td style="text-align: right; color: ${data.shippingCost === 0 ? '#059669' : '#374151'}; font-size: 14px; padding: 6px 0;">
                ${data.shippingCost === 0 ? '<span style="background: #d1fae5; padding: 2px 8px; border-radius: 4px; font-size: 12px;">GRATIS</span>' : formatPrice(data.shippingCost)}
              </td>
            </tr>
            ${data.codExtraCost && data.codExtraCost > 0 ? `
            <tr>
              <td style="color: #6b7280; font-size: 14px; padding: 6px 0;">Cargo por contrareembolso</td>
              <td style="text-align: right; color: #374151; font-size: 14px; padding: 6px 0;">${formatPrice(data.codExtraCost)}</td>
            </tr>
            ` : ''}
            <tr>
              <td colspan="2" style="padding: 12px 0 8px;">
                <div style="border-top: 2px solid #cbd5e1;"></div>
              </td>
            </tr>
            <tr>
              <td style="color: #6b7280; font-size: 13px; padding: 4px 0;">Base imponible</td>
              <td style="text-align: right; color: #374151; font-size: 13px; padding: 4px 0;">${formatPrice(baseImponible)}</td>
            </tr>
            <tr>
              <td style="color: #6b7280; font-size: 13px; padding: 4px 0;">IVA (21%)</td>
              <td style="text-align: right; color: #374151; font-size: 13px; padding: 4px 0;">${formatPrice(ivaAmount)}</td>
            </tr>
            <tr>
              <td style="color: #1e3a5f; font-size: 20px; font-weight: 700; padding: 16px 0 0;">TOTAL</td>
              <td style="text-align: right; color: #1e3a5f; font-size: 24px; font-weight: 700; padding: 16px 0 0;">${formatPrice(data.total)}</td>
            </tr>
          </table>
        </div>
      </div>

      ${data.paymentMethod === 'cash_on_delivery' ? `
      <!-- Aviso contrareembolso -->
      <div style="margin: 0 40px 32px; padding: 20px; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; border-left: 4px solid #f59e0b;">
        <table style="width: 100%;">
          <tr>
            <td style="width: 50px; vertical-align: top;">
              <span style="font-size: 32px;">💵</span>
            </td>
            <td>
              <h4 style="margin: 0 0 8px; color: #92400e; font-size: 16px;">Pago a la entrega</h4>
              <p style="margin: 0; color: #a16207; font-size: 14px; line-height: 1.5;">
                Deberás abonar <strong>${formatPrice(data.total)}</strong> al repartidor cuando recibas tu pedido.
                Ten preparado el importe exacto en efectivo.
              </p>
            </td>
          </tr>
        </table>
      </div>
      ` : ''}

      ${data.paymentMethod === 'transfer' && data.bankDetails ? `
      <!-- Datos bancarios para transferencia -->
      <div style="margin: 0 40px 32px; padding: 24px; background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border-radius: 12px; border-left: 4px solid #3b82f6;">
        <h4 style="margin: 0 0 16px; color: #1e40af; font-size: 16px;">🏦 Datos para la transferencia</h4>
        <table style="width: 100%;">
          <tr>
            <td style="color: #6b7280; padding: 8px 0; font-size: 14px; width: 120px;">Banco:</td>
            <td style="color: #1e40af; font-weight: 600; font-size: 14px;">${data.bankDetails.bank}</td>
          </tr>
          <tr>
            <td style="color: #6b7280; padding: 8px 0; font-size: 14px;">Beneficiario:</td>
            <td style="color: #1e40af; font-weight: 600; font-size: 14px;">${data.bankDetails.beneficiary}</td>
          </tr>
          <tr>
            <td style="color: #6b7280; padding: 8px 0; font-size: 14px;">IBAN:</td>
            <td style="color: #1e40af; font-weight: 700; font-size: 15px; letter-spacing: 1px; font-family: monospace;">${data.bankDetails.iban}</td>
          </tr>
          <tr>
            <td style="color: #6b7280; padding: 8px 0; font-size: 14px;">Concepto:</td>
            <td style="color: #1e40af; font-weight: 700; font-size: 15px;">${data.bankDetails.reference}</td>
          </tr>
        </table>
        <p style="margin: 16px 0 0; color: #1e40af; font-size: 13px; font-style: italic; padding-top: 12px; border-top: 1px solid rgba(59,130,246,0.3);">
          ⚠️ Incluye el número de pedido como concepto. Tu pedido se procesará una vez confirmemos la transferencia.
        </p>
      </div>
      ` : ''}

      <!-- Botón de seguimiento -->
      <div style="padding: 0 40px 40px; text-align: center;">
        <a href="${trackingUrl}" 
           style="display: inline-block; background: linear-gradient(135deg, #1e3a5f 0%, #2d5a8f 100%); color: white; text-decoration: none; padding: 18px 48px; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(30,58,95,0.3); transition: transform 0.2s;">
          📦 Ver Seguimiento del Pedido
        </a>
        <p style="margin: 16px 0 0; color: #6b7280; font-size: 13px;">
          Recibirás actualizaciones por email cuando tu pedido sea enviado
        </p>
      </div>

    </div>

    <!-- Información legal y contacto -->
    <div style="margin-top: 24px; padding: 24px; background: white; border-radius: 12px; text-align: center;">
      <p style="color: #6b7280; font-size: 13px; margin: 0 0 12px; line-height: 1.5;">
        ¿Tienes alguna pregunta sobre tu pedido?<br>
        Responde directamente a este email o contáctanos en <a href="mailto:soporte@fashionmarket.es" style="color: #1e3a5f; text-decoration: none;">soporte@fashionmarket.es</a>
      </p>
      <div style="border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 16px;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">
          FashionMarket S.L. · CIF: B12345678 · C/ Moda, 123 · 28001 Madrid<br>
          © ${new Date().getFullYear()} FashionMarket. Todos los derechos reservados.
        </p>
      </div>
    </div>

  </div>
</body>
</html>
  `;

  // Preparar adjuntos si hay PDF de factura
  const attachments = data.invoicePdf ? [{
    filename: data.invoicePdf.filename,
    content: data.invoicePdf.buffer,
    contentType: 'application/pdf',
  }] : undefined;

  return sendEmail({
    to: data.customerEmail,
    subject: `📦 Factura ${data.invoiceNumber} - Pedido ${data.orderNumber} confirmado`,
    html,
    attachments,
  });
}

/**
 * Envía email de actualización de estado del pedido
 */
export async function sendOrderStatusEmail(
  email: string,
  customerName: string,
  orderNumber: string,
  newStatus: string,
  trackingNumber?: string
): Promise<EmailResult> {
  const statusInfo: Record<string, { icon: string; title: string; message: string }> = {
    processing: {
      icon: '📦',
      title: 'Tu pedido está siendo preparado',
      message: 'Estamos preparando tu pedido con mucho cuidado. Te avisaremos cuando se envíe.'
    },
    shipped: {
      icon: '🚚',
      title: '¡Tu pedido ha sido enviado!',
      message: 'Tu pedido ya está en camino. Puedes seguir el envío con el número de seguimiento.'
    },
    delivered: {
      icon: '✅',
      title: '¡Pedido entregado!',
      message: 'Tu pedido ha sido entregado. Esperamos que disfrutes tu compra.'
    },
    cancelled: {
      icon: '❌',
      title: 'Pedido cancelado',
      message: 'Tu pedido ha sido cancelado. Si tienes dudas, contacta con nosotros.'
    },
    refunded: {
      icon: '💰',
      title: 'Reembolso procesado',
      message: 'Hemos procesado el reembolso de tu pedido. Puede tardar 5-10 días en aparecer en tu cuenta.'
    }
  };

  const info = statusInfo[newStatus] || {
    icon: '📋',
    title: 'Actualización de pedido',
    message: 'El estado de tu pedido ha cambiado.'
  };

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="font-size: 28px; font-weight: 600; color: #1e3a5f; margin: 0;">FashionMarket</h1>
    </div>

    <div style="background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); padding: 32px; text-align: center;">
      <div style="font-size: 48px; margin-bottom: 16px;">${info.icon}</div>
      <h2 style="color: #1e3a5f; font-size: 24px; margin: 0 0 8px;">${info.title}</h2>
      <p style="color: #6b7280; margin: 0 0 24px;">Pedido: <strong>${orderNumber}</strong></p>
      <p style="color: #374151; font-size: 16px; line-height: 1.6;">${info.message}</p>
      
      ${trackingNumber ? `
      <div style="background: #f0f9ff; border-radius: 8px; padding: 16px; margin-top: 24px;">
        <p style="color: #0369a1; font-size: 14px; margin: 0 0 4px;">Número de seguimiento</p>
        <p style="color: #1e3a5f; font-size: 18px; font-weight: 600; font-family: monospace; margin: 0;">${trackingNumber}</p>
      </div>
      ` : ''}
    </div>

    <div style="text-align: center; margin-top: 32px; color: #9ca3af; font-size: 14px;">
      <p>© 2025 FashionMarket. Todos los derechos reservados.</p>
    </div>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: email,
    subject: `${info.title} - Pedido ${orderNumber}`,
    html,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL DE CANCELACIÓN DE PEDIDO - FACTURA DE ANULACIÓN
// ─────────────────────────────────────────────────────────────────────────────

interface CancelOrderEmailData {
  orderNumber: string;
  invoiceNumber?: string;
  customerName: string;
  customerEmail: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    size?: string;
    color?: string;
  }>;
  subtotal?: number;
  shippingCost?: number;
  total: number;
  cancellationDate: string;
  reason?: string;
  refundMethod?: string;
  shippingAddress?: {
    full_name?: string;
    address?: string;
    postal_code?: string;
    city?: string;
    province?: string;
  };
}

/**
 * Envía email de confirmación de cancelación con factura de anulación profesional
 */
export async function sendOrderCancellationEmail(data: CancelOrderEmailData): Promise<EmailResult> {
  const formattedDate = new Date(data.cancellationDate).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const cancellationNumber = `ANU-${data.orderNumber.replace('FM-', '')}`;
  
  // Calcular base imponible e IVA
  const baseImponible = Math.round(data.total / 1.21);
  const ivaAmount = data.total - baseImponible;

  const itemsHtml = data.items.map(item => `
    <tr>
      <td style="padding: 14px 12px; border-bottom: 1px solid #fecaca; vertical-align: top;">
        <p style="margin: 0; font-weight: 600; color: #991b1b; font-size: 14px; text-decoration: line-through;">${item.name}</p>
        ${item.size ? `<p style="margin: 4px 0 0; color: #9ca3af; font-size: 13px;">Talla: ${item.size}</p>` : ''}
        ${item.color ? `<p style="margin: 2px 0 0; color: #9ca3af; font-size: 13px;">Color: ${item.color}</p>` : ''}
      </td>
      <td style="padding: 14px 12px; border-bottom: 1px solid #fecaca; text-align: center; color: #991b1b; font-size: 14px; vertical-align: top;">
        ${item.quantity}
      </td>
      <td style="padding: 14px 12px; border-bottom: 1px solid #fecaca; text-align: right; color: #991b1b; font-size: 14px; vertical-align: top;">
        ${formatPrice(item.price)}
      </td>
      <td style="padding: 14px 12px; border-bottom: 1px solid #fecaca; text-align: right; color: #991b1b; font-weight: 600; font-size: 14px; vertical-align: top;">
        -${formatPrice(item.price * item.quantity)}
      </td>
    </tr>
  `).join('');

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Factura de Anulación ${cancellationNumber} - FashionMarket</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #fef2f2; -webkit-font-smoothing: antialiased;">
  <div style="max-width: 680px; margin: 0 auto; padding: 32px 16px;">
    
    <!-- Documento de Anulación -->
    <div style="background: white; border-radius: 12px; box-shadow: 0 4px 24px rgba(153,27,27,0.12); overflow: hidden; border: 2px solid #fecaca;">
      
      <!-- Cabecera -->
      <div style="background: linear-gradient(135deg, #991b1b 0%, #b91c1c 100%); padding: 40px; position: relative;">
        <table style="width: 100%;">
          <tr>
            <td style="vertical-align: top;">
              <h1 style="color: white; font-size: 28px; margin: 0; font-weight: 700;">Fashion<span style="color: #fca5a5;">Market</span></h1>
              <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px;">Documento de Anulación</p>
            </td>
            <td style="vertical-align: top; text-align: right;">
              <div style="background: rgba(255,255,255,0.15); border-radius: 8px; padding: 16px; display: inline-block;">
                <p style="color: rgba(255,255,255,0.7); font-size: 12px; margin: 0; text-transform: uppercase; letter-spacing: 1px;">Nº Anulación</p>
                <p style="color: white; font-size: 18px; margin: 4px 0 0; font-weight: 700;">${cancellationNumber}</p>
              </div>
            </td>
          </tr>
        </table>
        
        <!-- Sello de cancelado -->
        <div style="position: absolute; top: 15px; right: 15px; width: 90px; height: 90px; border: 4px solid rgba(254,202,202,0.5); border-radius: 50%; display: flex; align-items: center; justify-content: center; transform: rotate(-15deg);">
          <span style="color: #fecaca; font-size: 14px; font-weight: 800; text-transform: uppercase; text-align: center; line-height: 1.1;">PEDIDO<br>ANULADO</span>
        </div>
      </div>

      <!-- Información del documento -->
      <div style="padding: 28px 40px; background: #fef2f2; border-bottom: 1px solid #fecaca;">
        <table style="width: 100%;">
          <tr>
            <td style="width: 50%; vertical-align: top; padding-right: 20px;">
              <p style="color: #991b1b; font-size: 12px; margin: 0; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Cliente</p>
              <p style="color: #1e3a5f; font-size: 16px; margin: 8px 0 4px; font-weight: 600;">${data.customerName}</p>
              <p style="color: #4b5563; font-size: 14px; margin: 0; line-height: 1.5;">${data.customerEmail}</p>
            </td>
            <td style="width: 50%; vertical-align: top; text-align: right;">
              <table style="display: inline-block; text-align: left;">
                <tr>
                  <td style="color: #6b7280; font-size: 13px; padding: 3px 12px 3px 0;">Pedido original:</td>
                  <td style="color: #991b1b; font-size: 13px; font-weight: 600; text-decoration: line-through;">${data.orderNumber}</td>
                </tr>
                ${data.invoiceNumber ? `
                <tr>
                  <td style="color: #6b7280; font-size: 13px; padding: 3px 12px 3px 0;">Factura original:</td>
                  <td style="color: #991b1b; font-size: 13px; font-weight: 500; text-decoration: line-through;">${data.invoiceNumber}</td>
                </tr>
                ` : ''}
                <tr>
                  <td style="color: #6b7280; font-size: 13px; padding: 3px 12px 3px 0;">Fecha anulación:</td>
                  <td style="color: #1e3a5f; font-size: 13px; font-weight: 500;">${formattedDate}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>

      <!-- Motivo de la cancelación -->
      ${data.reason ? `
      <div style="padding: 20px 40px; background: #fff7ed; border-bottom: 1px solid #fed7aa;">
        <table style="width: 100%;">
          <tr>
            <td style="width: 40px; vertical-align: top;">
              <span style="font-size: 24px;">📝</span>
            </td>
            <td>
              <p style="color: #9a3412; font-size: 12px; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Motivo de la cancelación</p>
              <p style="color: #c2410c; font-size: 14px; margin: 0; line-height: 1.5;">${data.reason}</p>
            </td>
          </tr>
        </table>
      </div>
      ` : ''}

      <!-- Tabla de productos anulados -->
      <div style="padding: 32px 40px;">
        <h3 style="color: #991b1b; font-size: 14px; margin: 0 0 16px; text-transform: uppercase; letter-spacing: 1px; display: flex; align-items: center; gap: 8px;">
          <span style="width: 24px; height: 24px; background: #fee2e2; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 12px;">✕</span>
          Artículos Anulados
        </h3>
        
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #fef2f2;">
              <th style="padding: 14px 12px; text-align: left; color: #991b1b; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #fecaca;">Producto</th>
              <th style="padding: 14px 12px; text-align: center; color: #991b1b; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #fecaca;">Cant.</th>
              <th style="padding: 14px 12px; text-align: right; color: #991b1b; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #fecaca;">Precio</th>
              <th style="padding: 14px 12px; text-align: right; color: #991b1b; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #fecaca;">Reembolso</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <!-- Resumen de reembolso -->
        <div style="margin-top: 24px; padding: 24px; background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border-radius: 12px; border: 2px solid #fecaca;">
          <table style="width: 100%;">
            ${data.subtotal ? `
            <tr>
              <td style="color: #6b7280; font-size: 14px; padding: 6px 0;">Subtotal productos</td>
              <td style="text-align: right; color: #991b1b; font-size: 14px; padding: 6px 0;">-${formatPrice(data.subtotal)}</td>
            </tr>
            ` : ''}
            ${data.shippingCost && data.shippingCost > 0 ? `
            <tr>
              <td style="color: #6b7280; font-size: 14px; padding: 6px 0;">Gastos de envío</td>
              <td style="text-align: right; color: #991b1b; font-size: 14px; padding: 6px 0;">-${formatPrice(data.shippingCost)}</td>
            </tr>
            ` : ''}
            <tr>
              <td colspan="2" style="padding: 12px 0 8px;">
                <div style="border-top: 2px dashed #fca5a5;"></div>
              </td>
            </tr>
            <tr>
              <td style="color: #6b7280; font-size: 13px; padding: 4px 0;">Base imponible</td>
              <td style="text-align: right; color: #991b1b; font-size: 13px; padding: 4px 0;">-${formatPrice(baseImponible)}</td>
            </tr>
            <tr>
              <td style="color: #6b7280; font-size: 13px; padding: 4px 0;">IVA (21%)</td>
              <td style="text-align: right; color: #991b1b; font-size: 13px; padding: 4px 0;">-${formatPrice(ivaAmount)}</td>
            </tr>
            <tr>
              <td colspan="2" style="padding: 12px 0 8px;">
                <div style="border-top: 2px solid #dc2626;"></div>
              </td>
            </tr>
            <tr>
              <td style="color: #991b1b; font-size: 18px; font-weight: 700; padding: 8px 0;">TOTAL A REEMBOLSAR</td>
              <td style="text-align: right; color: #dc2626; font-size: 24px; font-weight: 800; padding: 8px 0;">-${formatPrice(data.total)}</td>
            </tr>
          </table>
        </div>
      </div>

      <!-- Información de reembolso -->
      <div style="margin: 0 40px 32px; padding: 24px; background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-radius: 12px; border-left: 4px solid #10b981;">
        <table style="width: 100%;">
          <tr>
            <td style="width: 50px; vertical-align: top;">
              <span style="font-size: 32px;">💰</span>
            </td>
            <td>
              <h4 style="margin: 0 0 12px; color: #065f46; font-size: 16px;">Información sobre tu reembolso</h4>
              <ul style="margin: 0; padding: 0 0 0 20px; color: #047857; font-size: 14px; line-height: 1.8;">
                <li>El reembolso se procesará automáticamente</li>
                <li>Método de devolución: <strong>${data.refundMethod || 'Mismo método de pago original'}</strong></li>
                <li>Plazo estimado: <strong>5-10 días hábiles</strong></li>
                <li>El tiempo exacto depende de tu entidad bancaria</li>
              </ul>
            </td>
          </tr>
        </table>
      </div>

      <!-- Botones de acción -->
      <div style="padding: 0 40px 40px; text-align: center;">
        <a href="https://eloyfashionstore.victoriafp.online/tienda" 
           style="display: inline-block; background: linear-gradient(135deg, #1e3a5f 0%, #2d5a8f 100%); color: white; text-decoration: none; padding: 18px 48px; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(30,58,95,0.3);">
          🛍️ Seguir Comprando
        </a>
        <p style="margin: 20px 0 0; color: #6b7280; font-size: 13px;">
          Sentimos que hayas tenido que cancelar tu pedido.<br>
          Esperamos verte pronto de nuevo.
        </p>
      </div>

    </div>

    <!-- Información de contacto y legal -->
    <div style="margin-top: 24px; padding: 24px; background: white; border-radius: 12px; text-align: center;">
      <p style="color: #6b7280; font-size: 13px; margin: 0 0 12px; line-height: 1.5;">
        ¿Tienes alguna pregunta sobre tu reembolso?<br>
        Contáctanos en <a href="mailto:soporte@fashionmarket.es" style="color: #1e3a5f; text-decoration: none; font-weight: 500;">soporte@fashionmarket.es</a>
      </p>
      <div style="border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 16px;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">
          FashionMarket S.L. · CIF: B12345678 · C/ Moda, 123 · 28001 Madrid<br>
          © ${new Date().getFullYear()} FashionMarket. Todos los derechos reservados.
        </p>
      </div>
    </div>

  </div>
</body>
</html>
  `;

  return sendEmail({
    to: data.customerEmail,
    subject: `❌ Pedido ${data.orderNumber} cancelado - Factura de anulación ${cancellationNumber}`,
    html,
  });
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EMAIL DE BIENVENIDA AL NEWSLETTER
 * ═══════════════════════════════════════════════════════════════════════════
 */

interface NewsletterWelcomeData {
  email: string;
  promoCode: string;
  discountPercentage?: string;
}

/**
 * Envía email de bienvenida al suscribirse al newsletter
 */
export async function sendNewsletterWelcomeEmail(data: NewsletterWelcomeData): Promise<EmailResult> {
  const discount = data.discountPercentage || '10%';
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="font-size: 28px; font-weight: 600; color: #1e3a5f; margin: 0;">
        Fashion<span style="color: #c9a227;">Market</span>
      </h1>
      <p style="color: #6b7280; margin-top: 8px;">Moda masculina con estilo</p>
    </div>

    <!-- Card Principal -->
    <div style="background: white; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.1); overflow: hidden;">
      <!-- Banner de bienvenida -->
      <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a8f 50%, #1e3a5f 100%); padding: 48px 32px; text-align: center; position: relative;">
        <!-- Decoración -->
        <div style="position: absolute; top: 20px; left: 20px; width: 60px; height: 60px; border: 2px solid rgba(201,162,39,0.3); border-radius: 50%;"></div>
        <div style="position: absolute; bottom: 20px; right: 20px; width: 40px; height: 40px; border: 2px solid rgba(201,162,39,0.3); border-radius: 50%;"></div>
        
        <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #c9a227 0%, #e6c75a 100%); border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 20px rgba(201,162,39,0.4);">
          <span style="font-size: 40px; line-height: 80px;">🎉</span>
        </div>
        <h2 style="color: white; font-size: 28px; margin: 0 0 12px; font-weight: 700;">¡Bienvenido a la Familia!</h2>
        <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 16px; line-height: 1.5;">
          Gracias por unirte a nuestra comunidad de estilo
        </p>
      </div>

      <!-- Contenido principal -->
      <div style="padding: 40px 32px;">
        <p style="color: #374151; font-size: 16px; line-height: 1.7; margin: 0 0 24px; text-align: center;">
          Estamos encantados de que formes parte de <strong style="color: #1e3a5f;">FashionMarket</strong>. 
          Como nuevo miembro, te hemos preparado algo especial para tu primera compra.
        </p>

        <!-- Código de descuento -->
        <div style="background: linear-gradient(135deg, #fefce8 0%, #fef3c7 100%); border: 2px dashed #c9a227; border-radius: 12px; padding: 32px; text-align: center; margin-bottom: 32px;">
          <p style="color: #92400e; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 12px; font-weight: 600;">
            Tu código exclusivo
          </p>
          <div style="background: white; border-radius: 8px; padding: 16px 24px; display: inline-block; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
            <span style="font-family: 'Courier New', monospace; font-size: 32px; font-weight: 700; color: #1e3a5f; letter-spacing: 4px;">
              ${data.promoCode}
            </span>
          </div>
          <p style="color: #1e3a5f; font-size: 24px; font-weight: 700; margin: 16px 0 0;">
            ${discount} DE DESCUENTO
          </p>
          <p style="color: #6b7280; font-size: 14px; margin: 8px 0 0;">
            en tu primera compra
          </p>
        </div>

        <!-- Beneficios -->
        <h3 style="color: #1e3a5f; font-size: 18px; margin: 0 0 20px; text-align: center;">
          Como suscriptor disfrutarás de:
        </h3>
        
        <div style="display: block; margin-bottom: 24px;">
          <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
            <table style="width: 100%;">
              <tr>
                <td style="width: 40px; vertical-align: top;">
                  <span style="font-size: 24px;">🛍️</span>
                </td>
                <td style="vertical-align: top;">
                  <p style="color: #1e3a5f; font-weight: 600; margin: 0 0 4px;">Acceso anticipado</p>
                  <p style="color: #6b7280; font-size: 14px; margin: 0;">Sé el primero en conocer nuevas colecciones</p>
                </td>
              </tr>
            </table>
          </div>
          
          <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
            <table style="width: 100%;">
              <tr>
                <td style="width: 40px; vertical-align: top;">
                  <span style="font-size: 24px;">💰</span>
                </td>
                <td style="vertical-align: top;">
                  <p style="color: #1e3a5f; font-weight: 600; margin: 0 0 4px;">Ofertas exclusivas</p>
                  <p style="color: #6b7280; font-size: 14px; margin: 0;">Descuentos especiales solo para suscriptores</p>
                </td>
              </tr>
            </table>
          </div>
          
          <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
            <table style="width: 100%;">
              <tr>
                <td style="width: 40px; vertical-align: top;">
                  <span style="font-size: 24px;">✨</span>
                </td>
                <td style="vertical-align: top;">
                  <p style="color: #1e3a5f; font-weight: 600; margin: 0 0 4px;">Consejos de estilo</p>
                  <p style="color: #6b7280; font-size: 14px; margin: 0;">Tips y tendencias de moda masculina</p>
                </td>
              </tr>
            </table>
          </div>
        </div>

        <!-- CTA -->
        <div style="text-align: center; margin-top: 32px;">
          <a href="https://eloyfashionstore.victoriafp.online/tienda" 
             style="display: inline-block; background: linear-gradient(135deg, #c9a227 0%, #dab82f 100%); color: #1e3a5f; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 15px rgba(201,162,39,0.3); transition: all 0.3s ease;">
            Usar Mi Descuento
          </a>
        </div>

        <!-- Nota -->
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 24px 0 0; line-height: 1.5;">
          * Código válido para tu primera compra. No acumulable con otras ofertas.<br>
          Envío gratis en pedidos superiores a 100€.
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 32px; color: #9ca3af; font-size: 14px;">
      <p style="margin: 0 0 8px;">
        Síguenos para más inspiración
      </p>
      <div style="margin: 16px 0;">
        <a href="#" style="color: #1e3a5f; text-decoration: none; margin: 0 8px;">Instagram</a>
        <span style="color: #d1d5db;">|</span>
        <a href="#" style="color: #1e3a5f; text-decoration: none; margin: 0 8px;">Facebook</a>
        <span style="color: #d1d5db;">|</span>
        <a href="#" style="color: #1e3a5f; text-decoration: none; margin: 0 8px;">Twitter</a>
      </div>
      <p style="margin: 16px 0 0; color: #d1d5db; font-size: 12px;">
        © ${new Date().getFullYear()} FashionMarket. Todos los derechos reservados.
      </p>
      <p style="margin: 8px 0 0; color: #d1d5db; font-size: 11px;">
        Si no deseas recibir más emails, puedes <a href="https://eloyfashionstore.victoriafp.online/unsubscribe?email=${encodeURIComponent(data.email)}" style="color: #9ca3af;">darte de baja aquí</a>.
      </p>
    </div>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: data.email,
    subject: '🎉 ¡Bienvenido a FashionMarket! Tu código de descuento está aquí',
    html,
  });
}
