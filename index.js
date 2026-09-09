const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const QRCode = require('qrcode');
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ==========================================
// 1. BASE DE DATOS SQLITE
// ==========================================
const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) console.error('Error al abrir la base de datos', err.message);
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS links (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url_destino TEXT NOT NULL,
        alias TEXT UNIQUE NOT NULL,
        clicks INTEGER DEFAULT 0,
        pixel_id TEXT,
        expires_at DATETIME,
        password TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS clicks_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        link_alias TEXT,
        clicked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        device TEXT
    )`);
});

// ==========================================
// 2. PANEL PRINCIPAL (Interfaz Web & QR)
// ==========================================
app.get('/', async (req, res) => {
    db.all(`SELECT * FROM links ORDER BY id DESC`, [], async (err, rows) => {
        let enlacesHtml = '';
        
        if (!err && rows) {
            for (let link of rows) {
                const fullShortUrl = `${req.protocol}://${req.get('host')}/${link.alias}`;
                
                let qrSvg = '';
                try {
                    qrSvg = await QRCode.toString(fullShortUrl, { type: 'svg', width: 85, margin: 1 });
                } catch (e) {
                    qrSvg = '<p style="font-size:10px; color:red;">Error QR</p>';
                }

                enlacesHtml += `
                    <div style="background: #12121a; padding: 15px; margin-bottom: 12px; border-radius: 8px; border: 1px solid #2a2a3d; display: flex; justify-content: space-between; align-items: center;">
                        <div style="overflow: hidden; padding-right: 10px;">
                            <span style="color: #a855f7; font-weight: bold; font-size: 15px;">/${link.alias}</span> 
                            <span style="font-size: 12px; color: #888;">(${link.clicks} clics)</span>
                            <div style="font-size: 12px; color: #aaa; word-break: break-all; margin-top: 4px;">Destino: ${link.url_destino}</div>
                            <a href="/${link.alias}" target="_blank" style="color: #38bdf8; font-size: 12px; text-decoration: none; display: inline-block; margin-top: 6px;">Probar Enlace</a>
                        </div>
                        <div style="background: #fff; padding: 4px; border-radius: 4px; text-align: center; flex-shrink: 0;">
                            ${qrSvg}
                        </div>
                    </div>
                `;
            }
        }

        res.send(`
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>LinkPulse - Acortador Inteligente & Retargeting</title>
                <style>
                    body { font-family: Arial, sans-serif; background: #0b0b10; color: #fff; margin: 0; padding: 30px 15px; display: flex; justify-content: center; }
                    .container { width: 100%; max-width: 520px; background: #161622; padding: 25px; border-radius: 12px; border: 1px solid #2a2a3d; box-shadow: 0 8px 24px rgba(0,0,0,0.5); }
                    h2 { text-align: center; color: #a855f7; margin-bottom: 20px; font-size: 20px; }
                    .form-group { margin-bottom: 15px; }
                    label { display: block; margin-bottom: 5px; font-size: 12px; color: #aaa; font-weight: bold; text-transform: uppercase; }
                    input { width: 100%; padding: 10px; background: #1a1a2e; border: 1px solid #333; color: #fff; border-radius: 6px; box-sizing: border-box; font-size: 14px; }
                    input:focus { border-color: #8b5cf6; outline: none; }
                    button { width: 100%; padding: 12px; background: #8b5cf6; border: none; color: white; font-weight: bold; border-radius: 6px; cursor: pointer; font-size: 15px; transition: background 0.2s; }
                    button:hover { background: #7c3aed; }
                    fieldset { border: 1px solid #2a2a3d; border-radius: 6px; padding: 12px; margin-bottom: 15px; background: #12121a; }
                    legend { color: #a855f7; font-size: 12px; font-weight: bold; padding: 0 5px; }
                    .section-title { margin-top: 25px; font-size: 15px; border-bottom: 1px solid #2a2a3d; padding-bottom: 8px; color: #ddd; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h2>LinkPulse B2B SUITE</h2>
                    <form action="/create" method="POST">
                        <div class="form-group">
                            <label>URL de Destino (Original)</label>
                            <input type="url" name="url_destino" required placeholder="https://tuempresa.com/landing">
                        </div>
                        <div class="form-group">
                            <label>Alias Personalizado (Opcional)</label>
                            <input type="text" name="alias" placeholder="oferta-verano">
                        </div>
                        
                        <fieldset>
                            <legend>Opciones Avanzadas</legend>
                            <div class="form-group" style="margin-bottom: 10px;">
                                <label>ID de Píxel de Retargeting (Meta/TikTok)</label>
                                <input type="text" name="pixel_id" placeholder="Ej: 1234567890">
                            </div>
                            <div class="form-group" style="margin-bottom: 10px;">
                                <label>Contraseña de protección</label>
                                <input type="password" name="password" placeholder="Opcional">
                            </div>
                            <div class="form-group" style="margin-bottom: 0;">
                                <label>Fecha de expiración</label>
                                <input type="datetime-local" name="expires_at">
                            </div>
                        </fieldset>

                        <button type="submit">Generar Enlace Acortado & QR</button>
                    </form>

                    <div class="section-title">Enlaces Recientes, Clics & QR</div>
                    <div style="margin-top: 15px;">
                        ${enlacesHtml || '<p style="color: #666; font-size: 13px; text-align: center;">No hay enlaces creados todavía.</p>'}
                    </div>
                </div>
            </body>
            </html>
        `);
    });
});

// ==========================================
// 3. CREAR NUEVO ENLACE
// ==========================================
app.post('/create', (req, res) => {
    let { url_destino, alias, pixel_id, password, expires_at } = req.body;
    const linkAlias = alias && alias.trim() !== '' ? alias.trim() : Math.random().toString(36).substring(2, 8);

    const query = `INSERT INTO links (url_destino, alias, pixel_id, password, expires_at) VALUES (?, ?, ?, ?, ?)`;
    
    db.run(query, [url_destino, linkAlias, pixel_id || null, password || null, expires_at || null], (err) => {
        if (err) {
            return res.send(`<script>alert('El alias ya existe o hubo un error.'); window.location.href='/';</script>`);
        }
        res.redirect('/');
    });
});

// ==========================================
// 4. REDIRECCIÓN INTELIGENTE, PÍXELES Y SEGURIDAD
// ==========================================
app.get('/:alias', (req, res) => {
    const alias = req.params.alias;

    db.get(`SELECT * FROM links WHERE alias = ?`, [alias], (err, link) => {
        if (err || !link) {
            return res.status(404).send("<h2 style='text-align:center; margin-top:50px; font-family:sans-serif;'>Enlace no encontrado.</h2>");
        }

        // Validar expiración
        if (link.expires_at && new Date() > new Date(link.expires_at)) {
            return res.status(410).send("<h2 style='text-align:center; margin-top:50px; font-family:sans-serif; color:#ff5555;'>Este enlace ha expirado.</h2>");
        }

        // Validar contraseña
        if (link.password) {
            const userPwd = req.query.pwd;
            if (userPwd !== link.password) {
                return res.send(`
                    <!DOCTYPE html>
                    <html>
                    <head><title>Protegido</title></head>
                    <body style="background: #0b0b10; color: #fff; font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin:0;">
                        <div style="width: 100%; max-width: 380px; background: #161622; padding: 25px; border-radius: 10px; border: 1px solid #333; text-align: center;">
                            <h3 style="color: #a855f7; margin-top: 0;">Enlace Protegido</h3>
                            <p style="font-size: 13px; color: #aaa;">Ingresa la contraseña para continuar:</p>
                            <form method="GET">
                                <input type="password" name="pwd" placeholder="Contraseña" required style="width: 100%; padding: 10px; background: #1a1a2e; border: 1px solid #444; color: #fff; border-radius: 5px; margin-bottom: 12px; box-sizing: border-box;">
                                <button type="submit" style="width: 100%; padding: 10px; background: #8b5cf6; border: none; color: #fff; border-radius: 5px; cursor: pointer; font-weight: bold;">Acceder</button>
                            </form>
                        </div>
                    </body>
                    </html>
                `);
            }
        }

        // Registrar analítica y conteo de clics
        db.run(`UPDATE links SET clicks = clicks + 1 WHERE alias = ?`, [alias]);

        // Si tiene Píxel de Retargeting configurado
        if (link.pixel_id) {
            return res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Redirigiendo...</title>
                    <script>
                      !function(f,b,e,v,n,t,s)
                      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                      if(!f._fbq)f._fbq=n;n.push(n.ready=!0;n.version='2.0';
                      n.queue=[];t=b.createElement(e);t.async=!0;
                      t.src=v;s=b.getElementsByTagName(e)[0];
                      s.parentNode.insertBefore(t,s)}(window, document,'script',
                      'https://connect.facebook.net/en_US/fbevents.js');
                      fbq('init', '${link.pixel_id}');
                      fbq('track', 'PageView');
                    </script>
                    <meta http-equiv="refresh" content="1;url=${link.url_destino}">
                </head>
                <body style="background: #0b0b10; color: #fff; font-family: sans-serif; text-align: center; padding-top: 150px;">
                    <p style="color: #aaa; font-size: 14px;">Redirigiendo a tu destino...</p>
                    <script>
                        setTimeout(function() {
                            window.location.href = "${link.url_destino}";
                        }, 800);
                    </script>
                </body>
                </html>
            `);
        }

        // Redirección directa inmediata
        res.redirect(link.url_destino);
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
