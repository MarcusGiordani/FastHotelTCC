// fasthotel-api/controllers/userController.js
const pool = require('../config/db'); // Importa a conexão com o banco de dados
const bcrypt = require('bcryptjs'); // Para hash de senhas
const jwt = require('jsonwebtoken'); // Importa a biblioteca jsonwebtoken
const { validationResult } = require('express-validator'); // <-- NOVO: Importar validationResult

// Helper interno: valida duplicidade de e-mail, gera o hash da senha e insere o usuário.
// Usado por createUser (cadastro público — sempre "cliente") e createStaffUser (admin cria equipe).
async function criarUsuario({ nome, email, senha, tipo_usuario }) {
    const existingUser = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
        return { erro: 'Email já cadastrado.' };
    }

    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash(senha, salt);

    const novoUsuario = await pool.query(
        'INSERT INTO usuarios (nome, email, senha, tipo_usuario) VALUES ($1, $2, $3, $4) RETURNING id, nome, email, tipo_usuario, data_cadastro',
        [nome, email, senhaHash, tipo_usuario]
    );

    return { usuario: novoUsuario.rows[0] };
}

// Criar um novo usuário (cadastro público — SEMPRE como "cliente", independente do que for enviado)
const createUser = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { nome, email, senha } = req.body;

    try {
        const resultado = await criarUsuario({ nome, email, senha, tipo_usuario: 'cliente' });
        if (resultado.erro) {
            return res.status(400).json({ message: resultado.erro });
        }

        res.status(201).json({
            message: 'Usuário criado com sucesso!',
            user: resultado.usuario
        });

    } catch (err) {
        console.error('Erro ao criar usuário:', err.message);
        res.status(500).json({ message: 'Erro no servidor ao criar usuário.', error: err.message });
    }
};

// Criar um usuário de equipe (admin ou recepcionista) — rota protegida, só admin autenticado
const createStaffUser = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { nome, email, senha, tipo_usuario } = req.body;

    try {
        const resultado = await criarUsuario({ nome, email, senha, tipo_usuario });
        if (resultado.erro) {
            return res.status(400).json({ message: resultado.erro });
        }

        res.status(201).json({
            message: 'Usuário criado com sucesso!',
            user: resultado.usuario
        });

    } catch (err) {
        console.error('Erro ao criar usuário de equipe:', err.message);
        res.status(500).json({ message: 'Erro no servidor ao criar usuário.', error: err.message });
    }
};

// Obter todos os usuários
const getAllUsers = async (req, res) => {
    try {
        const allUsers = await pool.query('SELECT id, nome, email, tipo_usuario, data_cadastro FROM usuarios');
        res.status(200).json(allUsers.rows);
    } catch (err) {
        console.error('Erro ao buscar usuários:', err.message);
        res.status(500).json({ message: 'Erro no servidor ao buscar usuários.', error: err.message });
    }
};

// Obter um usuário por ID
const getUserById = async (req, res) => {
    const { id } = req.params;

    const isSelf = String(req.user.id) === String(id);
    const isStaff = req.user.tipo_usuario === 'admin' || req.user.tipo_usuario === 'recepcionista';
    if (!isSelf && !isStaff) {
        return res.status(403).json({ message: 'Acesso negado. Você só pode consultar o próprio usuário.' });
    }

    try {
        const user = await pool.query('SELECT id, nome, email, tipo_usuario, data_cadastro FROM usuarios WHERE id = $1', [id]);
        if (user.rows.length === 0) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }
        res.status(200).json(user.rows[0]);
    } catch (err) {
        console.error('Erro ao buscar usuário por ID:', err.message);
        res.status(500).json({ message: 'Erro no servidor ao buscar usuário.', error: err.message });
    }
};

// Atualizar um usuário (o próprio perfil; ou qualquer usuário, se quem chama for admin)
const updateUser = async (req, res) => {
    const { id } = req.params;
    const { nome, email, tipo_usuario } = req.body;

    const isSelf = String(req.user.id) === String(id);
    const isAdmin = req.user.tipo_usuario === 'admin';

    if (!isSelf && !isAdmin) {
        return res.status(403).json({ message: 'Acesso negado. Você só pode atualizar o próprio perfil.' });
    }
    if (tipo_usuario !== undefined && !isAdmin) {
        return res.status(403).json({ message: 'Acesso negado. Apenas administradores podem alterar o tipo de usuário.' });
    }

    try {
        const updatedUser = await pool.query(
            'UPDATE usuarios SET nome = COALESCE($1, nome), email = COALESCE($2, email), tipo_usuario = COALESCE($3, tipo_usuario) WHERE id = $4 RETURNING id, nome, email, tipo_usuario',
            [nome, email, isAdmin ? tipo_usuario : null, id]
        );

        if (updatedUser.rows.length === 0) {
            return res.status(404).json({ message: 'Usuário não encontrado para atualização.' });
        }

        res.status(200).json({
            message: 'Usuário atualizado com sucesso!',
            user: updatedUser.rows[0]
        });

    } catch (err) {
        console.error('Erro ao atualizar usuário:', err.message);
        res.status(500).json({ message: 'Erro no servidor ao atualizar usuário.', error: err.message });
    }
};

// Deletar um usuário
const deleteUser = async (req, res) => {
    const { id } = req.params;
    try {
        const deletedUser = await pool.query('DELETE FROM usuarios WHERE id = $1 RETURNING id', [id]);
        if (deletedUser.rows.length === 0) {
            return res.status(404).json({ message: 'Usuário não encontrado para exclusão.' });
        }
        res.status(200).json({ message: 'Usuário excluído com sucesso!', id: id });
    } catch (err) {
        console.error('Erro ao deletar usuário:', err.message);
        res.status(500).json({ message: 'Erro no servidor ao deletar usuário.', error: err.message });
    }
};

// Função de Login
const loginUser = async (req, res) => {
    // Lidar com erros de validação do express-validator antes de consultar o banco
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, senha } = req.body;

    try {
        // 1. Verificar se o usuário existe
        const user = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        if (user.rows.length === 0) {
            return res.status(400).json({ message: 'Credenciais inválidas.' });
        }

        const foundUser = user.rows[0];

        // 2. Comparar a senha fornecida com a senha hashada no banco de dados
        const isMatch = await bcrypt.compare(senha, foundUser.senha);
        if (!isMatch) {
            return res.status(400).json({ message: 'Credenciais inválidas.' });
        }

        // 3. Gerar um JSON Web Token (JWT)
        const payload = {
            user: {
                id: foundUser.id,
                tipo_usuario: foundUser.tipo_usuario
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '1h' },
            (err, token) => {
                if (err) throw err;
                res.status(200).json({
                    message: 'Login bem-sucedido!',
                    token,
                    user: {
                        id: foundUser.id,
                        nome: foundUser.nome,
                        email: foundUser.email,
                        tipo_usuario: foundUser.tipo_usuario
                    }
                });
            }
        );

    } catch (err) {
        console.error('Erro no login:', err.message);
        res.status(500).json({ message: 'Erro no servidor durante o login.', error: err.message });
    }
};

// Alterar senha do próprio usuário logado
const changePassword = async (req, res) => {
    const userId = req.user.id;
    const { senhaAtual, novaSenha } = req.body;

    if (!senhaAtual || !novaSenha) {
        return res.status(400).json({ message: 'Senha atual e nova senha são obrigatórias.' });
    }
    if (novaSenha.length < 3) {
        return res.status(400).json({ message: 'A nova senha deve ter pelo menos 3 caracteres.' });
    }

    try {
        const result = await pool.query('SELECT senha FROM usuarios WHERE id = $1', [userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        const isMatch = await bcrypt.compare(senhaAtual, result.rows[0].senha);
        if (!isMatch) {
            return res.status(400).json({ message: 'Senha atual incorreta.' });
        }

        const salt = await bcrypt.genSalt(10);
        const novaSenhaHash = await bcrypt.hash(novaSenha, salt);

        await pool.query('UPDATE usuarios SET senha = $1 WHERE id = $2', [novaSenhaHash, userId]);

        res.status(200).json({ message: 'Senha alterada com sucesso!' });
    } catch (err) {
        console.error('Erro ao alterar senha:', err.message);
        res.status(500).json({ message: 'Erro no servidor ao alterar senha.', error: err.message });
    }
};

module.exports = {
    createUser,
    createStaffUser,
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
    loginUser,
    changePassword,
};