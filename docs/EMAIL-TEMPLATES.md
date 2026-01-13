# 📧 Plantillas de Email para FashionMarket - Supabase

Copia estas plantillas en **Supabase Dashboard** → **Authentication** → **Email Templates**

---

## 1. CONFIRM SIGNUP (Confirmación de Registro)

Copia este HTML en la plantilla "Confirm signup":


**Subject (Asunto):** Confirma tu cuenta en FashionMarket ✨

---

## 2. RESET PASSWORD (Restablecer Contraseña)

Copia este HTML en la plantilla "Reset Password":

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Restablecer contraseña - FashionMarket</title>
</head>
<body style="margin: 0; padding: 0; background-color: #faf9f7; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #faf9f7;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%;">
          
          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom: 30px;">
              <h1 style="margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 32px; font-weight: 600; color: #0a1628;">
                Fashion<span style="color: #b8a067;">Market</span>
              </h1>
            </td>
          </tr>
          
          <!-- Main Card -->
          <tr>
            <td>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 20px rgba(10, 22, 40, 0.1);">
                
                <!-- Gold Accent Bar -->
                <tr>
                  <td style="height: 4px; background: linear-gradient(90deg, #b8a067, #d4c49a, #b8a067);"></td>
                </tr>
                
                <!-- Icon -->
                <tr>
                  <td align="center" style="padding: 40px 40px 20px;">
                    <div style="width: 80px; height: 80px; background-color: #fef3cd; border-radius: 50%; display: inline-block; line-height: 80px;">
                      <img src="https://img.icons8.com/ios-filled/50/8b6914/lock--v1.png" alt="🔒" style="width: 40px; height: 40px; vertical-align: middle;">
                    </div>
                  </td>
                </tr>
                
                <!-- Title -->
                <tr>
                  <td align="center" style="padding: 0 40px;">
                    <h2 style="margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 28px; font-weight: 500; color: #0a1628;">
                      Restablecer contraseña
                    </h2>
                  </td>
                </tr>
                
                <!-- Message -->
                <tr>
                  <td align="center" style="padding: 20px 40px;">
                    <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #525252;">
                      Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en FashionMarket.
                    </p>
                    <p style="margin: 15px 0 0; font-size: 16px; line-height: 1.6; color: #525252;">
                      Haz clic en el siguiente botón para crear una nueva contraseña:
                    </p>
                  </td>
                </tr>
                
                <!-- CTA Button -->
                <tr>
                  <td align="center" style="padding: 20px 40px 30px;">
                    <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 16px 48px; background-color: #0a1628; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; letter-spacing: 0.5px; border-radius: 4px; text-transform: uppercase;">
                      Restablecer contraseña
                    </a>
                  </td>
                </tr>
                
                <!-- Security Notice -->
                <tr>
                  <td style="padding: 0 40px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #fff8e6; border-radius: 6px; border-left: 4px solid #b8a067;">
                      <tr>
                        <td style="padding: 15px 20px;">
                          <p style="margin: 0; font-size: 13px; color: #8b6914;">
                            <strong>🔐 Nota de seguridad:</strong> Si no solicitaste este cambio, ignora este email. Tu contraseña actual seguirá siendo válida.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Divider -->
                <tr>
                  <td style="padding: 25px 40px 0;">
                    <hr style="border: none; border-top: 1px solid #ebebeb; margin: 0;">
                  </td>
                </tr>
                
                <!-- Alternative Link -->
                <tr>
                  <td align="center" style="padding: 25px 40px;">
                    <p style="margin: 0; font-size: 13px; color: #8a8a8a;">
                      Si el botón no funciona, copia y pega este enlace:
                    </p>
                    <p style="margin: 10px 0 0; font-size: 12px; color: #b8a067; word-break: break-all;">
                      {{ .ConfirmationURL }}
                    </p>
                  </td>
                </tr>
                
                <!-- Expiry Notice -->
                <tr>
                  <td align="center" style="padding: 0 40px 30px;">
                    <p style="margin: 0; font-size: 13px; color: #8a8a8a;">
                      ⏰ Este enlace expira en 1 hora
                    </p>
                  </td>
                </tr>
                
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 30px 20px;">
              <p style="margin: 0 0 10px; font-size: 13px; color: #8a8a8a;">
                © 2026 FashionMarket. Moda masculina premium.
              </p>
              <p style="margin: 0; font-size: 12px; color: #a8a8a8;">
                Este email fue enviado a {{ .Email }}
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

**Subject (Asunto):** Restablecer tu contraseña - FashionMarket 🔐

---

## 3. MAGIC LINK (Enlace Mágico)

Copia este HTML en la plantilla "Magic Link":

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Accede a tu cuenta - FashionMarket</title>
</head>
<body style="margin: 0; padding: 0; background-color: #faf9f7; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #faf9f7;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%;">
          
          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom: 30px;">
              <h1 style="margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 32px; font-weight: 600; color: #0a1628;">
                Fashion<span style="color: #b8a067;">Market</span>
              </h1>
            </td>
          </tr>
          
          <!-- Main Card -->
          <tr>
            <td>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 20px rgba(10, 22, 40, 0.1);">
                
                <!-- Gold Accent Bar -->
                <tr>
                  <td style="height: 4px; background: linear-gradient(90deg, #b8a067, #d4c49a, #b8a067);"></td>
                </tr>
                
                <!-- Icon -->
                <tr>
                  <td align="center" style="padding: 40px 40px 20px;">
                    <div style="width: 80px; height: 80px; background-color: #e8f4fc; border-radius: 50%; display: inline-block; line-height: 80px;">
                      <img src="https://img.icons8.com/ios-filled/50/0a1628/login-rounded-right.png" alt="→" style="width: 40px; height: 40px; vertical-align: middle;">
                    </div>
                  </td>
                </tr>
                
                <!-- Title -->
                <tr>
                  <td align="center" style="padding: 0 40px;">
                    <h2 style="margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 28px; font-weight: 500; color: #0a1628;">
                      Tu enlace de acceso
                    </h2>
                  </td>
                </tr>
                
                <!-- Message -->
                <tr>
                  <td align="center" style="padding: 20px 40px;">
                    <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #525252;">
                      Haz clic en el siguiente botón para acceder a tu cuenta de FashionMarket de forma segura, sin necesidad de contraseña.
                    </p>
                  </td>
                </tr>
                
                <!-- CTA Button -->
                <tr>
                  <td align="center" style="padding: 20px 40px 30px;">
                    <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 16px 48px; background-color: #0a1628; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; letter-spacing: 0.5px; border-radius: 4px; text-transform: uppercase;">
                      Acceder a mi cuenta
                    </a>
                  </td>
                </tr>
                
                <!-- Divider -->
                <tr>
                  <td style="padding: 0 40px;">
                    <hr style="border: none; border-top: 1px solid #ebebeb; margin: 0;">
                  </td>
                </tr>
                
                <!-- Alternative Link -->
                <tr>
                  <td align="center" style="padding: 25px 40px;">
                    <p style="margin: 0; font-size: 13px; color: #8a8a8a;">
                      Si el botón no funciona, copia y pega este enlace:
                    </p>
                    <p style="margin: 10px 0 0; font-size: 12px; color: #b8a067; word-break: break-all;">
                      {{ .ConfirmationURL }}
                    </p>
                  </td>
                </tr>
                
                <!-- Expiry Notice -->
                <tr>
                  <td align="center" style="padding: 0 40px 30px;">
                    <p style="margin: 0; font-size: 13px; color: #8a8a8a;">
                      ⏰ Este enlace expira en 1 hora y solo puede usarse una vez
                    </p>
                  </td>
                </tr>
                
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 30px 20px;">
              <p style="margin: 0 0 10px; font-size: 13px; color: #8a8a8a;">
                © 2026 FashionMarket. Moda masculina premium.
              </p>
              <p style="margin: 0; font-size: 12px; color: #a8a8a8;">
                Si no solicitaste este enlace, puedes ignorar este email.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

**Subject (Asunto):** Tu enlace de acceso a FashionMarket ✨

---

## 📋 Instrucciones para configurar en Supabase

1. Ve a **Supabase Dashboard** → Tu proyecto
2. Click en **Authentication** (menú izquierdo)
3. Click en **Email Templates** (submenú)
4. Para cada plantilla:
   - Selecciona la plantilla (Confirm signup, Reset Password, etc.)
   - Pega el HTML correspondiente en el campo de contenido
   - Cambia el **Subject** (asunto) como se indica
   - Click en **Save**

### Variables disponibles:
- `{{ .ConfirmationURL }}` - El enlace de confirmación
- `{{ .Email }}` - El email del usuario
- `{{ .Token }}` - El token (si necesitas construir tu propia URL)
- `{{ .TokenHash }}` - Hash del token
- `{{ .SiteURL }}` - URL de tu sitio

---

## 🎨 Vista previa del diseño

El email incluye:
- ✅ Logo de FashionMarket con los colores de marca
- ✅ Barra dorada de acento
- ✅ Iconos visuales
- ✅ Botón CTA prominente
- ✅ Enlace alternativo (por si el botón no funciona)
- ✅ Aviso de expiración
- ✅ Footer profesional
- ✅ Diseño responsive (funciona en móvil y desktop)
