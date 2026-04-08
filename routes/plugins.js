const express = require('express');
const { readData, writeData } = require('../utils/fileDb');
const router = express.Router();
const { getActiveProxy } = require('../utils/proxyManager');
const { addLog } = require('../utils/logger');
// ================= 1. 获取所有公开插件列表 =================
// GET /api/v1/plugins ：获取所有公开插件列表 (精简版)
router.get('/', async (req, res) => {
    try {
        const plugins = await readData('plugins.json');
        const bdsPlugins = plugins.filter(p => {
            return !p.loadModes || p.loadModes.includes('bds');
        });
        const sortedPlugins = bdsPlugins.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // 数据裁剪
        const listData = sortedPlugins.map(p => ({
            name: p.name,
            version: p.version,
            author: p.author,
            desc: p.desc,          // 列表页只展示简短描述
            icon: p.icon || '',
            tags: p.tags || [],
            loadModes: p.loadModes || ['bds']
        }));

        res.json({ code: 200, msg: "success", data: listData });
    } catch (error) {
        console.error('[Error] 获取精简插件列表失败:', error);
        res.status(500).json({ code: 500, msg: "获取插件列表失败", data: [] });
    }
});

// ================= 2. 获取单个插件详情 & 统计浏览量 =================
// 实际请求路径: GET /api/v1/plugins/:name
router.get('/:name', async (req, res) => {
    try {
        const { name } = req.params;
        const plugins = await readData('plugins.json');
        const pluginIndex = plugins.findIndex(p => p.name === name);

        if (pluginIndex === -1) {
            return res.status(404).json({ code: 404, msg: "未找到该插件" });
        }

        // 🔥 核心逻辑：浏览量 +1
        // 如果原数据里没有 views 字段，(plugins[pluginIndex].views || 0) 会将其初始化为 0
        plugins[pluginIndex].views = (plugins[pluginIndex].views || 0) + 1;

        await addLog('PLUGIN_VIEW', `用户查看了插件: ${name}`);

        // 异步将更新后的数据写回 JSON 和内存缓存
        // 注意：这里故意不加 await！让硬盘慢慢去写，我们立刻把数据返回给前端，保证接口极速响应
        writeData('plugins.json', plugins).catch(err => console.error('[Error] 更新浏览量失败:', err));

        res.json({ code: 200, msg: "success", data: plugins[pluginIndex] });
    } catch (error) {
        res.status(500).json({ code: 500, msg: "获取插件详情失败" });
    }
});

// ================= 3. 专属下载通道 & 统计下载量 =================
// 实际请求路径: GET /api/v1/plugins/:name/download
router.get('/:name/download', async (req, res) => {
    try {
        const { name } = req.params;
        const plugins = await readData('plugins.json');
        const pluginIndex = plugins.findIndex(p => p.name === name);


        if (pluginIndex === -1) {
            return res.status(404).json({ code: 404, msg: "未找到该插件" });
        }


        await addLog('PLUGIN_DOWNLOAD', `用户下载了插件: ${name}`);

        const plugin = plugins[pluginIndex];
        if (!plugin.downloadUrl) {
            return res.status(400).json({ code: 400, msg: "该插件作者暂未提供下载链接" });
        }

        // 统计下载量
        plugins[pluginIndex].downloads = (plugins[pluginIndex].downloads || 0) + 1;
        writeData('plugins.json', plugins).catch(err => console.error('[Error] 更新下载量失败:', err));

        // 🔥 核心动态代理逻辑 🔥
        let targetUrl = plugin.downloadUrl;
        const currentProxy = getActiveProxy();

        // 只有当有可用代理，且目标地址确实是 GitHub 时才拼接代理头，防止误伤外部图床或自定义直链
        if (currentProxy && (targetUrl.includes('github.com') || targetUrl.includes('githubusercontent.com'))) {
            targetUrl = currentProxy.endsWith('/')
                ? `${currentProxy}${targetUrl}`
                : `${currentProxy}/${targetUrl}`;
        }

        // 返回 302 重定向到拼接后的加速地址（或者直连地址）
        res.redirect(302, targetUrl);

    } catch (error) {
        console.error('[Error] 处理下载请求失败:', error);
        res.status(500).json({ code: 500, msg: "服务器内部错误，无法处理下载" });
    }
});

module.exports = router;