const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Memoria temporal para guardar los enlaces (ideal para pruebas rápidas)
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
        : Math.random().toString(36.substring(2, 8));
    
    // Guardar la relación en la memoria
    urlDatabase[alias] = originalUrl;

    const mockShortUrl = `https://acortador-retargeting-2.onrender.com/${alias}`;
    res.render('index', { shortUrl: mockShortUrl, originalUrl });
});

// Ruta que captura el alias corto y redirige al enlace original guardado
app.get('/:alias', (req, res) => {
    const alias = req.params.alias;
    const originalUrl = urlDatabase[alias];

    if (originalUrl) {
        return res.redirect(originalUrl);
    } else {
        // Si el enlace no existe o el servidor se reinició, regresa al inicio
        return res.redirect('/');
    }
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
