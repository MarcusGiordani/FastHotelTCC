// fasthotel-api/routes/guestRoutes.js
const express = require('express');
const router = express.Router();
const guestController = require('../controllers/guestController');
const auth = require('../middleware/authMiddleware');
const authorize = require('../middleware/authorize');

// Criação: qualquer autenticado (cliente cadastra o hóspede ao fazer a própria reserva).
router.post('/', auth, guestController.createGuest);

// Listagem completa: só equipe (expõe PII de todos os hóspedes).
router.get('/', auth, authorize(['admin', 'recepcionista']), guestController.getAllGuests);

// Por ID: equipe acessa qualquer um; cliente só o hóspede vinculado a uma reserva própria
// (verificado dentro do controller, já que depende do vínculo em "reservas").
router.get('/:id', auth, guestController.getGuestById);
router.put('/:id', auth, guestController.updateGuest);

// Exclusão é destrutiva (cascata em reservas/pagamentos/chat) — só equipe.
router.delete('/:id', auth, authorize(['admin', 'recepcionista']), guestController.deleteGuest);

module.exports = router;