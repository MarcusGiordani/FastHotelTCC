// fasthotel-api/routes/serviceRoutes.js
const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const auth = require('../middleware/authMiddleware'); // Middleware de autenticação
const authorize = require('../middleware/authorize');

// Leitura: qualquer autenticado (catálogo de serviços não é sensível e pode ser
// consultado por clientes, ex. ao registrar consumo da própria reserva).
router.get('/', auth, serviceController.getAllServices);
router.get('/:id', auth, serviceController.getServiceById);

// Escrita (inclusive preço): somente equipe.
router.post('/', auth, authorize(['admin', 'recepcionista']), serviceController.createService);
router.put('/:id', auth, authorize(['admin', 'recepcionista']), serviceController.updateService);
router.delete('/:id', auth, authorize(['admin', 'recepcionista']), serviceController.deleteService);

module.exports = router;