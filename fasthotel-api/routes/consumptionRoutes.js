// fasthotel-api/routes/consumptionRoutes.js
const express = require('express');
const router = express.Router();
const consumptionController = require('../controllers/consumptionController');
const auth = require('../middleware/authMiddleware'); // Middleware de autenticação

// Todas as rotas exigem apenas autenticação — o vínculo com a reserva (cliente só
// acessa consumo da PRÓPRIA reserva; equipe acessa qualquer uma) é verificado
// dentro do controller, pois depende de qual reserva cada consumo pertence.
router.post('/', auth, consumptionController.createConsumption);
router.get('/', auth, consumptionController.getAllConsumptions);
router.get('/:id', auth, consumptionController.getConsumptionById);
router.put('/:id', auth, consumptionController.updateConsumption);
router.delete('/:id', auth, consumptionController.deleteConsumption);

module.exports = router;