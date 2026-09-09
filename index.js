const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Indicar explícitamente que las vistas están en la carpeta raíz actual
app.set('view engine', 'ejs');
app.set('views', __dirname);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get('/', (req, res) => {
    res.render('index', { shortUrl: null, originalUrl: null });
});

app.post('/shorten', (req, res) => {
    const { originalUrl, customAlias } = req.body;
    const mockShortUrl = `https://acortador-retargeting-2.onrender.com/${customAlias || 'mi-enlace'}`;
    res.render('index', { shortUrl: mockShortUrl, originalUrl });
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
