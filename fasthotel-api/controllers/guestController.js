// fasthotel-api/controllers/guestController.js
const pool = require('../config/db'); // Importa a conexão com o banco de dados
const bcrypt = require('bcryptjs'); // Para hash de senhas
const jwt = require('jsonwebtoken'); // Importa a biblioteca jsonwebtoken
const { validationResult } = require('express-validator'); // Importar validationResult

// CPF é armazenado só com os 11 dígitos (sem pontuação) — formato canônico único,
// para que "123.456.789-09" e "12345678909" sejam sempre a mesma linha na checagem
// de duplicidade. A máscara de exibição (000.000.000-00) é responsabilidade do
// frontend; aqui só validamos os dígitos verificadores (algoritmo padrão do CPF).
function normalizarCpf(cpfBruto) {
    return String(cpfBruto).replace(/\D/g, '');
}

function cpfValido(cpfDigitos) {
    if (!/^\d{11}$/.test(cpfDigitos)) return false;
    if (/^(\d)\1{10}$/.test(cpfDigitos)) return false; // ex: 00000000000, 11111111111 (nunca válidos)

    const calcularDigito = (base) => {
        let soma = 0;
        let peso = base.length + 1;
        for (const digito of base) {
            soma += Number(digito) * peso;
            peso -= 1;
        }
        const resto = (soma * 10) % 11;
        return resto === 10 ? 0 : resto;
    };

    const base9 = cpfDigitos.slice(0, 9);
    const digito1 = calcularDigito(base9);
    const digito2 = calcularDigito(base9 + digito1);
    return cpfDigitos === base9 + String(digito1) + String(digito2);
}

// Criar um novo hóspede
const createGuest = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const {
        nome, sobrenome, rg, data_nascimento, email,
        telefone, endereco, numero, bairro, cep, cidade, estado,
    } = req.body;
    let { cpf } = req.body;

    try {
        if (cpf) {
            cpf = normalizarCpf(cpf);
            if (!cpfValido(cpf)) {
                return res.status(400).json({ message: 'CPF inválido.' });
            }
            const existingGuest = await pool.query('SELECT id FROM hospedes WHERE cpf = $1', [cpf]);
            if (existingGuest.rows.length > 0) {
                return res.status(400).json({ message: 'CPF já cadastrado para outro hóspede.' });
            }
        }
        if (rg) {
            const existingGuest = await pool.query('SELECT id FROM hospedes WHERE rg = $1', [rg]);
            if (existingGuest.rows.length > 0) {
                return res.status(400).json({ message: 'RG já cadastrado para outro hóspede.' });
            }
        }

        const newGuest = await pool.query(
            `INSERT INTO hospedes (nome, sobrenome, cpf, rg, data_nascimento, email,
                                   telefone, endereco, numero, bairro, cep, cidade, estado)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
             RETURNING *`,
            [nome, sobrenome, cpf, rg, data_nascimento, email,
             telefone, endereco, numero, bairro, cep, cidade, estado]
        );

        res.status(201).json({
            message: 'Hóspede cadastrado com sucesso!',
            guest: newGuest.rows[0]
        });

    } catch (err) {
        console.error('Erro ao cadastrar hóspede:', err.message);
        res.status(500).json({ message: 'Erro no servidor ao cadastrar hóspede.', error: err.message });
    }
};

// Obter todos os hóspedes
// AGORA FILTRA HÓSPEDES COM BASE EM SUAS RESERVAS ATIVAS
const getAllGuests = async (req, res) => {
    try {
        const allGuests = await pool.query(
            `SELECT
                h.id,
                h.nome,
                h.sobrenome,
                h.cpf,
                h.rg,
                h.data_nascimento,
                h.email,
                h.telefone,
                h.endereco,
                h.numero,
                h.bairro,
                h.cep,
                h.cidade,
                h.estado
            FROM
                hospedes h
            WHERE
                h.id IN (
                    SELECT r.hospede_principal_id
                    FROM reservas r
                    WHERE r.hospede_principal_id IS NOT NULL
                    AND r.status_reserva NOT IN ('finalizada', 'cancelada')
                )
                OR NOT EXISTS (
                    SELECT 1 FROM reservas r
                    WHERE r.hospede_principal_id = h.id
                )
            ORDER BY h.nome ASC`
        );
        res.status(200).json(allGuests.rows);
    } catch (err) {
        console.error('Erro ao buscar hóspedes:', err.message);
        res.status(500).json({ message: 'Erro no servidor ao buscar hóspedes.', error: err.message });
    }
};

// Um hóspede não tem dono direto — o vínculo é através de reservas.hospede_principal_id.
// Cliente só pode acessar um hóspede vinculado a alguma reserva feita por ele mesmo.
const podeAcessarHospede = async (hospedeId, req) => {
    if (req.user.tipo_usuario === 'admin' || req.user.tipo_usuario === 'recepcionista') {
        return true;
    }
    const vinculo = await pool.query(
        'SELECT 1 FROM reservas WHERE hospede_principal_id = $1 AND usuario_id = $2 LIMIT 1',
        [hospedeId, req.user.id]
    );
    return vinculo.rows.length > 0;
};

// Obter hóspede por ID
const getGuestById = async (req, res) => {
    const { id } = req.params;
    try {
        if (!(await podeAcessarHospede(id, req))) {
            return res.status(403).json({ message: 'Acesso negado. Você só pode consultar hóspedes de suas próprias reservas.' });
        }
        const guest = await pool.query('SELECT * FROM hospedes WHERE id = $1', [id]);
        if (guest.rows.length === 0) {
            return res.status(404).json({ message: 'Hóspede não encontrado.' });
        }
        res.status(200).json(guest.rows[0]);
    } catch (err) {
        console.error('Erro ao buscar hóspede por ID:', err.message);
        res.status(500).json({ message: 'Erro no servidor ao buscar hóspede.', error: err.message });
    }
};

// Atualizar um hóspede
const updateGuest = async (req, res) => {
    const { id } = req.params;
    const {
        nome, sobrenome, rg, data_nascimento, email,
        telefone, endereco, numero, bairro, cep, cidade, estado
    } = req.body;
    let { cpf } = req.body;

    try {
        if (!(await podeAcessarHospede(id, req))) {
            return res.status(403).json({ message: 'Acesso negado. Você só pode atualizar hóspedes de suas próprias reservas.' });
        }

        if (cpf) {
            cpf = normalizarCpf(cpf);
            if (!cpfValido(cpf)) {
                return res.status(400).json({ message: 'CPF inválido.' });
            }
            const existingGuest = await pool.query('SELECT id FROM hospedes WHERE cpf = $1 AND id != $2', [cpf, id]);
            if (existingGuest.rows.length > 0) {
                return res.status(400).json({ message: 'CPF já cadastrado para outro hóspede.' });
            }
        }

        // COALESCE preserva campos não enviados no corpo (ex: editar só o CPF não
        // pode apagar nome/demais dados — nome é NOT NULL e isso quebraria a edição).
        const updatedGuest = await pool.query(
            `UPDATE hospedes SET
                nome = COALESCE($1, nome),
                sobrenome = COALESCE($2, sobrenome),
                cpf = COALESCE($3, cpf),
                rg = COALESCE($4, rg),
                data_nascimento = COALESCE($5, data_nascimento),
                email = COALESCE($6, email),
                telefone = COALESCE($7, telefone),
                endereco = COALESCE($8, endereco),
                numero = COALESCE($9, numero),
                bairro = COALESCE($10, bairro),
                cep = COALESCE($11, cep),
                cidade = COALESCE($12, cidade),
                estado = COALESCE($13, estado)
             WHERE id = $14
             RETURNING *`,
            [nome, sobrenome, cpf, rg, data_nascimento, email,
             telefone, endereco, numero, bairro, cep, cidade, estado, id]
        );

        if (updatedGuest.rows.length === 0) {
            return res.status(404).json({ message: 'Hóspede não encontrado para atualização.' });
        }

        res.status(200).json({
            message: 'Hóspede atualizado com sucesso!',
            guest: updatedGuest.rows[0]
        });

    } catch (err) {
        console.error('Erro ao atualizar hóspede:', err.message);
        res.status(500).json({ message: 'Erro no servidor ao atualizar hóspede.', error: err.message });
    }
};

// Deletar um hóspede e suas reservas, pagamentos e consumos associados
const deleteGuest = async (req, res) => {
    const { id } = req.params; // ID do hóspede a ser deletado
    const client = await pool.connect(); // Obter um cliente do pool para a transação

    try {
        await client.query('BEGIN'); // Iniciar a transação

        // 1. Encontrar todas as reservas associadas a este hóspede principal
        const reservationsToDelete = await client.query(
            `SELECT id FROM reservas WHERE hospede_principal_id = $1`,
            [id]
        );
        const reservaIds = reservationsToDelete.rows.map(row => row.id);

        if (reservaIds.length > 0) {
            await client.query(
                `DELETE FROM reservas WHERE id = ANY($1::int[])`,
                [reservaIds]
            );
        }

        // 2. Encontrar conversas de chat do hóspede e deletar mensagens + conversas
        const conversasResult = await client.query(
            `SELECT id FROM conversas_chat WHERE hospede_id = $1`,
            [id]
        );
        const conversaIds = conversasResult.rows.map(row => row.id);

        if (conversaIds.length > 0) {
            await client.query(
                `DELETE FROM mensagens_chat WHERE conversa_id = ANY($1::int[])`,
                [conversaIds]
            );
            await client.query(
                `DELETE FROM conversas_chat WHERE id = ANY($1::int[])`,
                [conversaIds]
            );
        }

        // 3. Deletar o próprio hóspede
        const deletedGuestResult = await client.query('DELETE FROM hospedes WHERE id = $1 RETURNING id', [id]);

        if (deletedGuestResult.rows.length === 0) {
            await client.query('ROLLBACK'); // Reverter se o hóspede não for encontrado
            return res.status(404).json({ message: 'Hóspede não encontrado para exclusão.' });
        }

        await client.query('COMMIT'); // Confirmar a transação
        res.status(200).json({
            message: `Hóspede ${id} e todas as suas reservas, pagamentos e consumos associados foram excluídos com sucesso.`,
            id: id
        });

    } catch (err) {
        await client.query('ROLLBACK'); // Reverter a transação em caso de erro
        console.error('Erro ao deletar hóspede e dados associados:', err.message);
        res.status(500).json({ message: 'Erro no servidor ao deletar hóspede e dados associados.', error: err.message });
    } finally {
        client.release(); // Liberar o cliente de volta para o pool
    }
};

module.exports = {
    createGuest,
    getAllGuests,
    getGuestById,
    updateGuest,
    deleteGuest
};