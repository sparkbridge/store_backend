const express = require('express');
const os = require('os');
const authenticateToken = require('../middlewares/auth');
const router = express.Router();

// 获取系统数据概览 (受保护)
// 实际请求路径: GET /api/v1/system/overview
router.get('/overview', authenticateToken, (req, res) => {
    // 获取真实的系统硬件信息
    const cpus = os.cpus();
    const cpuLoad = os.loadavg(); // 返回 1, 5, 15 分钟的平均负载
    const totalMemMb = Math.round(os.totalmem() / 1024 / 1024);
    const freeMemMb = Math.round(os.freemem() / 1024 / 1024);
    const usedMemMb = totalMemMb - freeMemMb;

    // 组装 Dashboard 数据
    res.json({
        code: 200,
        msg: "success",
        data: {
            hardware: {
                cpu_model: cpus[0].model, // 新增：展示具体的 CPU 型号
                cpu_cores: `${cpus.length} Cores (${os.arch()})`,
                cpu_load: `${(cpuLoad[0] * 10).toFixed(1)}% / ${cpuLoad.map(l => l.toFixed(2)).join(', ')}`,
                mem_total_mb: totalMemMb,
                mem_used_mb: usedMemMb,
                disk_total_gb: 500, // Node.js 原生获取磁盘容量较麻烦，这里继续使用占位符
                disk_free_gb: 412
            },
            traffic: {
                // 使用随机数模拟实时流量波动
                today_uv: Math.floor(Math.random() * 50) + 1000,
                today_pv: Math.floor(Math.random() * 200) + 4000,
                month_pv: 32768,
                active_connections: Math.floor(Math.random() * 10) + 5
            }
        }
    });
});

module.exports = router;