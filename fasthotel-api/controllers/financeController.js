// fasthotel-api/controllers/financeController.js
const pool = require('../config/db');

const TIPOS_MOVIMENTO = ['receita', 'despesa'];
const TIPOS_CATEGORIA = ['receita', 'despesa', 'ambas'];

// =========================================================================
// Integração com pagamentos — chamadas pelo paymentController, DENTRO da mesma
// transação/cliente do pagamento, para garantir consistência transacional.
// =========================================================================

// Garante uma movimentação 'confirmada' para este pagamento (cria ou re-sincroniza
// valor/descrição/status). UNIQUE(pagamento_id) + ON CONFLICT tornam a operação
// idempotente: nunca duplica receita para o mesmo pagamento.
async function sincronizarReceitaDoPagamento(client, { pagamentoId, reservaId, valorPago, metodoPagamento, criadoPor }) {
    const descricao = `Pagamento #${pagamentoId} - Reserva #${reservaId} (${metodoPagamento})`;
    await client.query(
        `INSERT INTO movimentacoes_financeiras
            (tipo, valor, descricao, forma_pagamento, data_movimentacao, origem, pagamento_id, status, criado_por)
         VALUES ('receita', $1, $2, $3, CURRENT_DATE, 'automatica', $4, 'confirmada', $5)
         ON CONFLICT (pagamento_id) DO UPDATE SET
            valor = EXCLUDED.valor,
            descricao = EXCLUDED.descricao,
            forma_pagamento = EXCLUDED.forma_pagamento,
            status = 'confirmada'`,
        [valorPago, descricao, metodoPagamento, pagamentoId, criadoPor]
    );
}

// Marca como 'estornada' a movimentação automática deste pagamento, se existir e
// estiver 'confirmada'. NUNCA apaga a linha — preserva o histórico para auditoria.
async function estornarReceitaDoPagamento(client, pagamentoId) {
    await client.query(
        `UPDATE movimentacoes_financeiras SET status = 'estornada'
         WHERE pagamento_id = $1 AND status = 'confirmada'`,
        [pagamentoId]
    );
}

// =========================================================================
// Categorias financeiras
// =========================================================================

const getAllCategories = async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM categorias_financeiras ORDER BY nome ASC');
        res.status(200).json(rows);
    } catch (err) {
        console.error('Erro ao buscar categorias financeiras:', err.message);
        res.status(500).json({ message: 'Erro no servidor ao buscar categorias financeiras.', error: err.message });
    }
};

const createCategory = async (req, res) => {
    const { nome, tipo } = req.body;

    if (!nome || !String(nome).trim()) {
        return res.status(400).json({ message: 'Nome da categoria é obrigatório.' });
    }
    if (!TIPOS_CATEGORIA.includes(tipo)) {
        return res.status(400).json({ message: 'Tipo inválido. Use "receita", "despesa" ou "ambas".' });
    }

    try {
        const { rows } = await pool.query(
            'INSERT INTO categorias_financeiras (nome, tipo) VALUES ($1, $2) RETURNING *',
            [String(nome).trim(), tipo]
        );
        res.status(201).json({ message: 'Categoria cadastrada com sucesso!', category: rows[0] });
    } catch (err) {
        if (err.code === '23505') {
            return res.status(400).json({ message: 'Já existe uma categoria com esse nome.' });
        }
        console.error('Erro ao cadastrar categoria financeira:', err.message);
        res.status(500).json({ message: 'Erro no servidor ao cadastrar categoria financeira.', error: err.message });
    }
};

// Valida que a categoria existe e é compatível com o tipo do lançamento (receita/despesa/ambas).
async function validarCategoria(categoriaId, tipoMovimento) {
    const { rows } = await pool.query('SELECT tipo FROM categorias_financeiras WHERE id = $1', [categoriaId]);
    if (rows.length === 0) {
        return 'Categoria não encontrada.';
    }
    const categoriaTipo = rows[0].tipo;
    if (categoriaTipo !== 'ambas' && categoriaTipo !== tipoMovimento) {
        return `Esta categoria não pode ser usada em lançamentos de ${tipoMovimento}.`;
    }
    return null;
}

// =========================================================================
// Lançamentos manuais (receita/despesa)
// =========================================================================

async function criarLancamentoManual(req, res, tipo) {
    const { valor, descricao, categoria_id, forma_pagamento, data_movimentacao } = req.body;

    const valorNum = Number(valor);
    if (valor === undefined || Number.isNaN(valorNum) || valorNum <= 0) {
        return res.status(400).json({ message: 'Valor deve ser um número maior que zero.' });
    }
    if (!descricao || !String(descricao).trim()) {
        return res.status(400).json({ message: 'Descrição é obrigatória.' });
    }

    try {
        if (categoria_id) {
            const erroCategoria = await validarCategoria(categoria_id, tipo);
            if (erroCategoria) {
                return res.status(400).json({ message: erroCategoria });
            }
        }

        const { rows } = await pool.query(
            `INSERT INTO movimentacoes_financeiras
                (tipo, categoria_id, valor, descricao, forma_pagamento, data_movimentacao, origem, status, criado_por)
             VALUES ($1, $2, $3, $4, $5, COALESCE($6, CURRENT_DATE), 'manual', 'confirmada', $7)
             RETURNING *`,
            [tipo, categoria_id || null, valorNum, String(descricao).trim(), forma_pagamento || null, data_movimentacao || null, req.user.id]
        );

        res.status(201).json({
            message: tipo === 'receita' ? 'Receita registrada com sucesso!' : 'Despesa registrada com sucesso!',
            movement: rows[0],
        });
    } catch (err) {
        console.error(`Erro ao registrar ${tipo}:`, err.message);
        res.status(500).json({ message: `Erro no servidor ao registrar ${tipo}.`, error: err.message });
    }
}

const createRevenue = (req, res) => criarLancamentoManual(req, res, 'receita');
const createExpense = (req, res) => criarLancamentoManual(req, res, 'despesa');

// PUT /:id — só edita lançamento MANUAL e CONFIRMADO. "tipo", "origem", "status" e
// "pagamento_id" nunca são lidos do corpo aqui — não há como disfarçar edição de tipo
// nem "reativar" algo por essa rota.
const updateMovement = async (req, res) => {
    const { id } = req.params;
    const { valor, descricao, categoria_id, forma_pagamento, data_movimentacao } = req.body;

    let valorNum = null;
    if (valor !== undefined) {
        valorNum = Number(valor);
        if (Number.isNaN(valorNum) || valorNum <= 0) {
            return res.status(400).json({ message: 'Valor deve ser um número maior que zero.' });
        }
    }

    try {
        const atual = await pool.query('SELECT origem, status, tipo FROM movimentacoes_financeiras WHERE id = $1', [id]);
        if (atual.rows.length === 0) {
            return res.status(404).json({ message: 'Lançamento não encontrado.' });
        }
        const mov = atual.rows[0];

        if (mov.origem !== 'manual') {
            return res.status(400).json({ message: 'Lançamentos automáticos não podem ser editados diretamente. Edite o pagamento de origem.' });
        }
        if (mov.status !== 'confirmada') {
            return res.status(400).json({ message: 'Somente lançamentos confirmados podem ser editados.' });
        }
        if (categoria_id) {
            const erroCategoria = await validarCategoria(categoria_id, mov.tipo);
            if (erroCategoria) {
                return res.status(400).json({ message: erroCategoria });
            }
        }

        const { rows } = await pool.query(
            `UPDATE movimentacoes_financeiras SET
                valor = COALESCE($1, valor),
                descricao = COALESCE($2, descricao),
                categoria_id = COALESCE($3, categoria_id),
                forma_pagamento = COALESCE($4, forma_pagamento),
                data_movimentacao = COALESCE($5, data_movimentacao)
             WHERE id = $6
             RETURNING *`,
            [valorNum, descricao || null, categoria_id || null, forma_pagamento || null, data_movimentacao || null, id]
        );

        res.status(200).json({ message: 'Lançamento atualizado com sucesso!', movement: rows[0] });
    } catch (err) {
        console.error('Erro ao atualizar lançamento financeiro:', err.message);
        res.status(500).json({ message: 'Erro no servidor ao atualizar lançamento financeiro.', error: err.message });
    }
};

// PUT /:id/cancelar — só cancela (status='cancelada') lançamento MANUAL e CONFIRMADO.
// Nunca apaga a linha — preserva rastreabilidade.
const cancelMovement = async (req, res) => {
    const { id } = req.params;
    try {
        const atual = await pool.query('SELECT origem, status FROM movimentacoes_financeiras WHERE id = $1', [id]);
        if (atual.rows.length === 0) {
            return res.status(404).json({ message: 'Lançamento não encontrado.' });
        }
        const mov = atual.rows[0];

        if (mov.origem !== 'manual') {
            return res.status(400).json({ message: 'Lançamentos automáticos não podem ser cancelados diretamente. Cancele/estorne o pagamento de origem.' });
        }
        if (mov.status !== 'confirmada') {
            return res.status(400).json({ message: 'Este lançamento já não está confirmado.' });
        }

        const { rows } = await pool.query(
            `UPDATE movimentacoes_financeiras SET status = 'cancelada' WHERE id = $1 RETURNING *`,
            [id]
        );
        res.status(200).json({ message: 'Lançamento cancelado com sucesso!', movement: rows[0] });
    } catch (err) {
        console.error('Erro ao cancelar lançamento financeiro:', err.message);
        res.status(500).json({ message: 'Erro no servidor ao cancelar lançamento financeiro.', error: err.message });
    }
};

// =========================================================================
// Listagem, consulta e indicadores
// =========================================================================

// GET / — histórico completo (inclui canceladas/estornadas, para auditoria), com
// filtros opcionais de tipo, categoria, status e período (sobre data_movimentacao).
const getAllMovements = async (req, res) => {
    const { tipo, categoria_id, status, periodo_inicio, periodo_fim } = req.query;

    if (tipo !== undefined && !TIPOS_MOVIMENTO.includes(tipo)) {
        return res.status(400).json({ message: 'Tipo inválido. Use "receita" ou "despesa".' });
    }

    try {
        const conditions = [];
        const params = [];

        if (tipo) { params.push(tipo); conditions.push(`m.tipo = $${params.length}`); }
        if (categoria_id) { params.push(categoria_id); conditions.push(`m.categoria_id = $${params.length}`); }
        if (status) { params.push(status); conditions.push(`m.status = $${params.length}`); }
        if (periodo_inicio) { params.push(periodo_inicio); conditions.push(`m.data_movimentacao >= $${params.length}`); }
        if (periodo_fim) { params.push(periodo_fim); conditions.push(`m.data_movimentacao <= $${params.length}`); }

        const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const { rows } = await pool.query(
            `SELECT
                m.id, m.tipo, m.categoria_id, c.nome AS categoria_nome, m.valor, m.descricao,
                m.forma_pagamento, m.data_movimentacao, m.origem, m.pagamento_id, m.status,
                m.criado_por, u.nome AS criado_por_nome, m.created_at
             FROM movimentacoes_financeiras m
             LEFT JOIN categorias_financeiras c ON m.categoria_id = c.id
             LEFT JOIN usuarios u ON m.criado_por = u.id
             ${where}
             ORDER BY m.data_movimentacao DESC, m.id DESC`,
            params
        );
        res.status(200).json(rows);
    } catch (err) {
        console.error('Erro ao buscar movimentações financeiras:', err.message);
        res.status(500).json({ message: 'Erro no servidor ao buscar movimentações financeiras.', error: err.message });
    }
};

const getMovementById = async (req, res) => {
    const { id } = req.params;
    try {
        const { rows } = await pool.query(
            `SELECT
                m.id, m.tipo, m.categoria_id, c.nome AS categoria_nome, m.valor, m.descricao,
                m.forma_pagamento, m.data_movimentacao, m.origem, m.pagamento_id, m.status,
                m.criado_por, u.nome AS criado_por_nome, m.created_at
             FROM movimentacoes_financeiras m
             LEFT JOIN categorias_financeiras c ON m.categoria_id = c.id
             LEFT JOIN usuarios u ON m.criado_por = u.id
             WHERE m.id = $1`,
            [id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Lançamento não encontrado.' });
        }
        res.status(200).json(rows[0]);
    } catch (err) {
        console.error('Erro ao buscar lançamento financeiro:', err.message);
        res.status(500).json({ message: 'Erro no servidor ao buscar lançamento financeiro.', error: err.message });
    }
};

// GET /resumo — totais de receitas/despesas/saldo (só status='confirmada'), com
// filtro opcional de período.
const getFinanceSummary = async (req, res) => {
    const { periodo_inicio, periodo_fim } = req.query;
    try {
        const conditions = [`status = 'confirmada'`];
        const params = [];
        if (periodo_inicio) { params.push(periodo_inicio); conditions.push(`data_movimentacao >= $${params.length}`); }
        if (periodo_fim) { params.push(periodo_fim); conditions.push(`data_movimentacao <= $${params.length}`); }

        const { rows } = await pool.query(
            `SELECT
                COALESCE(SUM(valor) FILTER (WHERE tipo = 'receita'), 0) AS receitas,
                COALESCE(SUM(valor) FILTER (WHERE tipo = 'despesa'), 0) AS despesas
             FROM movimentacoes_financeiras
             WHERE ${conditions.join(' AND ')}`,
            params
        );
        const receitas = parseFloat(rows[0].receitas);
        const despesas = parseFloat(rows[0].despesas);
        res.status(200).json({ receitas, despesas, saldo: parseFloat((receitas - despesas).toFixed(2)) });
    } catch (err) {
        console.error('Erro ao obter resumo financeiro:', err.message);
        res.status(500).json({ message: 'Erro no servidor ao obter resumo financeiro.', error: err.message });
    }
};

// GET /resumo-mensal?ano=YYYY — receitas/despesas/saldo por mês (só confirmadas)
const getMonthlySummary = async (req, res) => {
    const ano = req.query.ano ? parseInt(req.query.ano, 10) : new Date().getFullYear();
    if (Number.isNaN(ano)) {
        return res.status(400).json({ message: 'Parâmetro "ano" inválido.' });
    }
    try {
        const { rows } = await pool.query(
            `SELECT
                EXTRACT(MONTH FROM data_movimentacao)::int AS mes,
                COALESCE(SUM(valor) FILTER (WHERE tipo = 'receita'), 0) AS receitas,
                COALESCE(SUM(valor) FILTER (WHERE tipo = 'despesa'), 0) AS despesas
             FROM movimentacoes_financeiras
             WHERE status = 'confirmada' AND EXTRACT(YEAR FROM data_movimentacao) = $1
             GROUP BY EXTRACT(MONTH FROM data_movimentacao)
             ORDER BY mes`,
            [ano]
        );
        const meses = rows.map((r) => {
            const receitas = parseFloat(r.receitas);
            const despesas = parseFloat(r.despesas);
            return { mes: r.mes, receitas, despesas, saldo: parseFloat((receitas - despesas).toFixed(2)) };
        });
        res.status(200).json({ ano, meses });
    } catch (err) {
        console.error('Erro ao obter resumo mensal:', err.message);
        res.status(500).json({ message: 'Erro no servidor ao obter resumo mensal.', error: err.message });
    }
};

module.exports = {
    sincronizarReceitaDoPagamento,
    estornarReceitaDoPagamento,
    getAllCategories,
    createCategory,
    createRevenue,
    createExpense,
    updateMovement,
    cancelMovement,
    getAllMovements,
    getMovementById,
    getFinanceSummary,
    getMonthlySummary,
};
