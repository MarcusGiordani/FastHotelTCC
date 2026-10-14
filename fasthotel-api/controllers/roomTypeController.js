// fasthotel-api/controllers/roomTypeController.js
//
// Catálogo de tipos de apartamento (Standard/Luxo/Suíte/...). Gerenciado só
// por admin. "quartos.tipo" (texto) é mantido sincronizado com tipos_quarto.nome
// pelo roomController sempre que um quarto é criado/editado ou um tipo é
// renomeado, preservando relatórios existentes que agrupam por esse texto.
const pool = require('../config/db');

// GET /api/tipos-quarto?ativo=true|false — por padrão lista só os ativos
// (necessário para o filtro de reservas); ?ativo=false lista os desativados.
const getAllRoomTypes = async (req, res) => {
    const { ativo } = req.query;
    try {
        let query = 'SELECT * FROM tipos_quarto';
        const params = [];
        if (ativo === 'false') {
            query += ' WHERE ativo = FALSE';
        } else if (ativo !== 'all') {
            query += ' WHERE ativo = TRUE';
        }
        query += ' ORDER BY nome ASC';
        const { rows } = await pool.query(query, params);
        res.status(200).json(rows);
    } catch (err) {
        console.error('Erro ao buscar tipos de quarto:', err.message);
        res.status(500).json({ message: 'Erro no servidor ao buscar tipos de quarto.', error: err.message });
    }
};

const getRoomTypeById = async (req, res) => {
    const { id } = req.params;
    try {
        const { rows } = await pool.query('SELECT * FROM tipos_quarto WHERE id = $1', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Tipo de quarto não encontrado.' });
        }
        res.status(200).json(rows[0]);
    } catch (err) {
        console.error('Erro ao buscar tipo de quarto por ID:', err.message);
        res.status(500).json({ message: 'Erro no servidor ao buscar tipo de quarto.', error: err.message });
    }
};

const createRoomType = async (req, res) => {
    const { nome, descricao, capacidade_padrao, preco_base } = req.body;

    if (!nome || !nome.trim()) {
        return res.status(400).json({ message: 'Nome do tipo de quarto é obrigatório.' });
    }

    try {
        const existente = await pool.query('SELECT id FROM tipos_quarto WHERE LOWER(nome) = LOWER($1)', [nome.trim()]);
        if (existente.rows.length > 0) {
            return res.status(400).json({ message: 'Já existe um tipo de quarto com esse nome.' });
        }

        const { rows } = await pool.query(
            `INSERT INTO tipos_quarto (nome, descricao, capacidade_padrao, preco_base)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [nome.trim(), descricao || null, capacidade_padrao || null, preco_base || null],
        );
        res.status(201).json({ message: 'Tipo de quarto criado com sucesso!', roomType: rows[0] });
    } catch (err) {
        console.error('Erro ao criar tipo de quarto:', err.message);
        res.status(500).json({ message: 'Erro no servidor ao criar tipo de quarto.', error: err.message });
    }
};

// PUT /api/tipos-quarto/:id — edita nome/descrição/capacidade/preço. "ativo"
// propositalmente nunca é lido daqui (desativar é uma ação própria, abaixo).
// Se o nome mudar, sincroniza quartos.tipo (texto) de todos os quartos desse tipo.
const updateRoomType = async (req, res) => {
    const { id } = req.params;
    const { nome, descricao, capacidade_padrao, preco_base } = req.body;

    if (nome !== undefined && !nome.trim()) {
        return res.status(400).json({ message: 'Nome do tipo de quarto não pode ser vazio.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        if (nome !== undefined) {
            const duplicado = await client.query(
                'SELECT id FROM tipos_quarto WHERE LOWER(nome) = LOWER($1) AND id != $2',
                [nome.trim(), id],
            );
            if (duplicado.rows.length > 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ message: 'Já existe um tipo de quarto com esse nome.' });
            }
        }

        const { rows } = await client.query(
            `UPDATE tipos_quarto SET
                nome = COALESCE($1, nome),
                descricao = COALESCE($2, descricao),
                capacidade_padrao = COALESCE($3, capacidade_padrao),
                preco_base = COALESCE($4, preco_base)
             WHERE id = $5
             RETURNING *`,
            [nome?.trim(), descricao, capacidade_padrao, preco_base, id],
        );

        if (rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Tipo de quarto não encontrado para atualização.' });
        }

        if (nome !== undefined) {
            await client.query('UPDATE quartos SET tipo = $1 WHERE tipo_id = $2', [rows[0].nome, id]);
        }

        await client.query('COMMIT');
        res.status(200).json({ message: 'Tipo de quarto atualizado com sucesso!', roomType: rows[0] });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Erro ao atualizar tipo de quarto:', err.message);
        res.status(500).json({ message: 'Erro no servidor ao atualizar tipo de quarto.', error: err.message });
    } finally {
        client.release();
    }
};

// PUT /api/tipos-quarto/:id/desativar — desativação lógica (preserva o histórico
// e os quartos já associados; só deixa de aparecer nas listagens/filtros ativos).
const deactivateRoomType = async (req, res) => {
    const { id } = req.params;
    try {
        const { rows } = await pool.query(
            'UPDATE tipos_quarto SET ativo = FALSE WHERE id = $1 RETURNING *',
            [id],
        );
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Tipo de quarto não encontrado para desativação.' });
        }
        res.status(200).json({ message: 'Tipo de quarto desativado com sucesso!', roomType: rows[0] });
    } catch (err) {
        console.error('Erro ao desativar tipo de quarto:', err.message);
        res.status(500).json({ message: 'Erro no servidor ao desativar tipo de quarto.', error: err.message });
    }
};

module.exports = {
    getAllRoomTypes,
    getRoomTypeById,
    createRoomType,
    updateRoomType,
    deactivateRoomType,
};
