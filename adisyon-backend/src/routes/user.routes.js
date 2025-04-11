const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { roleMiddleware } = require('../middleware/auth.middleware');

router.get('/',roleMiddleware(['admin','manager']), userController.getAllUsers);

router.get('/:id',roleMiddleware(['admin','manager']), userController.getUserById);

router.post('/',roleMiddleware(['admin']), userController.createUser);

router.put('/:id', roleMiddleware(['admin']), userController.updateUser);

router.delete('/:id', roleMiddleware(['admin']), userController.deleteUser);

module.exports = router;