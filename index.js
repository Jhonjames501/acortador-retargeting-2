const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Simulador de Base de Datos para enlaces con retargeting
const enlacesDB = {
    "zapatillas": {
        urlOriginal: "https://elcomercio.pe/economia/dia-1/moda-en-peru-tendencias-noticia/",
        pixelCode: `<script>console.log("¡Píxel de Retargeting disparado para Zapatillas!");</script>`
    }
};

app.get('/', (req, res) => {
    res.send('<h1>Bienvenido a tu Acortador con Retargeting B2B</h1><p>Usa /[codigo] para probar la redirección.</p>');
});

app.get('/:codigo', (req, res) => {
    const codigo = req.params.codigo;
    const datosEnlace = enlacesDB[codigo];

    if (!datosEnlace) {
        return res.status(404).send('Enlace no encontrado o expirado.');
    }

    const htmlRespuesta = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Redirigiendo...</title>
            ${datosEnlace.pixelCode}
        </head>
        <body>
            <p>Redirigiendo al contenido...</p>
            <script>
                setTimeout(function() {
                    window.location.href = "${datosEnlace.urlOriginal}";
                }, 400);
            </script>
        </body>
        </html>
    `;

    res.send(htmlRespuesta);
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
