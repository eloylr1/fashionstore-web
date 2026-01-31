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
  // Datos bancarios para transferencia
  bankDetails?: {
    bank: string;
    iban: string;
    beneficiary: string;
    reference: string;
  };
}

/**
 * Envía email de confirmación de pedido con factura
 */
export async function sendOrderConfirmationEmail(data: OrderData): Promise<EmailResult> {
  // Determinar texto del método de pago
  const paymentMethodText: Record<string, string> = {
    'card': '💳 Tarjeta de crédito/débito',
    'transfer': '🏦 Transferencia bancaria',
    'cash_on_delivery': '💵 Contrareembolso',
  };
  
  const paymentLabel = paymentMethodText[data.paymentMethod || 'card'] || '💳 Tarjeta';
  
  // Determinar método de envío
  const shippingMethodText = data.shippingMethod === 'express' ? '🚀 Envío Express' : '📦 Envío Estándar';
  const deliveryDays = data.estimatedDeliveryDays || (data.shippingMethod === 'express' ? 1 : 3);
  
  const itemsHtml = data.items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
        <strong style="color: #1e3a5f;">${item.name}</strong>
        ${item.size ? `<br><span style="color: #6b7280; font-size: 14px;">Talla: ${item.size}</span>` : ''}
        ${item.color ? `<span style="color: #6b7280; font-size: 14px;"> | Color: ${item.color}</span>` : ''}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center; color: #374151;">
        ${item.quantity}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #374151;">
        ${formatPrice(item.price * item.quantity)}
      </td>
    </tr>
  `).join('');

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
        FashionMarket
      </h1>
      <p style="color: #6b7280; margin-top: 8px;">Moda masculina con estilo</p>
    </div>

    <!-- Card Principal -->
    <div style="background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); overflow: hidden;">
      <!-- Banner de confirmación -->
      <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d4a6f 100%); padding: 32px; text-align: center;">
        <div style="width: 64px; height: 64px; background: rgba(255,255,255,0.2); border-radius: 50%; margin: 0 auto 16px; line-height: 64px;">
          <span style="font-size: 32px;">✓</span>
        </div>
        <h2 style="color: white; font-size: 24px; margin: 0 0 8px;">¡Pedido Confirmado!</h2>
        <p style="color: rgba(255,255,255,0.8); margin: 0;">
          Gracias por tu compra, ${data.customerName.split(' ')[0]}
        </p>
      </div>

      <!-- Detalles del pedido -->
      <div style="padding: 32px;">
        <table style="width: 100%; margin-bottom: 24px;">
          <tr>
            <td>
              <p style="color: #6b7280; font-size: 14px; margin: 0;">Número de pedido</p>
              <p style="color: #1e3a5f; font-size: 18px; font-weight: 600; margin: 4px 0 0;">${data.orderNumber}</p>
            </td>
            <td style="text-align: right;">
              <p style="color: #6b7280; font-size: 14px; margin: 0;">Factura</p>
              <p style="color: #1e3a5f; font-size: 18px; font-weight: 600; margin: 4px 0 0;">${data.invoiceNumber}</p>
            </td>
          </tr>
        </table>

        <!-- Tabla de productos -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
          <thead>
            <tr style="background-color: #f9fafb;">
              <th style="padding: 12px; text-align: left; color: #6b7280; font-size: 14px; font-weight: 500;">Producto</th>
              <th style="padding: 12px; text-align: center; color: #6b7280; font-size: 14px; font-weight: 500;">Cantidad</th>
              <th style="padding: 12px; text-align: right; color: #6b7280; font-size: 14px; font-weight: 500;">Precio</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <!-- Resumen de totales -->
        <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px;">
          <table style="width: 100%;">
            <tr>
              <td style="color: #6b7280; padding: 4px 0;">Subtotal</td>
              <td style="text-align: right; color: #374151;">${formatPrice(data.subtotal)}</td>
            </tr>
            ${data.discount && data.discount > 0 ? `
            <tr>
              <td style="color: #059669; padding: 4px 0;">Descuento</td>
              <td style="text-align: right; color: #059669;">-${formatPrice(data.discount)}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="color: #6b7280; padding: 4px 0;">Envío (${shippingMethodText})</td>
              <td style="text-align: right; color: #374151;">${data.shippingCost === 0 ? '✅ Gratis' : formatPrice(data.shippingCost)}</td>
            </tr>
            ${data.codExtraCost && data.codExtraCost > 0 ? `
            <tr>
              <td style="color: #6b7280; padding: 4px 0;">Cargo por contrareembolso</td>
              <td style="text-align: right; color: #374151;">${formatPrice(data.codExtraCost)}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="color: #6b7280; padding: 4px 0;">IVA (21%)</td>
              <td style="text-align: right; color: #374151;">${formatPrice(data.tax)}</td>
            </tr>
            <tr>
              <td colspan="2" style="border-top: 1px solid #e5e7eb; padding-top: 12px; margin-top: 12px;"></td>
            </tr>
            <tr>
              <td style="font-weight: 600; color: #1e3a5f; font-size: 18px;">Total</td>
              <td style="text-align: right; font-weight: 600; color: #1e3a5f; font-size: 18px;">${formatPrice(data.total)}</td>
            </tr>
          </table>
        </div>

        <!-- Método de pago y entrega -->
        <div style="margin-top: 24px; display: flex; gap: 16px;">
          <div style="flex: 1; padding: 16px; background: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0;">
            <p style="margin: 0 0 4px; font-size: 12px; color: #15803d; text-transform: uppercase; font-weight: 600;">Método de pago</p>
            <p style="margin: 0; color: #166534; font-weight: 500;">${paymentLabel}</p>
          </div>
          <div style="flex: 1; padding: 16px; background: #eff6ff; border-radius: 8px; border: 1px solid #bfdbfe;">
            <p style="margin: 0 0 4px; font-size: 12px; color: #1d4ed8; text-transform: uppercase; font-weight: 600;">Entrega estimada</p>
            <p style="margin: 0; color: #1e40af; font-weight: 500;">${deliveryDays === 1 ? '24-48 horas' : `${deliveryDays}-${deliveryDays + 2} días laborables`}</p>
          </div>
        </div>

        ${data.paymentMethod === 'cash_on_delivery' ? `
        <!-- Aviso contrareembolso -->
        <div style="margin-top: 24px; padding: 16px; background: #fef3c7; border-radius: 8px; border: 1px solid #fcd34d;">
          <h4 style="margin: 0 0 8px; color: #92400e;">💵 Pago a la entrega</h4>
          <p style="margin: 0; color: #a16207; font-size: 14px;">
            Deberás abonar <strong>${formatPrice(data.total)}</strong> al repartidor cuando recibas tu pedido.
            Ten preparado el importe exacto en efectivo.
          </p>
        </div>
        ` : ''}

        ${data.paymentMethod === 'transfer' && data.bankDetails ? `
        <!-- Datos bancarios para transferencia -->
        <div style="margin-top: 24px; padding: 20px; background: #f0f9ff; border-radius: 8px; border: 1px solid #bae6fd;">
          <h4 style="margin: 0 0 12px; color: #0369a1;">🏦 Datos para la transferencia</h4>
          <table style="width: 100%;">
            <tr>
              <td style="color: #6b7280; padding: 6px 0; font-size: 14px;">Banco:</td>
              <td style="color: #0c4a6e; font-weight: 500; font-size: 14px;">${data.bankDetails.bank}</td>
            </tr>
            <tr>
              <td style="color: #6b7280; padding: 6px 0; font-size: 14px;">Beneficiario:</td>
              <td style="color: #0c4a6e; font-weight: 500; font-size: 14px;">${data.bankDetails.beneficiary}</td>
            </tr>
            <tr>
              <td style="color: #6b7280; padding: 6px 0; font-size: 14px;">IBAN:</td>
              <td style="color: #0c4a6e; font-weight: 600; font-size: 14px; letter-spacing: 1px;">${data.bankDetails.iban}</td>
            </tr>
            <tr>
              <td style="color: #6b7280; padding: 6px 0; font-size: 14px;">Concepto:</td>
              <td style="color: #0c4a6e; font-weight: 600; font-size: 14px;">${data.bankDetails.reference}</td>
            </tr>
            <tr>
              <td style="color: #6b7280; padding: 6px 0; font-size: 14px;">Importe:</td>
              <td style="color: #0c4a6e; font-weight: 700; font-size: 16px;">${formatPrice(data.total)}</td>
            </tr>
          </table>
          <p style="margin: 12px 0 0; color: #0369a1; font-size: 13px; font-style: italic;">
            ⚠️ Por favor, incluye el número de pedido como concepto para identificar tu pago.
            Tu pedido se procesará una vez confirmemos la transferencia.
          </p>
        </div>
        ` : ''}

        <!-- Dirección de envío -->
        <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
          <h3 style="color: #1e3a5f; font-size: 16px; margin: 0 0 12px;">📦 Dirección de envío</h3>
          <p style="color: #374151; margin: 0; line-height: 1.6;">
            ${data.shippingAddress.full_name || ''}<br>
            ${data.shippingAddress.address_line1 || data.shippingAddress.address || ''}<br>
            ${data.shippingAddress.address_line2 ? data.shippingAddress.address_line2 + '<br>' : ''}
            ${data.shippingAddress.postal_code || ''} ${data.shippingAddress.city || ''}${data.shippingAddress.province ? ', ' + data.shippingAddress.province : ''}<br>
            ${data.shippingAddress.country || 'España'}
          </p>
        </div>

        <!-- CTA -->
        <div style="margin-top: 32px; text-align: center;">
          <a href="${data.invoiceUrl}" 
             style="display: inline-block; background: #1e3a5f; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 500;">
            Ver Mi Pedido
          </a>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 32px; color: #9ca3af; font-size: 14px;">
      <p style="margin: 0 0 8px;">¿Tienes alguna pregunta? Responde a este email</p>
      <p style="margin: 0;">
        © 2025 FashionMarket. Todos los derechos reservados.
      </p>
    </div>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: data.customerEmail,
    subject: `✓ Pedido ${data.orderNumber} confirmado - FashionMarket`,
    html,
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
// EMAIL DE CANCELACIÓN DE PEDIDO
// ─────────────────────────────────────────────────────────────────────────────

interface CancelOrderEmailData {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    size?: string;
  }>;
  total: number;
  cancellationDate: string;
  reason?: string;
}

/**
 * Envía email de confirmación de cancelación de pedido
 */
export async function sendOrderCancellationEmail(data: CancelOrderEmailData): Promise<EmailResult> {
  const formattedDate = new Date(data.cancellationDate).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

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
      <h1 style="font-size: 28px; font-weight: 600; color: #1e3a5f; margin: 0;">FashionMarket</h1>
    </div>

    <!-- Main Card -->
    <div style="background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); overflow: hidden;">
      
      <!-- Header rojo -->
      <div style="background: #dc2626; padding: 24px; text-align: center;">
        <div style="width: 56px; height: 56px; background: rgba(255,255,255,0.2); border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
          <span style="color: white; font-size: 28px;">✕</span>
        </div>
        <h2 style="color: white; font-size: 22px; margin: 0;">Pedido Cancelado</h2>
      </div>

      <!-- Contenido -->
      <div style="padding: 32px;">
        <p style="color: #374151; font-size: 16px; margin: 0 0 24px; line-height: 1.6;">
          Hola <strong>${data.customerName}</strong>,
        </p>
        
        <p style="color: #374151; font-size: 16px; margin: 0 0 24px; line-height: 1.6;">
          Te confirmamos que tu pedido <strong style="color: #1e3a5f;">${data.orderNumber}</strong> ha sido cancelado correctamente.
        </p>

        <!-- Info del pedido -->
        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="color: #6b7280; font-size: 14px; padding: 4px 0;">Fecha de cancelación:</td>
              <td style="color: #374151; font-size: 14px; padding: 4px 0; text-align: right; font-weight: 500;">${formattedDate}</td>
            </tr>
            <tr>
              <td style="color: #6b7280; font-size: 14px; padding: 4px 0;">Importe total:</td>
              <td style="color: #374151; font-size: 14px; padding: 4px 0; text-align: right; font-weight: 500;">${formatPrice(data.total)}</td>
            </tr>
          </table>
        </div>

        <!-- Productos cancelados -->
        <h3 style="color: #1e3a5f; font-size: 16px; margin: 0 0 16px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">Artículos cancelados</h3>
        
        ${data.items.map(item => `
        <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f3f4f6;">
          <div>
            <p style="color: #1e3a5f; font-size: 14px; margin: 0; font-weight: 500;">${item.name}</p>
            <p style="color: #6b7280; font-size: 13px; margin: 4px 0 0;">
              Cantidad: ${item.quantity}${item.size ? ` · Talla: ${item.size}` : ''}
            </p>
          </div>
          <p style="color: #374151; font-size: 14px; margin: 0; font-weight: 500;">${formatPrice(item.price * item.quantity)}</p>
        </div>
        `).join('')}

        <!-- Reembolso -->
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-top: 24px;">
          <p style="color: #166534; font-size: 14px; margin: 0; font-weight: 500;">
            Información sobre el reembolso
          </p>
          <p style="color: #15803d; font-size: 14px; margin: 8px 0 0; line-height: 1.5;">
            Si realizaste el pago con tarjeta, el reembolso se procesará automáticamente en un plazo de 5-10 días hábiles. 
            El tiempo exacto depende de tu entidad bancaria.
          </p>
        </div>

        <!-- CTA -->
        <div style="margin-top: 32px; text-align: center;">
          <a href="https://eloyfashionstore.victoriafp.online/tienda" 
             style="display: inline-block; background: #1e3a5f; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 500;">
            Seguir Comprando
          </a>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 32px; color: #9ca3af; font-size: 14px;">
      <p style="margin: 0 0 8px;">¿Tienes alguna pregunta? Responde a este email</p>
      <p style="margin: 0;">
        © ${new Date().getFullYear()} FashionMarket. Todos los derechos reservados.
      </p>
    </div>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: data.customerEmail,
    subject: `Pedido ${data.orderNumber} cancelado - FashionMarket`,
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
