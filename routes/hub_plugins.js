const express = require('express');
const { readData } = require('../utils/fileDb');
const { addLog } = require('../utils/logger');
const router = express.Router();


// 实际请求路径: GET /api/v1/hub_plugins
router.get('/', async (req, res) => {
    try {
        const plugins = await readData('plugins.json');

        // 🔥 核心逻辑：只保留 loadModes 里明确包含 'hub' 的插件
        const hubPlugins = plugins.filter(p => {
            return p.loadModes && p.loadModes.includes('hub');
        });

        await addLog('PLUGIN_VIEW', `用户(${req.ip})查看了所有 HUB 插件`);

        // 按发布时间倒序排列
        const sortedPlugins = hubPlugins.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // 同样进行数据裁剪
        const listData = sortedPlugins.map(p => ({
            name: p.name,
            version: p.version,
            author: p.author,
            desc: p.desc,
            icon: p.icon || '',
            tags: p.tags || [],
            loadModes: p.loadModes
        }));

        res.json({ code: 200, msg: "success", data: listData });
    } catch (error) {
        console.error('[Error] 获取 Hub 插件列表失败:', error);
        res.status(500).json({ code: 500, msg: "获取 Hub 插件列表失败", data: [] });
    }
});

module.exports = router;