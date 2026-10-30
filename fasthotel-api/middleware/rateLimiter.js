// fasthotel-api/middleware/rateLimiter.js
//
// Proteção básica contra bots/abuso em endpoints públicos sensíveis (login e
// cadastro). Limites configuráveis via variáveis de ambiente para permitir
// thresholds baixos e determinísticos nos testes de segurança (tests/security/bots.test.js)
// sem afetar o comportamento real em desenvolvimento/produção.

const rateLimit = require('express-rate-limit');

const int = (value, fallback) => {
    const n = parseInt(value, 10);
    return Number.isFinite(n) && n > 0 ? n : fallback;
};

// Login: protege contra força bruta de senha. Padrão: 10 tentativas / 15 min por IP.
const loginLimiter = rateLimit({
    windowMs: int(process.env.RATE_LIMIT_LOGIN_WINDOW_MS, 15 * 60 * 1000),
    limit: int(process.env.RATE_LIMIT_LOGIN_MAX, 10),
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Muitas tentativas de login. Tente novamente mais tarde.' },
});

// Cadastro público: protege contra criação massiva de contas por bots. Padrão: 10 cadastros / hora por IP.
const registerLimiter = rateLimit({
    windowMs: int(process.env.RATE_LIMIT_REGISTER_WINDOW_MS, 60 * 60 * 1000),
    limit: int(process.env.RATE_LIMIT_REGISTER_MAX, 10),
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Muitas tentativas de cadastro. Tente novamente mais tarde.' },
});

module.exports = { loginLimiter, registerLimiter };
