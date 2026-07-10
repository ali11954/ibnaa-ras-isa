const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/reviewController');

router.get('/', ctrl.getAll);
router.get('/stats', ctrl.getStats);
router.post('/', ctrl.create);
router.delete('/:id', ctrl.remove);

module.exports = router;