const express = require('express');
const router = express.Router();

const messagesRoutes = require('./messages');
const usersRoutes = require('./users');
const postsRoutes = require('./posts');
const systemRoutes = require('./system');
const authRoutes = require('./auth');
const developerRoutes = require('./developer');
// 新增：引入公开的插件市场路由
const publicPluginsRoutes = require('./plugins');
const hubPluginsRoutes = require('./hub_plugins');

router.use('/messages', messagesRoutes);
router.use('/users', usersRoutes);
router.use('/posts', postsRoutes);
router.use('/system', systemRoutes);
router.use('/auth', authRoutes);
router.use('/developer', developerRoutes);
// 新增：挂载到 /api/v1/plugins
router.use('/plugins', publicPluginsRoutes);
router.use('/hub_plugins', hubPluginsRoutes);

module.exports = router;