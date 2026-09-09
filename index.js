const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Configurar motor de vistas y la carpeta views explícitamente
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Ruta principal
app.get('/', (req, res) => {
    res.render('index', { shortUrl: null, originalUrl: null });
});

// Ruta para procesar el acortamiento
app.post('/shorten', (req, res) => {
    const { originalUrl, customAlias } = req.body;
    const mockShortUrl = `https://acortador-retargeting-2.onrender.com/${customAlias || 'mi-enlace'}`;
    
    res.render('index', { shortUrl: mockShortUrl, originalUrl });
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
