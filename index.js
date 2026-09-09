const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const app = express();

// Configuración básica de Express para leer datos de formularios
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ==========================================
// 1. INICIALIZACIÓN DE LA BASE DE DATOS (PASO 1)
// ==========================================
const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) {
        console.error('Error al abrir la base de datos', err.message);
    } else {
        console.log('Conectado a la base de datos SQLite.');
    }
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
// 2. INTERFAZ VISUAL (HTML con Opciones Avanzadas)
// ==========================================
app.get('/', (req, res) => {
    db.all(`SELECT * FROM links ORDER BY id DESC`, [], (err, rows) => {
        let enlacesHtml = '';
        if (!err && rows) {
            rows.forEach(link => {
                enlacesHtml += `
                    <div style="background: #12121a; padding: 12px; margin-bottom: 10px; border-radius: 6px; border: 1px solid #333;">
                        <span style="color: #a855f7; font-weight: bold;">/${link.alias}</span> (${link.clicks} clics)
                        <div style="font-size: 12px; color: #888; word-break: break-all;">Destino: ${link.url_destino}</div>
                        <a href="/${link.alias}" target="_blank" style="color: #38bdf8; font-size: 12px; text-decoration: none;">Probar Enlace</a>
                    </div>
                `;
            });
        }

        res.send(`
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <title>LinkPulse - Acortador Inteligente</title>
                <style>
                    body { font-family: Arial, sans-serif; background: #0b0b10; color: #fff; display: flex; justify-content: center; padding: 40px 20px; }
                    .container { width: 100%; max-width: 500px; background: #161622; padding: 25px; border-radius: 10px; border: 1px solid #2a2a3d; }
                    h2 { text-align: center; color: #a855f7; }
                    .form-group { margin-bottom: 15px; }
                    label { display: block; margin-bottom: 5px; font-size: 13px; color: #bbb; }
                    input { width: 100%; padding: 10px; background: #1a1a2e; border: 1px solid #333; color: #fff; border-radius: 5px; box-sizing: border-box; }
                    button { width: 100%; padding: 12px; background: #8b5cf6; border: none; color: white; font-weight: bold; border-radius: 5px; cursor: pointer; }
                    button:hover { background: #7c3aed; }
                    fieldset { border: 1px solid #333; border-radius: 5px; padding: 10px; margin-bottom: 15px; }
                    legend { color: #a855f7; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h2>LinkPulse B2B SUITE</h2>
                    <form action="/create" method="POST">
                        <div class="form-group">
                            <label>URL DE DESTINO (ORIGINAL)</label>
                            <input type="url" name="url_destino" required placeholder="https://tuempresa.com/landing">
                        </div>
                        <div class="form-group">
                            <label>ALIAS PERSONALIZADO (OPCIONAL)</label>
                            <input type="text" name="alias" placeholder="oferta-verano">
                        </div>
                        
                        <fieldset>
                            <legend>Opciones Avanzadas (Opcional)</legend>
                            <div class="form-group">
                                <label>ID de Píxel de Retargeting (Meta/TikTok)</label>
                                <input type="text" name="pixel_id" placeholder="Ej: 1234567890">
                            </div>
                            <div class="form-group">
                                <label>Contraseña de protección</label>
                                <input type="password" name="password" placeholder="Opcional">
                            </div>
                            <div class="form-group">
                                <label>Fecha de expiración</label>
                                <input type="datetime-local" name="expires_at">
                            </div>
                        </fieldset>

                        <button type="submit">Generar Enlace Acortado</button>
                    </form>

                    <h3 style="margin-top: 30px; font-size: 16px; border-bottom: 1px solid #333; padding-bottom: 5px;">Enlaces Recientes & Clics</h3>
                    ${enlacesHtml || '<p style="color: #666; font-size: 13px;">No hay enlaces creados todavía.</p>'}
                </div>
            </body>
            </html>
        `);
    });
});

// ==========================================
// 3. CREAR NUEVO ENLACE (Guardar en DB)
// ==========================================
app.post('/create', (req, res) => {
    let { url_destino, alias, pixel_id, password, expires_at } = req.body;
    
    // Si no ingresa alias, generar uno aleatorio corto
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
            return res.status(404).send("Enlace no encontrado.");
        }

        // 1. Verificar si el enlace ha expirado
        if (link.expires_at && new Date() > new Date(link.expires_at)) {
            return res.status(410).send("<h2 style='text-align:center; margin-top:50px;'>Este enlace ha expirado.</h2>");
        }

        // 2. Verificar contraseña si está protegida
        if (link.password) {
            const userPwd = req.query.pwd;
            if (userPwd !== link.password) {
                return res.send(`
                    <div style="max-width: 400px; margin: 100px auto; background: #161622; padding: 20px; border-radius: 8px; color: #fff; font-family: sans-serif; text-align: center; border: 1px solid #333;">
                        <h3>Enlace Protegido</h3>
                        <p style="font-size: 13px; color: #aaa;">Ingresa la contraseña para continuar:</p>
                        <form method="GET">
                            <input type="password" name="pwd" placeholder="Contraseña" required style="width: 100%; padding: 8px; background: #1a1a2e; border: 1px solid #444; color: #fff; border-radius: 4px; margin-bottom: 10px; box-sizing: border-box;">
                            <button type="submit" style="width: 100%; padding: 8px; background: #8b5cf6; border: none; color: #fff; border-radius: 4px; cursor: pointer;">Acceder</button>
                        </form>
                    </div>
                `);
            }
        }

        // 3. Registrar analítica y sumar clic
        db.run(`UPDATE links SET clicks = clicks + 1 WHERE alias = ?`, [alias]);
        db.run(`clicks_log` in db ? `` : `INSERT INTO clicks_log (link_alias, device) VALUES (?, ?)`, [alias, req.headers['user-agent'] || 'Desconocido']);

        // 4. Si tiene Píxel configurado, mostrar página intermedia con el script de rastreo
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
                <body style="background: #0b0b10; color: #fff; font-family: sans-serif; text-align: center; padding-top: 100px;">
                    <p>Redirigiendo a tu destino...</p>
                    <script>
                        setTimeout(function() {
                            window.location.href = "${link.url_destino}";
                        }, 800);
                    </script>
                </body>
                </html>
            `);
        }

        // 5. Si no tiene píxel, redirección limpia inmediata
        res.redirect(link.url_destino);
    });
});

// Iniciar servidor en el puerto que asigne Render o el 3000 por defecto
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
