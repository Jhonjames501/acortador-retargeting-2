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
// 2. PANEL PRINCIPAL (Diseño Original y Estilizado)
// ==========================================
app.get('/', async (req, res) => {
    db.all(`SELECT * FROM links ORDER BY id DESC`, [], async (err, rows) => {
        let enlacesHtml = '';
        
        if (!err && rows) {
            for (let link of rows) {
                const fullShortUrl = `${req.protocol}://${req.get('host')}/${link.alias}`;
                
                let qrSvg = '';
                try {
                    qrSvg = await QRCode.toString(fullShortUrl, { type: 'svg', width: 75, margin: 1 });
                } catch (e) {
                    qrSvg = '';
                }

                enlacesHtml += `
                    <div style="background: rgba(26, 26, 46, 0.6); padding: 14px; margin-top: 10px; border-radius: 8px; border: 1px solid rgba(168, 85, 247, 0.2); display: flex; justify-content: space-between; align-items: center;">
                        <div style="overflow: hidden; padding-right: 10px;">
                            <span style="color: #a855f7; font-weight: bold; font-size: 14px; background: rgba(168,85,247,0.1); padding: 3px 8px; border-radius: 4px; display: inline-block; margin-bottom: 5px;">/${link.alias}</span> 
                            <span style="font-size: 11px; color: #aaa;">(${link.clicks} clics)</span>
                            <div style="font-size: 12px; color: #888; word-break: break-all; margin-top: 2px;">${link.url_destino}</div>
                            <a href="/${link.alias}" target="_blank" style="color: #38bdf8; font-size: 11px; text-decoration: none; display: inline-block; margin-top: 4px;">Probar Enlace &rarr;</a>
                        </div>
                        ${qrSvg ? `<div style="background: #fff; padding: 4px; border-radius: 6px; text-align: center; flex-shrink: 0; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">${qrSvg}</div>` : ''}
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
                    body { 
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
                        background: #07070b; 
                        color: #fff; 
                        margin: 0; 
                        padding: 20px 10px; 
                        display: flex; 
                        justify-content: center; 
                    }
                    .container { 
                        width: 100%; 
                        max-width: 500px; 
                        background: #111119; 
                        padding: 24px; 
                        border-radius: 14px; 
                        border: 1px solid rgba(255, 255, 255, 0.08); 
                        box-shadow: 0 10px 30px rgba(0,0,0,0.6); 
                    }
                    .logo-area {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                        margin-bottom: 20px;
                    }
                    .badge {
                        background: rgba(168, 85, 247, 0.15);
                        color: #a855f7;
                        font-size: 10px;
                        font-weight: bold;
                        padding: 3px 8px;
                        border-radius: 20px;
                        letter-spacing: 0.5px;
                        border: 1px solid rgba(168, 85, 247, 0.3);
                    }
                    h2 { 
                        text-align: center; 
                        color: #fff; 
                        margin: 0; 
                        font-size: 18px; 
                        font-weight: 600;
                    }
                    .subtitle {
                        text-align: center;
                        color: #71717a;
                        font-size: 12px;
                        margin-top: 5px;
                        margin-bottom: 25px;
                    }
                    .form-group { 
                        margin-bottom: 14px; 
                    }
                    label { 
                        display: block; 
                        margin-bottom: 6px; 
                        font-size: 11px; 
                        color: #a1a1aa; 
                        font-weight: 600; 
                        letter-spacing: 0.5px;
                        text-transform: uppercase; 
                    }
                    input { 
                        width: 100%; 
                        padding: 11px 14px; 
                        background: #181824; 
                        border: 1px solid #27273a; 
                        color: #fff; 
                        border-radius: 8px; 
                        box-sizing: border-box; 
                        font-size: 13px; 
                        transition: all 0.2s;
                    }
                    input:focus { 
                        border-color: #a855f7; 
                        outline: none; 
                        box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.15);
                    }
                    button { 
                        width: 100%; 
                        padding: 13px; 
                        background: linear-gradient(135deg, #9333ea, #7c3aed); 
                        border: none; 
                        color: white; 
                        font-weight: bold; 
                        border-radius: 8px; 
                        cursor: pointer; 
                        font-size: 14px; 
                        margin-top: 5px;
                        transition: opacity 0.2s; 
                        box-shadow: 0 4px 12px rgba(147, 51, 234, 0.3);
                    }
                    button:hover { 
                        opacity: 0.9; 
                    }
                    fieldset { 
                        border: 1px solid #222232; 
                        border-radius: 8px; 
                        padding: 12px 14px; 
                        margin: 18px 0; 
                        background: rgba(18, 18, 26, 0.5); 
                    }
                    legend { 
                        color: #a855f7; 
                        font-size: 11px; 
                        font-weight: bold; 
                        padding: 0 6px; 
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }
                    .section-title { 
                        margin-top: 30px; 
                        font-size: 13px; 
                        font-weight: bold;
                        border-bottom: 1px solid #222232; 
                        padding-bottom: 8px; 
                        color: #a1a1aa; 
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }
                    .db-tag {
                        font-size: 10px;
                        color: #52525b;
                        background: #181824;
                        padding: 2px 6px;
                        border-radius: 4px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="logo-area">
                        <h2>LinkPulse</h2>
                        <span class="badge">B2B SUITE</span>
                    </div>
                    <div class="subtitle">Crea enlaces corporativos de alto rendimiento, rastrea conversiones y despliega píxeles de retargeting en tiempo real.</div>
                    
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
                                <label>ID de Píxel (Meta / TikTok)</label>
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

                        <button type="submit">Generar Enlace Acortado</button>
                    </form>

                    <div class="section-title">
                        <span>Enlaces Recientes & Clics</span>
                        <span class="db-tag">BASE DE DATOS SQLITE</span>
                    </div>
                    
                    <div style="margin-top: 10px;">
                        ${enlacesHtml || '<p style="color: #52525b; font-size: 12px; text-align: center; padding: 15px 0;">No hay enlaces creados todavía.</p>'}
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

        if (link.expires_at && new Date() > new Date(link.expires_at)) {
            return res.status(410).send("<h2 style='text-align:center; margin-top:50px; font-family:sans-serif; color:#ff5555;'>Este enlace ha expirado.</h2>");
        }

        if (link.password) {
            const userPwd = req.query.pwd;
            if (userPwd !== link.password) {
                return res.send(`
                    <!DOCTYPE html>
                    <html>
                    <head><title>Protegido</title></head>
                    <body style="background: #07070b; color: #fff; font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin:0;">
                        <div style="width: 100%; max-width: 360px; background: #111119; padding: 24px; border-radius: 12px; border: 1px solid #222232; text-align: center;">
                            <h3 style="color: #a855f7; margin-top: 0; font-size: 16px;">Enlace Protegido</h3>
                            <p style="font-size: 12px; color: #a1a1aa; margin-bottom: 16px;">Ingresa la contraseña para continuar:</p>
                            <form method="GET">
                                <input type="password" name="pwd" placeholder="Contraseña" required style="width: 100%; padding: 11px; background: #181824; border: 1px solid #27273a; color: #fff; border-radius: 8px; margin-bottom: 12px; box-sizing: border-box; font-size: 13px;">
                                <button type="submit" style="width: 100%; padding: 11px; background: #9333ea; border: none; color: #fff; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 13px;">Acceder</button>
                            </form>
                        </div>
                    </body>
                    </html>
                `);
            }
        }

        db.run(`UPDATE links SET clicks = clicks + 1 WHERE alias = ?`, [alias]);

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
                <body style="background: #07070b; color: #fff; font-family: sans-serif; text-align: center; padding-top: 150px;">
                    <p style="color: #71717a; font-size: 13px;">Redirigiendo a tu destino...</p>
                    <script>
                        setTimeout(function() {
                            window.location.href = "${link.url_destino}";
                        }, 800);
                    </script>
                </body>
                </html>
            `);
        }

        res.redirect(link.url_destino);
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
