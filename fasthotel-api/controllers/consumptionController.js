// fasthotel-api/controllers/consumptionController.js
const pool = require('../config/db');

const isStaff = (req) => req.user.tipo_usuario === 'admin' || req.user.tipo_usuario === 'recepcionista';

// Criar um novo consumo
// Cliente só pode registrar consumo na PRÓPRIA reserva; equipe em qualquer uma.
const createConsumption = async (req, res) => {
    const { reserva_id, servico_id, quantidade } = req.body;

    try {
        // Verificar se a reserva existe (e a quem pertence, para o vínculo de acesso)
        const bookingExists = await pool.query('SELECT id, usuario_id FROM reservas WHERE id = $1', [reserva_id]);
        if (bookingExists.rows.length === 0) {
            return res.status(404).json({ message: 'Reserva não encontrada.' });
        }
        if (!isStaff(req) && String(bookingExists.rows[0].usuario_id) !== String(req.user.id)) {
            return res.status(403).json({ message: 'Acesso negado. Você só pode registrar consumo em suas próprias reservas.' });
        }

        // Verificar se o serviço existe e obter seu preço atual
        const service = await pool.query('SELECT preco FROM servicos WHERE id = $1', [servico_id]);
        if (service.rows.length === 0) {
            return res.status(404).json({ message: 'Serviço não encontrado.' });
        }
        const preco_unitario = service.rows[0].preco;

        const newConsumption = await pool.query(
            'INSERT INTO consumos (reserva_id, servico_id, quantidade, preco_unitario) VALUES ($1, $2, $3, $4) RETURNING *',
            [reserva_id, servico_id, quantidade, preco_unitario]
        );
        res.status(201).json({
            message: 'Consumo registrado com sucesso!',
            consumption: newConsumption.rows[0]
        });
    } catch (err) {
        console.error('Erro ao registrar consumo:', err.message);
        res.status(500).json({ message: 'Erro no servidor ao registrar consumo.', error: err.message });
    }
};

// Obter todos os consumos (opcionalmente filtrado por reserva_id)
// Cliente só vê consumos das PRÓPRIAS reservas (lista é auto-restrita, nunca 403:
// sem reserva_id, simplesmente só retorna o que é dele); equipe vê tudo.
const getAllConsumptions = async (req, res) => {
    const { reserva_id } = req.query; // Permite filtrar por ID da reserva
    try {
        let query = `
            SELECT
                c.id,
                c.reserva_id,
                c.servico_id,
                s.nome AS nome_servico,
                s.descricao AS descricao_servico,
                c.quantidade,
                c.preco_unitario,
                (c.quantidade * c.preco_unitario) AS valor_total_item,
                c.data_consumo
            FROM
                consumos c
            JOIN
                servicos s ON c.servico_id = s.id
            JOIN
                reservas r ON c.reserva_id = r.id
        `;
        const conditions = [];
        const params = [];

        if (reserva_id) {
            params.push(reserva_id);
            conditions.push(`c.reserva_id = $${params.length}`);
        }
        if (!isStaff(req)) {
            params.push(req.user.id);
            conditions.push(`r.usuario_id = $${params.length}`);
        }
        if (conditions.length > 0) {
            query += ` WHERE ${conditions.join(' AND ')}`;
        }
        query += ' ORDER BY c.data_consumo DESC';

        const allConsumptions = await pool.query(query, params);
        res.status(200).json(allConsumptions.rows);
    } catch (err) {
        console.error('Erro ao buscar consumos:', err.message);
        res.status(500).json({ message: 'Erro no servidor ao buscar consumos.', error: err.message });
    }
};

// Obter consumo por ID
// Cliente só acessa consumo de reserva própria; equipe acessa qualquer um.
const getConsumptionById = async (req, res) => {
    const { id } = req.params;
    try {
        const consumption = await pool.query(
            `SELECT
                c.id,
                c.reserva_id,
                c.servico_id,
                s.nome AS nome_servico,
                s.descricao AS descricao_servico,
                c.quantidade,
                c.preco_unitario,
                (c.quantidade * c.preco_unitario) AS valor_total_item,
                c.data_consumo,
                r.usuario_id AS reserva_usuario_id
            FROM
                consumos c
            JOIN
                servicos s ON c.servico_id = s.id
            JOIN
                reservas r ON c.reserva_id = r.id
            WHERE c.id = $1`,
            [id]
        );
        if (consumption.rows.length === 0) {
            return res.status(404).json({ message: 'Consumo não encontrado.' });
        }
        const { reserva_usuario_id, ...consumo } = consumption.rows[0];
        if (!isStaff(req) && String(reserva_usuario_id) !== String(req.user.id)) {
            return res.status(403).json({ message: 'Acesso negado. Você só pode consultar consumos de suas próprias reservas.' });
        }
        res.status(200).json(consumo);
    } catch (err) {
        console.error('Erro ao buscar consumo por ID:', err.message);
        res.status(500).json({ message: 'Erro no servidor ao buscar consumo.', error: err.message });
    }
};

// Atualizar um consumo
// Cliente só atualiza consumo de reserva própria; equipe atualiza qualquer um.
const updateConsumption = async (req, res) => {
    const { id } = req.params;
    const { servico_id, quantidade } = req.body; // Não permite mudar reserva_id aqui

    try {
        const dono = await pool.query(
            `SELECT r.usuario_id FROM consumos c JOIN reservas r ON c.reserva_id = r.id WHERE c.id = $1`,
            [id]
        );
        if (dono.rows.length === 0) {
            return res.status(404).json({ message: 'Consumo não encontrado para atualização.' });
        }
        if (!isStaff(req) && String(dono.rows[0].usuario_id) !== String(req.user.id)) {
            return res.status(403).json({ message: 'Acesso negado. Você só pode atualizar consumos de suas próprias reservas.' });
        }

        // Opcional: Verificar se o servico_id mudou e obter o novo preco_unitario
        let preco_unitario;
        if (servico_id) {
            const service = await pool.query('SELECT preco FROM servicos WHERE id = $1', [servico_id]);
            if (service.rows.length === 0) {
                return res.status(404).json({ message: 'Novo serviço não encontrado.' });
            }
            preco_unitario = service.rows[0].preco;
        } else {
            // Se servico_id não foi fornecido, pegar o preco_unitario atual do consumo
            const currentConsumption = await pool.query('SELECT preco_unitario FROM consumos WHERE id = $1', [id]);
            if (currentConsumption.rows.length === 0) {
                return res.status(404).json({ message: 'Consumo não encontrado para atualização.' });
            }
            preco_unitario = currentConsumption.rows[0].preco_unitario;
        }

        const updatedConsumption = await pool.query(
            `UPDATE consumos SET
                servico_id = COALESCE($1, servico_id),
                quantidade = COALESCE($2, quantidade),
                preco_unitario = COALESCE($3, preco_unitario)
             WHERE id = $4
             RETURNING *`,
            [servico_id, quantidade, preco_unitario, id]
        );

        if (updatedConsumption.rows.length === 0) {
            return res.status(404).json({ message: 'Consumo não encontrado para atualização.' });
        }

        res.status(200).json({
            message: 'Consumo atualizado com sucesso!',
            consumption: updatedConsumption.rows[0]
        });

    } catch (err) {
        console.error('Erro ao atualizar consumo:', err.message);
        res.status(500).json({ message: 'Erro no servidor ao atualizar consumo.', error: err.message });
    }
};

// Deletar um consumo
// Cliente só exclui consumo de reserva própria; equipe exclui qualquer um.
const deleteConsumption = async (req, res) => {
    const { id } = req.params;
    try {
        const dono = await pool.query(
            `SELECT r.usuario_id FROM consumos c JOIN reservas r ON c.reserva_id = r.id WHERE c.id = $1`,
            [id]
        );
        if (dono.rows.length === 0) {
            return res.status(404).json({ message: 'Consumo não encontrado para exclusão.' });
        }
        if (!isStaff(req) && String(dono.rows[0].usuario_id) !== String(req.user.id)) {
            return res.status(403).json({ message: 'Acesso negado. Você só pode excluir consumos de suas próprias reservas.' });
        }

        const deletedConsumption = await pool.query('DELETE FROM consumos WHERE id = $1 RETURNING id', [id]);
        res.status(200).json({ message: 'Consumo excluído com sucesso!', id: id });
    } catch (err) {
        console.error('Erro ao deletar consumo:', err.message);
        res.status(500).json({ message: 'Erro no servidor ao deletar consumo.', error: err.message });
    }
};

module.exports = {
    createConsumption,
    getAllConsumptions,
    getConsumptionById,
    updateConsumption,
    deleteConsumption
};