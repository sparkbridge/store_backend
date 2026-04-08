const express = require('express');
const os = require('os');
const { readData } = require('../utils/fileDb');
const authenticateToken = require('../middlewares/auth');
const router = express.Router();

// ================= 1. 增强版系统概览 =================
router.get('/overview', authenticateToken, async (req, res) => {
    try {
        const plugins = await readData('plugins.json');

        // 计算统计数据
        const totalPlugins = plugins.length;
        let totalViews = 0;
        let totalDownloads = 0;
        let topViewed = null;
        let topDownloaded = null;

        if (totalPlugins > 0) {
            // 累加总数
            plugins.forEach(p => {
                totalViews += (p.views || 0);
                totalDownloads += (p.downloads || 0);
            });

            // 寻找之最 (通过排序获取)
            topViewed = [...plugins].sort((a, b) => (b.views || 0) - (a.views || 0))[0];
            topDownloaded = [...plugins].sort((a, b) => (b.downloads || 0) - (a.downloads || 0))[0];
        }

        // 原有的硬件信息逻辑
        const cpus = os.cpus();
        const totalMem = Math.round(os.totalmem() / 1024 / 1024);
        const freeMem = Math.round(os.freemem() / 1024 / 1024);

        res.json({
            code: 200,
            msg: "success",
            data: {
                // 新增：插件业务统计
                plugin_stats: {
                    total_count: totalPlugins,
                    total_views: totalViews,
                    total_downloads: totalDownloads,
                    top_viewed: topViewed ? { name: topViewed.name, views: topViewed.views, icon: topViewed.icon } : null,
                    top_downloaded: topDownloaded ? { name: topDownloaded.name, downloads: topDownloaded.downloads, icon: topDownloaded.icon } : null
                },
                // 原有：硬件状态
                hardware: {
                    cpu_model: cpus[0].model,
                    cpu_cores: cpus.length,
                    mem_total_mb: totalMem,
                    mem_used_mb: totalMem - freeMem
                }
            }
        });
    } catch (error) {
        res.status(500).json({ code: 500, msg: "获取概览失败" });
    }
});

// ================= 2. 分页日志记录接口 =================
// 示例路径: /api/v1/system/logs?page=1&limit=10
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