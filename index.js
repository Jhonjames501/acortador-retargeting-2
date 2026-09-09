const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Memoria temporal para guardar los enlaces
const urlDatabase = {};

app.set('view engine', 'ejs');
app.set('views', __dirname);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Ruta principal (Muestra la interfaz)
app.get('/', (req, res) => {
    res.render('index', { shortUrl: null, originalUrl: null });
});

// Ruta para generar el enlace y guardarlo
app.post('/shorten', (req, res) => {
    const { originalUrl, customAlias } = req.body;
    
    // Generar un alias aleatorio si el usuario no puso uno
    const alias = customAlias && customAlias.trim() !== '' 
        ? customAlias.trim() 
        : Math.random().toString(36).substring(2, 8);
    
    // Guardar la relación en la memoria
    urlDatabase[alias] = originalUrl;

    const mockShortUrl = `https://acortador-retargeting-2.onrender.com/${alias}`;
    res.render('index', { shortUrl: mockShortUrl, originalUrl });
});

// Ruta de redirección inteligente para forzar apertura en app nativa
app.get('/:alias', (req, res) => {
    const alias = req.params.alias;
    const originalUrl = urlDatabase[alias];

    if (!originalUrl) {
        return res.redirect('/');
    }

    // Renderizamos una vista intermedia optimizada para móviles
    res.send(`
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
                <a href="${originalUrl}" class="w-full block bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-4 rounded-xl transition duration-200 shadow-lg shadow-purple-600/30 text-sm">
                    Abrir en la aplicación
                </a>
            </div>
            <script>
                // Intento automático de apertura tras medio segundo
                setTimeout(() => {
                    window.location.href = "${originalUrl}";
                }, 500);
            </script>
        </body>
        </html>
    `);
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
