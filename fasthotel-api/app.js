// fasthotel-api/app.js
//
// Configuração do aplicativo Express (API REST) isolada do servidor HTTP.
// server.js passa a apenas iniciar o HTTP + Socket.IO e importar este app.
// Isso permite que o Supertest exercite as rotas reais sem abrir uma porta
// nem subir o Socket.IO. Nenhuma regra de negócio ou rota foi alterada.

const express = require('express');
const cors = require('cors');
const pool = require('./config/db');
const userRoutes = require('./routes/userRoutes');
const roomRoutes = require('./routes/roomRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const guestRoutes = require('./routes/guestRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const consumptionRoutes = require('./routes/consumptionRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const reportRoutes = require('./routes/reportRoutes');
const chatRoutes = require('./routes/chatRoutes');

const app = express();

// Configuração do CORS para Express (HTTP REST API)
const corsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-auth-token'],
};
app.use(cors(corsOptions));
app.use(express.json());

// Rotas da API REST
app.get('/', (req, res) => {
    res.send('API FastHotel está rodando!');
});

app.get('/test-db', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.status(200).json({ message: 'Conexão com o banco de dados bem-sucedida!', time: result.rows[0].now });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erro na conexão com o banco de dados.', error: err.message });
    }
});

// Usar as rotas da API REST
app.use('/api/usuarios', userRoutes);
app.use('/api/quartos', roomRoutes);
app.use('/api/reservas', bookingRoutes);
app.use('/api/hospedes', guestRoutes);
app.use('/api/servicos', serviceRoutes);
app.use('/api/consumos', consumptionRoutes);
app.use('/api/pagamentos', paymentRoutes);
app.use('/api/relatorios', reportRoutes);
app.use('/api/chat', chatRoutes); // Usar as rotas de chat

module.exports = app;
