// fasthotel-api/controllers/cleaningController.js
const pool = require('../config/db');

const STATUS_VALIDOS = ['pendente', 'em_andamento', 'concluida'];

// GET /api/limpeza/quartos — todos os quartos com o status de limpeza ATUAL
// (a última limpeza registrada de cada um). Quarto sem nenhum registro vem
// com status_limpeza = null ("sem registro"). Independente de quartos.status.
const getRoomsCleaningStatus = async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT
                q.id AS quarto_id,
                q.numero,
                q.tipo,
                q.status AS status_ocupacao,
                ultima.id AS limpeza_id,
                ultima.status AS status_limpeza,
                ultima.funcionario_id,
                uf.nome AS funcionario_nome,
                ultima.observacoes,
                ultima.data_solicitacao,
                ultima.data_inicio,
                ultima.data_conclusao
            FROM quartos q
            LEFT JOIN (
                SELECT DISTINCT ON (quarto_id) *
                FROM limpezas
                ORDER BY quarto_id, data_solicitacao DESC
            ) ultima ON ultima.quarto_id = q.id
            LEFT JOIN usuarios uf ON ultima.funcionario_id = uf.id
            ORDER BY CAST(q.numero AS INTEGER) ASC
        `);
        res.status(200).json(rows);
    } catch (err) {
        console.error('Erro ao buscar status de limpeza dos quartos:', err.message);
        res.status(500).json({ message: 'Erro no servidor ao buscar status de limpeza dos quartos.', error: err.message });
    }
};

// GET /api/limpeza/resumo — indicadores do dashboard: contagem de QUARTOS por
// status de limpeza ATUAL (não conta o histórico inteiro, só o estado de agora).
const getCleaningSummary = async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT ultima.status, COUNT(*)::int AS quantidade
            FROM (
                SELECT DISTINCT ON (quarto_id) quarto_id, status
                FROM limpezas
                ORDER BY quarto_id, data_solicitacao DESC
            ) ultima
            GROUP BY ultima.status
        `);

        const resumo = { pendente: 0, em_andamento: 0, concluida: 0 };
        rows.forEach((r) => {
            resumo[r.status] = r.quantidade;
        });

        res.status(200).json(resumo);
    } catch (err) {
        console.error('Erro ao obter resumo de limpezas:', err.message);
        res.status(500).json({ message: 'Erro no servidor ao obter resumo de limpezas.', error: err.message });
    }
};

// GET /api/limpeza/funcionarios — lista mínima (id, nome) da equipe elegível
// para ser atribuída a uma limpeza. Endpoint próprio (não reaproveita
// GET /api/usuarios, que é admin-only e devolve e-mails de todos os usuários).
const getFuncionariosDisponiveis = async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT id, nome FROM usuarios WHERE tipo_usuario IN ('admin', 'recepcionista') ORDER BY nome ASC`
        );
        res.status(200).json(rows);
    } catch (err) {
        console.error('Erro ao buscar funcionários:', err.message);
        res.status(500).json({ message: 'Erro no servidor ao buscar funcionários.', error: err.message });
    }
};

// GET /api/limpeza — histórico de limpezas (todas), com filtros opcionais
// ?status=pendente|em_andamento|concluida e ?quarto_id=
const getAllCleanings = async (req, res) => {
    const { status, quarto_id } = req.query;

    if (status !== undefined && !STATUS_VALIDOS.includes(status)) {
        return res.status(400).json({ message: `Status inválido. Use um de: ${STATUS_VALIDOS.join(', ')}.` });
    }

    try {
        const conditions = [];
        const params = [];

        if (status) {
            params.push(status);
            conditions.push(`l.status = $${params.length}`);
        }
        if (quarto_id) {
            params.push(quarto_id);
            conditions.push(`l.quarto_id = $${params.length}`);
        }

        const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const { rows } = await pool.query(
            `SELECT
                l.id,
                l.quarto_id,
                q.numero AS quarto_numero,
                l.status,
                l.funcionario_id,
                u.nome AS funcionario_nome,
                l.reserva_origem_id,
                l.observacoes,
                l.data_solicitacao,
                l.data_inicio,
                l.data_conclusao
            FROM limpezas l
            JOIN quartos q ON l.quarto_id = q.id
            LEFT JOIN usuarios u ON l.funcionario_id = u.id
            ${where}
            ORDER BY l.data_solicitacao DESC`,
            params
        );

        res.status(200).json(rows);
    } catch (err) {
        console.error('Erro ao buscar histórico de limpezas:', err.message);
        res.status(500).json({ message: 'Erro no servidor ao buscar histórico de limpezas.', error: err.message });
    }
};

// GET /api/limpeza/:id
const getCleaningById = async (req, res) => {
    const { id } = req.params;
    try {
        const { rows } = await pool.query(
            `SELECT
                l.id,
                l.quarto_id,
                q.numero AS quarto_numero,
                l.status,
                l.funcionario_id,
                u.nome AS funcionario_nome,
                l.reserva_origem_id,
                l.observacoes,
                l.data_solicitacao,
                l.data_inicio,
                l.data_conclusao
            FROM limpezas l
            JOIN quartos q ON l.quarto_id = q.id
            LEFT JOIN usuarios u ON l.funcionario_id = u.id
            WHERE l.id = $1`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Registro de limpeza não encontrado.' });
        }
        res.status(200).json(rows[0]);
    } catch (err) {
        console.error('Erro ao buscar limpeza por ID:', err.message);
        res.status(500).json({ message: 'Erro no servidor ao buscar limpeza.', error: err.message });
    }
};

// PUT /api/limpeza/:id — atualizar status, atribuir funcionário e/ou observações.
// data_inicio/data_conclusao são preenchidas automaticamente na primeira vez que
// o status muda para 'em_andamento'/'concluida' (nunca sobrescritas depois).
const updateCleaning = async (req, res) => {
    const { id } = req.params;
    const { status, funcionario_id, observacoes } = req.body;

    if (status !== undefined && !STATUS_VALIDOS.includes(status)) {
        return res.status(400).json({ message: `Status inválido. Use um de: ${STATUS_VALIDOS.join(', ')}.` });
    }

    try {
        if (funcionario_id !== undefined && funcionario_id !== null) {
            const funcionario = await pool.query(
                `SELECT id FROM usuarios WHERE id = $1 AND tipo_usuario IN ('admin', 'recepcionista')`,
                [funcionario_id]
            );
            if (funcionario.rows.length === 0) {
                return res.status(400).json({ message: 'Funcionário inválido. Informe o ID de um usuário da equipe (admin ou recepcionista).' });
            }
        }

        const atual = await pool.query('SELECT status, data_inicio, data_conclusao FROM limpezas WHERE id = $1', [id]);
        if (atual.rows.length === 0) {
            return res.status(404).json({ message: 'Registro de limpeza não encontrado.' });
        }
        const limpezaAtual = atual.rows[0];

        const novoStatus = status !== undefined ? status : limpezaAtual.status;
        const marcarInicio = novoStatus === 'em_andamento' && !limpezaAtual.data_inicio;
        const marcarConclusao = novoStatus === 'concluida' && !limpezaAtual.data_conclusao;

        const { rows } = await pool.query(
            `UPDATE limpezas SET
                status = COALESCE($1, status),
                funcionario_id = COALESCE($2, funcionario_id),
                observacoes = COALESCE($3, observacoes),
                data_inicio = CASE WHEN $4 THEN CURRENT_TIMESTAMP ELSE data_inicio END,
                data_conclusao = CASE WHEN $5 THEN CURRENT_TIMESTAMP ELSE data_conclusao END
             WHERE id = $6
             RETURNING id, quarto_id, status, funcionario_id, observacoes, reserva_origem_id, data_solicitacao, data_inicio, data_conclusao`,
            [status ?? null, funcionario_id ?? null, observacoes ?? null, marcarInicio, marcarConclusao, id]
        );

        res.status(200).json({
            message: 'Limpeza atualizada com sucesso!',
            limpeza: rows[0],
        });
    } catch (err) {
        console.error('Erro ao atualizar limpeza:', err.message);
        res.status(500).json({ message: 'Erro no servidor ao atualizar limpeza.', error: err.message });
    }
};

module.exports = {
    getRoomsCleaningStatus,
    getCleaningSummary,
    getFuncionariosDisponiveis,
    getAllCleanings,
    getCleaningById,
    updateCleaning,
};
