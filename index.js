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
});

// ==========================================
// 2. PANEL PRINCIPAL (Diseño Ancho y Original)
// ==========================================
app.get('/', async (req, res) => {
    const nuevoAlias = req.query.nuevo;
    let urlGenerada = '';
    
    if (nuevoAlias) {
        urlGenerada = `${req.protocol}://${req.get('host')}/${nuevoAlias}`;
    }

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
                    <div style="background: #12121a; padding: 15px; margin-top: 12px; border-radius: 8px; border: 1px solid #2a2a3d; display: flex; justify-content: space-between; align-items: center;">
                        <div style="overflow: hidden; padding-right: 10px;">
                            <span style="color: #a855f7; font-weight: bold; font-size: 15px;">/${link.alias}</span> 
                            <span style="font-size: 12px; color: #888;">(${link.clicks} clics)</span>
                            <div style="font-size: 12px; color: #aaa; word-break: break-all; margin-top: 4px;">${link.url_destino}</div>
                            <a href="/${link.alias}" target="_blank" style="color: #38bdf8; font-size: 12px; text-decoration: none; display: inline-block; margin-top: 6px;">Probar Enlace &rarr;</a>
                        </div>
                        ${qrSvg ? `<div style="background: #fff; padding: 4px; border-radius: 6px; text-align: center; flex-shrink: 0;">${qrSvg}</div>` : ''}
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
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #07070b; color: #fff; margin: 0; padding: 0; }
                    .header { background: #0e0e14; border-bottom: 1px solid #1f1f2e; padding: 15px 25px; display: flex; justify-content: space-between; align-items: center; }
                    .logo-area { display: flex; align-items: center; gap: 10px; }
                    .logo-icon { background: #f59e0b; color: #000; font-weight: bold; padding: 5px 9px; border-radius: 6px; font-size: 14px; }
                    .logo-text { font-size: 16px; font-weight: bold; color: #fff; }
                    .badge { background: rgba(168, 85, 247, 0.15); color: #a855f7; font-size: 10px; font-weight: bold; padding: 3px 8px; border-radius: 4px; border: 1px solid rgba(168, 85, 247, 0.3); }
                    .status-tag { background: rgba(16, 185, 129, 0.15); color: #34d399; font-size: 11px; padding: 4px 10px; border-radius: 20px; border: 1px solid rgba(16, 185, 129, 0.3); font-weight: 500; }
                    
                    .main-container { max-width: 750px; margin: 40px auto; padding: 0 20px; }
                    .hero-title { text-align: center; font-size: 26px; font-weight: bold; margin-bottom: 8px; color: #fff; }
                    .hero-subtitle { text-align: center; color: #9ca3af; font-size: 13px; margin-bottom: 30px; line-height: 1.5; }
                    
                    .card { background: #12121a; border: 1px solid #1f1f2e; border-radius: 12px; padding: 25px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); margin-bottom: 30px; }
                    .form-group { margin-bottom: 18px; }
                    label { display: block; margin-bottom: 6px; font-size: 11px; color: #9ca3af; font-weight: bold; letter-spacing: 0.5px; text-transform: uppercase; }
                    input { width: 100%; padding: 12px 15px; background: #1a1a26; border: 1px solid #2a2a3d; color: #fff; border-radius: 8px; box-sizing: border-box; font-size: 14px; }
                    input:focus { border-color: #a855f7; outline: none; }
                    
                    fieldset { border: 1px solid #2a2a3d; border-radius: 8px; padding: 15px; margin: 20px 0; background: #0b0b10; }
                    legend { color: #a855f7; font-size: 12px; font-weight: bold; padding: 0 6px; text-transform: uppercase; }

                    button { width: 100%; padding: 14px; background: linear-gradient(135deg, #8b5cf6, #7c3aed); border: none; color: white; font-weight: bold; border-radius: 8px; cursor: pointer; font-size: 15px; box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3); }
                    button:hover { opacity: 0.9; }

                    .success-box { background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); padding: 15px; border-radius: 8px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: center; }
                    .success-title { color: #34d399; font-size: 12px; font-weight: bold; margin-bottom: 5px; text-transform: uppercase; }
                    .success-url { color: #fff; font-size: 13px; word-break: break-all; }
                    .copy-btn { background: #34d399; color: #000; border: none; padding: 8px 14px; font-weight: bold; border-radius: 6px; cursor: pointer; font-size: 12px; flex-shrink: 0; margin-left: 10px; }

                    .section-title { font-size: 15px; font-weight: bold; color: #fff; margin-bottom: 15px; border-bottom: 1px solid #1f1f2e; padding-bottom: 10px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="logo-area">
                        <div class="logo-icon">⚡</div>
                        <span class="logo-text">LinkPulse</span>
                        <span class="badge">B2B SUITE</span>
                    </div>
                    <div class="status-tag">Estado: • Activo</div>
                </div>

                <div class="main-container">
                    <div class="hero-title">Acortador Inteligente & Retargeting</div>
                    <div class="hero-subtitle">Crea enlaces corporativos de alto rendimiento, rastrea conversiones y despliega píxeles de retargeting en tiempo real.</div>

                    ${urlGenerada ? `
                        <div class="success-box">
                            <div>
                                <div class="success-title">¡Enlace generado con éxito!</div>
                                <div class="success-url" id="link-text">${urlGenerada}</div>
                            </div>
                            <button class="copy-btn" onclick="navigator.clipboard.writeText('${urlGenerada}'); alert('¡Enlace copiado al portapapeles!');">Copiar</button>
                        </div>
                    ` : ''}

                    <div class="card">
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
                                <div class="form-group" style="margin-bottom: 12px;">
                                    <label>ID de Píxel de Retargeting (Meta/TikTok)</label>
                                    <input type="text" name="pixel_id" placeholder="Ej: 1234567890">
                                </div>
                                <div class="form-group" style="margin-bottom: 12px;">
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
                    </div>

                    <div class="section-title">Enlaces Recientes, Clics & Códigos QR</div>
                    <div>
                        ${enlacesHtml || '<p style="color: #666; font-size: 13px; text-align: center; padding: 20px;">No hay enlaces creados todavía.</p>'}
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
        res.redirect(`/?nuevo=${linkAlias}`);
    });
});

// ==========================================
// 4. REDIRECCIÓN INTELIGENTE, PÍXELES, SEGURIDAD Y PÁGINA INTERMEDIA CON ANUNCIOS
// ==========================================
app.get('/:alias', (req, res) => {
    const alias = req.params.alias;

    db.get(`SELECT * FROM links WHERE alias = ?`, [alias], (err, link) => {
        if (err || !link) {
            return res.status(404).send("<h2 style='text-align:center; margin-top:50px; font-family:sans-serif; color:#fff; background:#07070b;'>Enlace no encontrado.</h2>");
        }

        if (link.expires_at && new Date() > new Date(link.expires_at)) {
            return res.status(410).send("<h2 style='text-align:center; margin-top:50px; font-family:sans-serif; color:#ff5555; background:#07070b;'>Este enlace ha expirado.</h2>");
        }

        if (link.password) {
            const userPwd = req.query.pwd;
            if (userPwd !== link.password) {
                return res.send(`
                    <!DOCTYPE html>
                    <html>
                    <head><title>Protegido</title></head>
                    <body style="background: #07070b; color: #fff; font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin:0;">
                        <div style="width: 100%; max-width: 360px; background: #12121a; padding: 25px; border-radius: 10px; border: 1px solid #2a2a3d; text-align: center;">
                            <h3 style="color: #a855f7; margin-top: 0;">Enlace Protegido</h3>
                            <p style="font-size: 13px; color: #aaa;">Ingresa la contraseña para continuar:</p>
                            <form method="GET">
                                <input type="password" name="pwd" placeholder="Contraseña" required style="width: 100%; padding: 11px; background: #1a1a26; border: 1px solid #2a2a3d; color: #fff; border-radius: 6px; margin-bottom: 12px; box-sizing: border-box;">
                                <button type="submit" style="width: 100%; padding: 11px; background: #8b5cf6; border: none; color: #fff; border-radius: 6px; cursor: pointer; font-weight: bold;">Acceder</button>
                            </form>
                        </div>
                    </body>
                    </html>
                `);
            }
        }

        // Incrementar el contador de clics en SQLite
        db.run(`UPDATE links SET clicks = clicks + 1 WHERE alias = ?`, [alias]);

        // Renderizar la página intermedia moderna con indicaciones claras y diseño fluido
        res.send(`
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>LinkPulse - Redirigiendo de forma segura...</title>
                ${link.pixel_id ? `
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
                </script>` : ''}
                <style>
                    body { 
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
                        background: #07070b; 
                        color: #fff; 
                        margin: 0; 
                        display: flex; 
                        justify-content: center; 
                        align-items: center; 
                        min-height: 100vh; 
                    }
                    .redirect-card { 
                        background: #12121a; 
                        padding: 24px; 
                        border-radius: 16px; 
                        width: 90%; 
                        max-width: 380px; 
                        border: 1px solid #2a2a3d; 
                        box-shadow: 0 15px 35px rgba(0,0,0,0.6); 
                        text-align: center;
                    }
                    .brand-header {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                        margin-bottom: 15px;
                    }
                    .brand-icon { background: #f59e0b; color: #000; font-weight: bold; padding: 3px 7px; border-radius: 5px; font-size: 12px; }
                    .brand-name { font-weight: bold; font-size: 15px; color: #fff; letter-spacing: 0.5px; }
                    
                    .info-box {
                        background: rgba(168, 85, 247, 0.08);
                        border: 1px solid rgba(168, 85, 247, 0.2);
                        padding: 10px 14px;
                        border-radius: 8px;
                        font-size: 13px;
                        color: #d8b4fe;
                        margin-bottom: 20px;
                        line-height: 1.4;
                    }
                    .timer-text {
                        color: #34d399;
                        font-weight: bold;
                    }
                    
                    .ad-container { 
                        margin: 15px auto; 
                        width: 300px; 
                        min-height: 250px; 
                        background: #1a1a26; 
                        border: 1px solid #2a2a3d; 
                        border-radius: 10px; 
                        display: flex; 
                        align-items: center; 
                        justify-content: center; 
                        overflow: hidden; 
                    }
                    
                    #btn { 
                        display: none; 
                        margin-top: 20px; 
                        padding: 14px; 
                        background: linear-gradient(135deg, #8b5cf6, #7c3aed); 
                        color: #fff; 
                        font-weight: bold; 
                        border: none; 
                        border-radius: 8px; 
                        cursor: pointer; 
                        text-decoration: none; 
                        width: 100%; 
                        box-sizing: border-box; 
                        font-size: 15px; 
                        box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4); 
                        transition: opacity 0.2s;
                    }
                    #btn:hover { opacity: 0.9; }
                </style>
            </head>
            <body>
                <div class="redirect-card">
                    <div class="brand-header">
                        <div class="brand-icon">⚡</div>
                        <span class="brand-name">LinkPulse</span>
                    </div>

                    <div class="info-box" id="status-msg">
                        Espera <span class="timer-text" id="countdown">5</span> segundos para desbloquear tu destino de forma segura.
                    </div>
                    
                    <!-- ESPACIO PUBLICITARIO (Adsterra Banner 300x250) -->
                    <div class="ad-container">
                        <script>
                          atOptions = {
                            'key' : 'f434940b00cac3b31afb1cee2d82482f',
                            'format' : 'iframe',
                            'height' : 250,
                            'width' : 300,
                            'params' : {}
                          };
                        </script>
                        <script src="https://www.highrevenueformat.com/f434940b00cac3b31afb1cee2d82482f/invoke.js"></script>
                    </div>

                    <a id="btn" href="${link.url_destino}">Ir al enlace de destino &rarr;</a>
                </div>

                <script>
                    let seconds = 5;
                    let countdownEl = document.getElementById('countdown');
                    let statusMsg = document.getElementById('status-msg');
                    let btn = document.getElementById('btn');

                    let timer = setInterval(() => {
                        seconds--;
                        if (countdownEl) countdownEl.innerText = seconds;
                        
                        if (seconds <= 0) {
                            clearInterval(timer);
                            statusMsg.style.background = 'rgba(16, 185, 129, 0.1)';
                            statusMsg.style.borderColor = 'rgba(16, 185, 129, 0.3)';
                            statusMsg.style.color = '#34d399';
                            statusMsg.innerHTML = '¡Tu enlace está listo para continuar!';
                            btn.style.display = 'block';
                        }
                    }, 1000);
                </script>
            </body>
            </html>
        `);
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
