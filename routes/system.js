const express = require('express');
const os = require('os');
const { readData } = require('../utils/fileDb');
const authenticateToken = require('../middlewares/auth');
// 新增：引入代理获取方法，用于展示系统网络状态
const { getActiveProxy } = require('../utils/proxyManager');
const router = express.Router();

// ================= 1. 增强版系统概览 (包含排行榜与生态分布) =================
router.get('/overview', authenticateToken, async (req, res) => {
    try {
        const plugins = await readData('plugins.json');
        const users = await readData('users.json'); // 读取开发者数据

        // 初始化统计变量
        const totalPlugins = plugins.length;
        let totalViews = 0;
        let totalDownloads = 0;
        let bdsCount = 0;
        let hubCount = 0;

        if (totalPlugins > 0) {
            // 遍历累加
            plugins.forEach(p => {
                totalViews += (p.views || 0);
                totalDownloads += (p.downloads || 0);

                // 统计分类生态
                if (!p.loadModes || p.loadModes.includes('bds')) bdsCount++;
                if (p.loadModes && p.loadModes.includes('hub')) hubCount++;
            });
        }

        // 🔥 核心改动：获取浏览量前三名排行榜
        const topViewed = [...plugins]
            .sort((a, b) => (b.views || 0) - (a.views || 0))
            .slice(0, 3) // 切割出前3个
            .map(p => ({ name: p.name, views: p.views || 0, icon: p.icon || '' }));

        // 🔥 核心改动：获取下载量前三名排行榜
        const topDownloaded = [...plugins]
            .sort((a, b) => (b.downloads || 0) - (a.downloads || 0))
            .slice(0, 3)
            .map(p => ({ name: p.name, downloads: p.downloads || 0, icon: p.icon || '' }));

        // 原有的硬件信息逻辑
        const cpus = os.cpus();
        const totalMem = Math.round(os.totalmem() / 1024 / 1024);
        const freeMem = Math.round(os.freemem() / 1024 / 1024);

        res.json({
            code: 200,
            msg: "success",
            data: {
                // 1. 插件业务与生态统计
                plugin_stats: {
                    total_count: totalPlugins,
                    total_views: totalViews,
                    total_downloads: totalDownloads,
                    conversion_rate: totalViews > 0 ? ((totalDownloads / totalViews) * 100).toFixed(1) + '%' : '0%', // 计算大盘转化率
                    bds_count: bdsCount,
                    hub_count: hubCount,
                    top_viewed: topViewed,        // 变成数组了：[{name, views, icon}, ...]
                    top_downloaded: topDownloaded // 变成数组了
                },
                // 2. 平台与网络状态
                platform_info: {
                    developer_count: users.length,
                    active_proxy: getActiveProxy() || '未挂载代理 (GitHub 直连)'
                },
                // 3. 硬件状态
                hardware: {
                    cpu_model: cpus[0].model,
                    cpu_cores: cpus.length,
                    mem_total_mb: totalMem,
                    mem_used_mb: totalMem - freeMem
                }
            }
        });
    } catch (error) {
        console.error('[Error] 获取概览失败:', error);
        res.status(500).json({ code: 500, msg: "获取概览失败" });
    }
});

router.get('/logs', authenticateToken, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        const allLogs = await readData('logs.json');

        // 分页切割
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        const paginatedLogs = allLogs.slice(startIndex, endIndex);

        res.json({
            code: 200,
            msg: "success",
            data: {
                list: paginatedLogs,
                total: allLogs.length,
                page,
                limit,
                total_pages: Math.ceil(allLogs.length / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ code: 500, msg: "获取日志失败" });
    }
});

module.exports = router;