// fasthotel-api/controllers/roomController.js
const pool = require('../config/db'); // Importa a conexão com o banco de dados

// Quando "tipo_id" é enviado, resolve o tipo cadastrado (tipos_quarto) e retorna
// o nome para manter "quartos.tipo" (texto) sempre sincronizado — preserva os
// relatórios existentes que agrupam por esse texto. Sem "tipo_id" (uso legado),
// "tipo" continua sendo gravado como texto livre, exatamente como antes.
async function resolverTipo(tipo_id, tipoTextoFallback, queryable) {
    if (tipo_id === undefined || tipo_id === null || tipo_id === '') {
        return { tipo_id: null, tipo: tipoTextoFallback };
    }
    const { rows } = await queryable.query('SELECT nome FROM tipos_quarto WHERE id = $1', [tipo_id]);
    if (rows.length === 0) {
        return { erro: 'Tipo de quarto não encontrado.' };
    }
    return { tipo_id, tipo: rows[0].nome };
}

// Criar um novo quarto
const createRoom = async (req, res) => {
    const { numero, tipo, tipo_id, capacidade, preco_por_noite, status, descricao, url_imagem } = req.body;

    try {
        // 1. Verificar se o número do quarto já existe
        const existingRoom = await pool.query('SELECT * FROM quartos WHERE numero = $1', [numero]);
        if (existingRoom.rows.length > 0) {
            return res.status(400).json({ message: 'Número do quarto já cadastrado.' });
        }

        const resolvido = await resolverTipo(tipo_id, tipo, pool);
        if (resolvido.erro) {
            return res.status(400).json({ message: resolvido.erro });
        }

        // 2. Inserir o novo quarto no banco de dados
        const newRoom = await pool.query(
            'INSERT INTO quartos (numero, tipo, tipo_id, capacidade, preco_por_noite, status, descricao, url_imagem) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
            [numero, resolvido.tipo, resolvido.tipo_id, capacidade, preco_por_noite, status || 'disponivel', descricao, url_imagem] // 'disponivel' como padrão
        );

        res.status(201).json({
            message: 'Quarto criado com sucesso!',
            room: newRoom.rows[0]
        });

    } catch (err) {
        console.error('Erro ao criar quarto:', err.message);
        res.status(500).json({ message: 'Erro no servidor ao criar quarto.', error: err.message });
    }
};

// Obter todos os quartos (com filtros de disponibilidade/tipo)
// status=disponivel também exclui quartos com limpeza pendente/em andamento —
// mesma regra que bookingController já aplica ao aceitar uma reserva, para que
// a listagem nunca ofereça um quarto que seria rejeitado na hora de reservar.
const getAllRooms = async (req, res) => {
    const { status, tipo_id } = req.query;

    try {
        let query = `
            SELECT q.*, tq.nome AS tipo_nome, tq.descricao AS tipo_descricao
            FROM quartos q
            LEFT JOIN tipos_quarto tq ON q.tipo_id = tq.id
        `;
        const conditions = [];
        const params = [];

        if (status) {
            params.push(status);
            conditions.push(`q.status = $${params.length}`);
        }
        if (tipo_id) {
            params.push(tipo_id);
            conditions.push(`q.tipo_id = $${params.length}`);
        }
        if (status === 'disponivel') {
            conditions.push(`NOT EXISTS (
                SELECT 1 FROM limpezas l WHERE l.quarto_id = q.id AND l.status IN ('pendente', 'em_andamento')
            )`);
        }

        if (conditions.length > 0) {
            query += ` WHERE ${conditions.join(' AND ')}`;
        }
        query += ' ORDER BY CAST(q.numero AS INTEGER) ASC';

        const allRooms = await pool.query(query, params);
        res.status(200).json(allRooms.rows);
    } catch (err) {
        console.error('Erro ao buscar quartos:', err.message);
        res.status(500).json({ message: 'Erro no servidor ao buscar quartos.', error: err.message });
    }
};

// Obter um quarto por ID
const getRoomById = async (req, res) => {
    const { id } = req.params;
    try {
        const room = await pool.query(
            `SELECT q.*, tq.nome AS tipo_nome, tq.descricao AS tipo_descricao
             FROM quartos q
             LEFT JOIN tipos_quarto tq ON q.tipo_id = tq.id
             WHERE q.id = $1`,
            [id],
        );
        if (room.rows.length === 0) {
            return res.status(404).json({ message: 'Quarto não encontrado.' });
        }
        res.status(200).json(room.rows[0]);
    } catch (err) {
        console.error('Erro ao buscar quarto por ID:', err.message);
        res.status(500).json({ message: 'Erro no servidor ao buscar quarto.', error: err.message });
    }
};

// Atualizar um quarto. Mantém o comportamento original (sobrescreve com o que
// vier no corpo) — só a resolução de tipo/tipo_id é nova.
const updateRoom = async (req, res) => {
    const { id } = req.params;
    const { numero, tipo, tipo_id, capacidade, preco_por_noite, status, descricao, url_imagem } = req.body;

    try {
        const resolvido = await resolverTipo(tipo_id, tipo, pool);
        if (resolvido.erro) {
            return res.status(400).json({ message: resolvido.erro });
        }

        const updatedRoom = await pool.query(
            'UPDATE quartos SET numero = $1, tipo = $2, tipo_id = $3, capacidade = $4, preco_por_noite = $5, status = $6, descricao = $7, url_imagem = $8 WHERE id = $9 RETURNING *',
            [numero, resolvido.tipo, resolvido.tipo_id, capacidade, preco_por_noite, status, descricao, url_imagem, id]
        );

        if (updatedRoom.rows.length === 0) {
            return res.status(404).json({ message: 'Quarto não encontrado para atualização.' });
        }

        res.status(200).json({
            message: 'Quarto atualizado com sucesso!',
            room: updatedRoom.rows[0]
        });

    } catch (err) {
        console.error('Erro ao atualizar quarto:', err.message);
        res.status(500).json({ message: 'Erro no servidor ao atualizar quarto.', error: err.message });
    }
};

// Deletar um quarto
const deleteRoom = async (req, res) => {
    const { id } = req.params;
    try {
        const deletedRoom = await pool.query('DELETE FROM quartos WHERE id = $1 RETURNING id', [id]);
        if (deletedRoom.rows.length === 0) {
            return res.status(404).json({ message: 'Quarto não encontrado para exclusão.' });
        }
        res.status(200).json({ message: 'Quarto excluído com sucesso!', id: id });
    } catch (err) {
        console.error('Erro ao deletar quarto:', err.message);
        res.status(500).json({ message: 'Erro no servidor ao deletar quarto.', error: err.message });
    }
};

module.exports = {
    createRoom,
    getAllRooms,
    getRoomById,
    updateRoom,
    deleteRoom
};
