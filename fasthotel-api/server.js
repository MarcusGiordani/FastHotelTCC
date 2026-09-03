// fasthotel-api/server.js

require('dotenv').config();
const http = require('http'); // <-- NOVO/MODIFICADO PARA CHAT: Importa o módulo HTTP
const { Server } = require('socket.io'); // <-- NOVO/MODIFICADO PARA CHAT: Importa o Socket.IO Server
const pool = require('./config/db');
const app = require('./app'); // Configuração do Express (rotas REST) — ver app.js

const port = process.env.PORT || 5000;

// --- Configuração do Servidor HTTP para Socket.IO --- // <-- ESSAS SÃO AS LINHAS QUE FALTAVAM
const server = http.createServer(app); // Cria um servidor HTTP a partir do app Express

// Configuração do Socket.IO (permitindo CORS para a porta do React)
const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
    }
});

// Eventos do Socket.IO
io.on('connection', (socket) => {
    console.log(`[SOCKET.IO] Usuário conectado: ${socket.id}`);

    socket.on('join_room', (conversa_id) => {
        socket.join(conversa_id);
        console.log(`[SOCKET.IO] Usuário ${socket.id} entrou na sala: ${conversa_id}`);
    });

    socket.on('send_message', async (messageData) => {
        // messageData deve conter: { conversa_id, remetente_tipo, remetente_id_interno, conteudo }
        console.log(`[SOCKET.IO] Mensagem recebida na sala ${messageData.conversa_id}: ${messageData.conteudo}`);

        try {
            // Salvar a mensagem no banco de dados
            const newMessage = await pool.query(
                `INSERT INTO mensagens_chat (conversa_id, remetente_tipo, remetente_id_interno, conteudo)
                 VALUES ($1, $2, $3, $4) RETURNING id, data_envio`,
                [messageData.conversa_id, messageData.remetente_tipo, messageData.remetente_id_interno, messageData.conteudo]
            );

            const fullMessage = {
                ...messageData,
                id: newMessage.rows[0].id,
                data_envio: newMessage.rows[0].data_envio
            };

            // Envia a mensagem para todos os clientes na mesma sala
            io.to(messageData.conversa_id).emit('receive_message', fullMessage);
        } catch (err) {
            console.error('[SOCKET.IO] Erro ao salvar/enviar mensagem:', err.message);
            socket.emit('message_error', { message: 'Falha ao enviar a mensagem.' });
        }
    });

    socket.on('disconnect', () => {
        console.log(`[SOCKET.IO] Usuário desconectado: ${socket.id}`);
    });
});

// --- Iniciar o Servidor HTTP (Socket.IO e Express) --- // <-- MODIFICADO: Agora 'server.listen'
server.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
    console.log(`Servidor Socket.IO rodando em ws://localhost:${port}`);
});
