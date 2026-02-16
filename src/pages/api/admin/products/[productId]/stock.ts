/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - API Admin: Actualizar Stock por Talla
 * Endpoint para que el admin actualice el stock de tallas específicas
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '../../../../../lib/email';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || '';
const siteUrl = import.meta.env.SITE_URL || 'http://localhost:4322';

interface StockUpdate {
  size: string;
  stock: number;
}

interface UpdateStockRequest {
  updates: StockUpdate[];
}

export const GET: APIRoute = async ({ params }) => {
  const { productId } = params;

  if (!productId) {
    return new Response(
      JSON.stringify({ error: 'ID de producto requerido' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Obtener producto con sus tallas
    const { data: product } = await supabase
      .from('products')
      .select('id, name, sizes, stock')
      .eq('id', productId)
      .single();

    if (!product) {
      return new Response(
        JSON.stringify({ error: 'Producto no encontrado' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Obtener stock actual por talla
    const { data: stockData } = await supabase
      .from('product_size_stock')
      .select('size, stock')
      .eq('product_id', productId);

    // Crear mapa de stock
    const stockMap: Record<string, number> = {};
    (stockData || []).forEach((item: { size: string; stock: number }) => {
      stockMap[item.size] = item.stock;
    });

    // Asegurar que todas las tallas del producto tengan entrada
    const sizes = product.sizes || [];
    const stockBySize = sizes.map((size: string) => ({
      size,
      stock: stockMap[size] || 0
    }));

    // Obtener notificaciones pendientes por talla
    const { data: notifications } = await supabase
      .from('stock_notifications')
      .select('size, email')
      .eq('product_id', productId)
      .eq('notified', false);

    const notificationsBySize: Record<string, number> = {};
    (notifications || []).forEach((n: { size: string }) => {
      notificationsBySize[n.size] = (notificationsBySize[n.size] || 0) + 1;
    });

    return new Response(
      JSON.stringify({
        product: {
          id: product.id,
          name: product.name,
          sizes: product.sizes,
          totalStock: product.stock
        },
        stockBySize,
        pendingNotifications: notificationsBySize
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Error interno' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const PUT: APIRoute = async ({ params, request }) => {
  const { productId } = params;

  if (!productId) {
    return new Response(
      JSON.stringify({ error: 'ID de producto requerido' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body: UpdateStockRequest = await request.json();
    const { updates } = body;

    if (!updates || !Array.isArray(updates)) {
      return new Response(
        JSON.stringify({ error: 'Lista de actualizaciones requerida' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Obtener producto
    const { data: product } = await supabase
      .from('products')
      .select('id, name, slug, images')
      .eq('id', productId)
      .single();

    if (!product) {
      return new Response(
        JSON.stringify({ error: 'Producto no encontrado' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const emailsToNotify: { email: string; size: string }[] = [];

    // Procesar cada actualización
    for (const update of updates) {
      const { size, stock } = update;
      
      if (typeof stock !== 'number' || stock < 0) continue;

      // Obtener stock anterior
      const { data: oldStockData } = await supabase
        .from('product_size_stock')
        .select('stock')
        .eq('product_id', productId)
        .eq('size', size)
        .single();

      const oldStock = oldStockData?.stock || 0;

      // Actualizar o insertar stock
      const { error } = await supabase
        .from('product_size_stock')
        .upsert({
          product_id: productId,
          size,
          stock
        }, {
          onConflict: 'product_id,size'
        });

      if (error) {
        console.error('Error updating stock:', error);
        continue;
      }

      // Si el stock pasó de 0 a > 0, obtener notificaciones pendientes
      if (oldStock === 0 && stock > 0) {
        const { data: notifications } = await supabase
          .from('stock_notifications')
          .select('id, email')
          .eq('product_id', productId)
          .eq('size', size)
          .eq('notified', false);

        if (notifications && notifications.length > 0) {
          // Marcar como notificados
          const notificationIds = notifications.map((n: { id: string }) => n.id);
          await supabase
            .from('stock_notifications')
            .update({ notified: true, notified_at: new Date().toISOString() })
            .in('id', notificationIds);

          // Agregar a lista de emails a enviar
          notifications.forEach((n: { email: string }) => {
            emailsToNotify.push({ email: n.email, size });
          });
        }
      }
    }

    // Actualizar stock total del producto
    const { data: totalStockData } = await supabase
      .from('product_size_stock')
      .select('stock')
      .eq('product_id', productId);

    const totalStock = (totalStockData || []).reduce(
      (sum: number, item: { stock: number }) => sum + item.stock, 0
    );

    await supabase
      .from('products')
      .update({ stock: totalStock })
      .eq('id', productId);

    // Enviar notificaciones por email
    let notificationsSent = 0;
    for (const { email, size } of emailsToNotify) {
      try {
        await sendEmail({
          to: email,
          subject: `¡${product.name} vuelve a estar disponible!`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
                .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                .header { background: linear-gradient(135deg, #1a2b4a, #2d4066); color: white; padding: 30px; text-align: center; }
                .header h1 { margin: 0; font-size: 24px; }
                .content { padding: 30px; }
                .product-card { display: flex; gap: 20px; background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
                .product-image { width: 120px; height: 120px; object-fit: cover; border-radius: 4px; background: #e9ecef; }
                .product-info h2 { margin: 0 0 10px; color: #1a2b4a; font-size: 18px; }
                .size-badge { display: inline-block; background: #28a745; color: white; padding: 4px 12px; border-radius: 4px; font-size: 14px; margin-top: 10px; }
                .cta-button { display: inline-block; background: #1a2b4a; color: white; text-decoration: none; padding: 14px 28px; border-radius: 4px; font-weight: 600; margin: 20px 0; }
                .cta-button:hover { background: #2d4066; }
                .footer { text-align: center; padding: 20px; color: #6c757d; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>¡Buenas noticias!</h1>
                </div>
                <div class="content">
                  <p>Hola,</p>
                  <p>El producto que estabas esperando ya está disponible en tu talla:</p>
                  
                  <div class="product-card">
                    <img src="${product.images?.[0] || `${siteUrl}/placeholder-product.jpg`}" alt="${product.name}" class="product-image">
                    <div class="product-info">
                      <h2>${product.name}</h2>
                      <p>Tu talla está disponible:</p>
                      <span class="size-badge">Talla ${size}</span>
                    </div>
                  </div>
                  
                  <p style="text-align: center;">
                    <a href="${siteUrl}/producto/${product.slug}" class="cta-button">
                      Ver producto
                    </a>
                  </p>
                  
                  <p style="color: #6c757d; font-size: 14px;">
                    ¡Date prisa! Las unidades son limitadas y podrían agotarse pronto.
                  </p>
                </div>
                <div class="footer">
                  <p>FashionMarket - Moda masculina premium</p>
                  <p>Has recibido este email porque solicitaste ser notificado.</p>
                </div>
              </div>
            </body>
            </html>
          `
        });
        notificationsSent++;
      } catch (emailError) {
        console.error('Error sending notification email:', emailError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        totalStock,
        notificationsSent,
        message: `Stock actualizado. ${notificationsSent} notificaciones enviadas.`
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Error interno' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
