const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', __dirname);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Inicializar la Base de Datos SQLite (persistencia permanente)
let db;
async function initializeDatabase() {
    db = await open({
        filename: path.join(__dirname, 'database.sqlite'),
        driver: sqlite3.Database
    });

    // Crear la tabla si no existe
    await db.exec(`
        CREATE TABLE IF NOT EXISTS links (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            alias TEXT UNIQUE,
            originalUrl TEXT,
            clicks INTEGER DEFAULT 0,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    console.log("Base de datos SQLite conectada y lista.");
}

initializeDatabase();

// Ruta principal (Muestra la interfaz y la lista de enlaces recientes con estadísticas)
app.get('/', async (req, res) => {
    try {
        const links = db ? await db.all('SELECT * FROM links ORDER BY id DESC LIMIT 5') : [];
        res.render('index', { shortUrl: null, originalUrl: null, links, error: null });
    } catch (error) {
        res.render('index', { shortUrl: null, originalUrl: null, links: [], error: null });
    }
});

// Ruta para generar el enlace y guardarlo en SQLite
app.post('/shorten', async (req, res) => {
    const { originalUrl, customAlias } = req.body;
    
    let alias = customAlias && customAlias.trim() !== '' 
        ? customAlias.trim() 
        : Math.random().toString(36).substring(2, 8);

    try {
        await db.run(
            'INSERT INTO links (alias, originalUrl, clicks) VALUES (?, ?, ?)',
            [alias, originalUrl, 0]
        );

        const mockShortUrl = `https://acortador-retargeting-2.onrender.com/${alias}`;
        const links = await db.all('SELECT * FROM links ORDER BY id DESC LIMIT 5');
        
        res.render('index', { shortUrl: mockShortUrl, originalUrl, links, error: null });
    } catch (error) {
        const links = await db.all('SELECT * FROM links ORDER BY id DESC LIMIT 5');
        res.render('index', { shortUrl: null, originalUrl, links, error: 'El alias personalizado ya está en uso. Prueba con otro.' });
    }
});

// Ruta que captura el alias corto, suma +1 al contador y redirige
app.get('/:alias', async (req, res) => {
    const alias = req.params.alias;

    try {
        const link = await db.get('SELECT * FROM links WHERE alias = ?', [alias]);

        if (link) {
            await db.run('UPDATE links SET clicks = clicks + 1 WHERE alias = ?', [alias]);

            return res.send(`
                <!DOCTYPE html>
                <html lang="es">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Abriendo enlace...</title>
                    <script src="https://cdn.tailwindcss.com"></script>
                </head>
                <body class="bg-slate-950 text-white flex items-center justify-center h-screen px-4">
                    <div class="text-center p-6 max-w-sm w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl">
                        <div class="animate-pulse mb-4">
                            <span class="inline-block bg-purple-600/20 text-purple-400 p-3 rounded-full text-2xl">⚡</span>
                        </div>
                        <h1 class="text-lg font-bold mb-2">Redirigiendo a tu contenido...</h1>
                        <p class="text-slate-400 text-xs mb-6">Si no se abre automáticamente en la aplicación, presiona el botón de abajo.</p>
                        <a href="${link.originalUrl}" class="w-full block bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-4 rounded-xl transition duration-200 shadow-lg shadow-purple-600/30 text-sm">
                            Abrir en la aplicación
                        </a>
                    </div>
                    <script>
                        setTimeout(() => {
                            window.location.href = "${link.originalUrl}";
                        }, 500);
                    </script>
                </body>
                </html>
            `);
        } else {
            return res.redirect('/');
        }
    } catch (error) {
        return res.redirect('/');
    }
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
