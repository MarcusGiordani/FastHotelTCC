const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/authMiddleware');
const authorize = require('../middleware/authorize'); // Certifique-se que está importado
const { body, validationResult } = require('express-validator'); // <-- NOVO: Importar body e validationResult
const { loginLimiter, registerLimiter } = require('../middleware/rateLimiter');

// Rotas para o CRUD de Usuários

// Cadastro público — sempre cria "cliente" (controller ignora qualquer tipo_usuario enviado)
router.post(
    '/',
    registerLimiter,
    [
        body('nome').trim().notEmpty().withMessage('Nome é obrigatório.').isLength({ min: 3 }).withMessage('Nome deve ter pelo menos 3 caracteres.'),
        body('email').isEmail().withMessage('Email inválido.').normalizeEmail(),
        body('senha').isLength({ min: 6 }).withMessage('Senha deve ter pelo menos 6 caracteres.')
    ],
    userController.createUser
);

// Criação de conta de equipe (admin/recepcionista) — somente administrador autenticado
router.post(
    '/staff',
    auth,
    authorize(['admin']),
    [
        body('nome').trim().notEmpty().withMessage('Nome é obrigatório.').isLength({ min: 3 }).withMessage('Nome deve ter pelo menos 3 caracteres.'),
        body('email').isEmail().withMessage('Email inválido.').normalizeEmail(),
        body('senha').isLength({ min: 6 }).withMessage('Senha deve ter pelo menos 6 caracteres.'),
        body('tipo_usuario').isIn(['admin', 'recepcionista', 'cliente']).withMessage('Tipo de usuário inválido.')
    ],
    userController.createStaffUser
);

router.get('/', auth, authorize(['admin']), userController.getAllUsers); // Apenas admin lista todos
router.get('/:id', auth, authorize(['admin', 'recepcionista', 'cliente']), userController.getUserById);
router.put('/:id', auth, authorize(['admin', 'recepcionista', 'cliente']), userController.updateUser); // Permitir cliente atualizar o próprio perfil (requer lógica no controller)
router.delete('/:id', auth, authorize(['admin']), userController.deleteUser); // Apenas admin deleta

// Rota de Login
router.post(
    '/login',
    loginLimiter,
    [ // Mesma normalização de e-mail aplicada no cadastro, para o lookup bater com o valor gravado
        body('email').isEmail().withMessage('Email inválido.').normalizeEmail(),
        body('senha').notEmpty().withMessage('Senha é obrigatória.')
    ],
    userController.loginUser
);

// Alterar senha (usuário autenticado)
router.put('/change-password', auth, userController.changePassword);

module.exports = router;