/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - API Admin: Actualizar Stock por Variante (Talla + Color)
 * Endpoint para que el admin actualice el stock de variantes específicas
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '../../../../../lib/email';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || '';
const siteUrl = import.meta.env.SITE_URL || 'http://localhost:4322';

interface VariantStockUpdate {
  size: string | null;
  color: string | null;
  stock: number;
}

interface UpdateStockRequest {
  updates: VariantStockUpdate[];
}

// Función auxiliar para obtener la tabla de stock correcta
const getStockTable = async (supabase: any): Promise<string> => {
  // Verificar si existe product_variant_stock
  const { data: variantTable } = await supabase
    .from('product_variant_stock')
    .select('id')
    .limit(1);
  
  if (variantTable !== null) {
    return 'product_variant_stock';
  }
  
  return 'product_size_stock';
};

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

    // Obtener producto con sus tallas y colores
    const { data: product } = await supabase
      .from('products')
      .select('id, name, sizes, colors, stock')
      .eq('id', productId)
      .single();

    if (!product) {
      return new Response(
        JSON.stringify({ error: 'Producto no encontrado' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const stockTable = await getStockTable(supabase);

    // Obtener stock actual por variante
    const { data: stockData } = await supabase
      .from(stockTable)
      .select('size, color, stock')
      .eq('product_id', productId);

    // Crear mapa de stock por variante
    const stockByVariant = (stockData || []).map((item: { size: string | null; color: string | null; stock: number }) => ({
      size: item.size,
      color: item.color || null,
      stock: item.stock
    }));

    // También crear stockBySize para compatibilidad
    const stockBySize: { size: string; stock: number }[] = [];
    const sizeStockMap: Record<string, number> = {};
    (stockData || []).forEach((item: { size: string | null; stock: number }) => {
      if (item.size) {
        sizeStockMap[item.size] = (sizeStockMap[item.size] || 0) + item.stock;
      }
    });
    Object.entries(sizeStockMap).forEach(([size, stock]) => {
      stockBySize.push({ size, stock });
    });

    // Obtener notificaciones pendientes por variante
    const { data: notifications } = await supabase
      .from('stock_notifications')
      .select('size, color, email')
      .eq('product_id', productId)
      .eq('notified', false);

    const pendingNotifications: Record<string, number> = {};
    (notifications || []).forEach((n: { size: string | null; color: string | null }) => {
      const key = `${n.size || '_'}_${n.color || '_'}`;
      pendingNotifications[key] = (pendingNotifications[key] || 0) + 1;
    });

    return new Response(
      JSON.stringify({
        product: {
          id: product.id,
          name: product.name,
          sizes: product.sizes || [],
          colors: product.colors || [],
          totalStock: product.stock
        },
        stockByVariant,
        stockBySize,
        pendingNotifications
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

    const stockTable = await getStockTable(supabase);
    const emailsToNotify: { email: string; size: string | null; color: string | null }[] = [];

    // Procesar cada actualización
    for (const update of updates) {
      const { size, color, stock } = update;
      
      if (typeof stock !== 'number' || stock < 0) continue;

      // Construir condición de búsqueda
      let query = supabase
        .from(stockTable)
        .select('stock')
        .eq('product_id', productId);

      if (size) {
        query = query.eq('size', size);
      } else {
        query = query.is('size', null);
      }

      if (stockTable === 'product_variant_stock') {
        if (color) {
          query = query.eq('color', color);
        } else {
          query = query.is('color', null);
        }
      }

      const { data: oldStockData } = await query.single();
      const oldStock = oldStockData?.stock || 0;

      // Actualizar o insertar stock
      const upsertData: any = {
        product_id: productId,
        size: size || null,
        stock
      };

      if (stockTable === 'product_variant_stock') {
        upsertData.color = color || null;
      }

      const { error } = await supabase
        .from(stockTable)
        .upsert(upsertData, {
          onConflict: stockTable === 'product_variant_stock' 
            ? 'product_id,size,color' 
            : 'product_id,size'
        });

      if (error) {
        console.error('Error updating stock:', error);
        continue;
      }

      // Si el stock pasó de 0 a > 0, obtener notificaciones pendientes
      if (oldStock === 0 && stock > 0) {
        let notifQuery = supabase
          .from('stock_notifications')
          .select('id, email')
          .eq('product_id', productId)
          .eq('notified', false);

        if (size) {
          notifQuery = notifQuery.eq('size', size);
        } else {
          notifQuery = notifQuery.is('size', null);
        }

        if (color) {
          notifQuery = notifQuery.eq('color', color);
        } else {
          notifQuery = notifQuery.is('color', null);
        }

        const { data: notifications } = await notifQuery;

        if (notifications && notifications.length > 0) {
          // Marcar como notificados
          const notificationIds = notifications.map((n: { id: string }) => n.id);
          await supabase
            .from('stock_notifications')
            .update({ notified: true, notified_at: new Date().toISOString() })
            .in('id', notificationIds);

          // Agregar a lista de emails a enviar
          notifications.forEach((n: { email: string }) => {
            emailsToNotify.push({ email: n.email, size, color });
          });
        }
      }
    }

    // Actualizar stock total del producto
    const { data: totalStockData } = await supabase
      .from(stockTable)
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
    for (const { email, size, color } of emailsToNotify) {
      try {
        const variantText = [
          size ? `Talla ${size}` : null,
          color ? `Color ${color}` : null
        ].filter(Boolean).join(' - ') || 'tu selección';

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
                .variant-badge { display: inline-block; background: #28a745; color: white; padding: 4px 12px; border-radius: 4px; font-size: 14px; margin-top: 10px; }
                .cta-button { display: inline-block; background: #1a2b4a; color: white; text-decoration: none; padding: 14px 28px; border-radius: 4px; font-weight: 600; margin: 20px 0; }
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
                  <p>El producto que estabas esperando ya está disponible:</p>
                  
                  <div class="product-card">
                    <img src="${product.images?.[0] || `${siteUrl}/placeholder-product.jpg`}" alt="${product.name}" class="product-image">
                    <div class="product-info">
                      <h2>${product.name}</h2>
                      <p>Tu variante está disponible:</p>
                      <span class="variant-badge">${variantText}</span>
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
