const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', __dirname);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Ruta principal (Muestra la interfaz)
app.get('/', (req, res) => {
    res.render('index', { shortUrl: null, originalUrl: null });
});

// Ruta para generar el enlace
app.post('/shorten', (req, res) => {
    const { originalUrl, customAlias } = req.body;
    const alias = customAlias || 'enlace';
    const mockShortUrl = `https://acortador-retargeting-2.onrender.com/${alias}`;
    res.render('index', { shortUrl: mockShortUrl, originalUrl });
});

// NUEVA RUTA: Captura el enlace acortado y redirige al destino original
app.get('/:alias', (req, res) => {
    const alias = req.params.alias;
    
    // Aquí puedes poner una URL de prueba general o base de datos en el futuro.
    // Por ahora, redirigirá a Google (o puedes cambiarlo por la URL que desees redireccionar).
    const destinoReal = 'https://google.com'; 
    
    res.redirect(destinoReal);
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
