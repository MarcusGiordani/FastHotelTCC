// fasthotel-api/controllers/inventoryController.js
const pool = require('../config/db');

const TIPOS_MOVIMENTACAO = ['entrada', 'saida'];

// GET /api/estoque/produtos — lista com pesquisa por nome, filtro por categoria e
// por situação de estoque (sem_estoque | baixo | normal | inativo).
// Por padrão mostra só produtos ativos (desativados só aparecem com situacao=inativo).
const getAllProducts = async (req, res) => {
    const { nome, categoria, situacao } = req.query;
    try {
        const conditions = [];
        const params = [];

        if (situacao === 'inativo') {
            conditions.push('ativo = FALSE');
        } else {
            conditions.push('ativo = TRUE');
            if (situacao === 'sem_estoque') {
                conditions.push('quantidade_atual = 0');
            } else if (situacao === 'baixo') {
                conditions.push('quantidade_atual > 0 AND quantidade_atual <= estoque_minimo');
            } else if (situacao === 'normal') {
                conditions.push('quantidade_atual > estoque_minimo');
            }
        }

        if (nome) {
            params.push(`%${nome}%`);
            conditions.push(`nome ILIKE $${params.length}`);
        }
        if (categoria) {
            params.push(categoria);
            conditions.push(`categoria = $${params.length}`);
        }

        const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const { rows } = await pool.query(`SELECT * FROM produtos ${where} ORDER BY nome ASC`, params);

        res.status(200).json(rows);
    } catch (err) {
        console.error('Erro ao buscar produtos:', err.message);
        res.status(500).json({ message: 'Erro no servidor ao buscar produtos.', error: err.message });
    }
};

// GET /api/estoque/produtos/:id
const getProductById = async (req, res) => {
    const { id } = req.params;
    try {
        const { rows } = await pool.query('SELECT * FROM produtos WHERE id = $1', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Produto não encontrado.' });
        }
        res.status(200).json(rows[0]);
    } catch (err) {
        console.error('Erro ao buscar produto por ID:', err.message);
        res.status(500).json({ message: 'Erro no servidor ao buscar produto.', error: err.message });
    }
};

// GET /api/estoque/resumo — indicadores do dashboard (sobre produtos ATIVOS)
const getStockSummary = async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT
                COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE quantidade_atual = 0)::int AS sem_estoque,
                COUNT(*) FILTER (WHERE quantidade_atual > 0 AND quantidade_atual <= estoque_minimo)::int AS estoque_baixo
            FROM produtos
            WHERE ativo = TRUE
        `);
        res.status(200).json(rows[0]);
    } catch (err) {
        console.error('Erro ao obter resumo de estoque:', err.message);
        res.status(500).json({ message: 'Erro no servidor ao obter resumo de estoque.', error: err.message });
    }
};

// POST /api/estoque/produtos — cadastro. "quantidade_atual" NUNCA é lida do corpo
// (nem sequer entra na lista de colunas do INSERT): todo produto nasce com 0 e só
// ganha estoque através de uma movimentação de entrada.
const createProduct = async (req, res) => {
    const { nome, descricao, categoria, unidade_medida, estoque_minimo } = req.body;

    if (!nome || !String(nome).trim()) {
        return res.status(400).json({ message: 'Nome do produto é obrigatório.' });
    }
    if (!unidade_medida || !String(unidade_medida).trim()) {
        return res.status(400).json({ message: 'Unidade de medida é obrigatória.' });
    }

    const minimo = estoque_minimo !== undefined ? Number(estoque_minimo) : 0;
    if (Number.isNaN(minimo) || minimo < 0) {
        return res.status(400).json({ message: 'Estoque mínimo deve ser um número maior ou igual a zero.' });
    }

    try {
        const { rows } = await pool.query(
            `INSERT INTO produtos (nome, descricao, categoria, unidade_medida, estoque_minimo)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [String(nome).trim(), descricao || null, categoria || null, String(unidade_medida).trim(), minimo]
        );
        res.status(201).json({ message: 'Produto cadastrado com sucesso!', product: rows[0] });
    } catch (err) {
        console.error('Erro ao cadastrar produto:', err.message);
        res.status(500).json({ message: 'Erro no servidor ao cadastrar produto.', error: err.message });
    }
};

// PUT /api/estoque/produtos/:id — edição. "quantidade_atual" e "ativo" propositalmente
// nunca são lidos do corpo aqui (quantidade só muda por movimentação; desativar tem
// endpoint próprio, para deixar a intenção explícita).
const updateProduct = async (req, res) => {
    const { id } = req.params;
    const { nome, descricao, categoria, unidade_medida, estoque_minimo } = req.body;

    let minimo = null;
    if (estoque_minimo !== undefined) {
        minimo = Number(estoque_minimo);
        if (Number.isNaN(minimo) || minimo < 0) {
            return res.status(400).json({ message: 'Estoque mínimo deve ser um número maior ou igual a zero.' });
        }
    }

    try {
        const { rows } = await pool.query(
            `UPDATE produtos SET
                nome = COALESCE($1, nome),
                descricao = COALESCE($2, descricao),
                categoria = COALESCE($3, categoria),
                unidade_medida = COALESCE($4, unidade_medida),
                estoque_minimo = COALESCE($5, estoque_minimo)
             WHERE id = $6
             RETURNING *`,
            [nome ?? null, descricao ?? null, categoria ?? null, unidade_medida ?? null, minimo, id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Produto não encontrado.' });
        }
        res.status(200).json({ message: 'Produto atualizado com sucesso!', product: rows[0] });
    } catch (err) {
        console.error('Erro ao atualizar produto:', err.message);
        res.status(500).json({ message: 'Erro no servidor ao atualizar produto.', error: err.message });
    }
};

// PUT /api/estoque/produtos/:id/desativar — desativação lógica (preserva o histórico;
// produto desativado não aceita mais movimentações — ver registrarMovimentacao).
const deactivateProduct = async (req, res) => {
    const { id } = req.params;
    try {
        const { rows } = await pool.query(
            `UPDATE produtos SET ativo = FALSE WHERE id = $1 RETURNING *`,
            [id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Produto não encontrado.' });
        }
        res.status(200).json({ message: 'Produto desativado com sucesso!', product: rows[0] });
    } catch (err) {
        console.error('Erro ao desativar produto:', err.message);
        res.status(500).json({ message: 'Erro no servidor ao desativar produto.', error: err.message });
    }
};

// Núcleo comum de POST /produtos/:id/entrada e POST /produtos/:id/saida.
// Usa transação + "SELECT ... FOR UPDATE" para travar a linha do produto durante
// toda a operação: duas movimentações simultâneas no mesmo produto são serializadas
// pelo Postgres, nunca correm em paralelo sobre o mesmo saldo. O CHECK
// (quantidade_atual >= 0) na tabela é uma segunda camada de proteção.
async function registrarMovimentacao(req, res, tipo) {
    const { id } = req.params;
    const { quantidade, motivo } = req.body;
    const funcionarioId = req.user.id;

    const quantidadeNum = Number(quantidade);
    if (quantidade === undefined || Number.isNaN(quantidadeNum) || quantidadeNum <= 0) {
        return res.status(400).json({ message: 'Quantidade deve ser um número maior que zero.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const produtoResult = await client.query(
            'SELECT quantidade_atual, ativo FROM produtos WHERE id = $1 FOR UPDATE',
            [id]
        );
        if (produtoResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Produto não encontrado.' });
        }
        const produto = produtoResult.rows[0];

        if (!produto.ativo) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'Produto desativado não aceita movimentações de estoque.' });
        }

        if (tipo === 'saida' && quantidadeNum > parseFloat(produto.quantidade_atual)) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'Estoque insuficiente para esta saída.' });
        }

        // "tipo" vem só de código interno confiável (entrada/saida), nunca do req.body,
        // então interpolar o operador aritmético aqui não é concatenação de entrada do usuário.
        const operador = tipo === 'entrada' ? '+' : '-';
        const produtoAtualizado = await client.query(
            `UPDATE produtos SET quantidade_atual = quantidade_atual ${operador} $1 WHERE id = $2 RETURNING *`,
            [quantidadeNum, id]
        );

        const movimentacao = await client.query(
            `INSERT INTO movimentacoes_estoque (produto_id, tipo, quantidade, motivo, funcionario_id)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [id, tipo, quantidadeNum, motivo || null, funcionarioId]
        );

        await client.query('COMMIT');
        res.status(201).json({
            message: tipo === 'entrada' ? 'Entrada registrada com sucesso!' : 'Saída registrada com sucesso!',
            product: produtoAtualizado.rows[0],
            movimentacao: movimentacao.rows[0],
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(`Erro ao registrar ${tipo}:`, err.message);
        res.status(500).json({ message: `Erro no servidor ao registrar ${tipo}.`, error: err.message });
    } finally {
        client.release();
    }
}

const registrarEntrada = (req, res) => registrarMovimentacao(req, res, 'entrada');
const registrarSaida = (req, res) => registrarMovimentacao(req, res, 'saida');

// GET /api/estoque/movimentacoes — histórico, com filtros opcionais ?produto_id= e ?tipo=
const getAllMovements = async (req, res) => {
    const { produto_id, tipo } = req.query;

    if (tipo !== undefined && !TIPOS_MOVIMENTACAO.includes(tipo)) {
        return res.status(400).json({ message: 'Tipo inválido. Use "entrada" ou "saida".' });
    }

    try {
        const conditions = [];
        const params = [];

        if (produto_id) {
            params.push(produto_id);
            conditions.push(`m.produto_id = $${params.length}`);
        }
        if (tipo) {
            params.push(tipo);
            conditions.push(`m.tipo = $${params.length}`);
        }

        const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const { rows } = await pool.query(
            `SELECT
                m.id, m.produto_id, p.nome AS produto_nome, m.tipo, m.quantidade, m.motivo,
                m.funcionario_id, u.nome AS funcionario_nome, m.data_movimentacao
            FROM movimentacoes_estoque m
            JOIN produtos p ON m.produto_id = p.id
            LEFT JOIN usuarios u ON m.funcionario_id = u.id
            ${where}
            ORDER BY m.data_movimentacao DESC`,
            params
        );

        res.status(200).json(rows);
    } catch (err) {
        console.error('Erro ao buscar histórico de movimentações:', err.message);
        res.status(500).json({ message: 'Erro no servidor ao buscar histórico de movimentações.', error: err.message });
    }
};

module.exports = {
    getAllProducts,
    getProductById,
    getStockSummary,
    createProduct,
    updateProduct,
    deactivateProduct,
    registrarEntrada,
    registrarSaida,
    getAllMovements,
};
