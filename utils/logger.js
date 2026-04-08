const { readData, writeData } = require('./fileDb');

/**
 * 记录系统日志
 * @param {string} action 动作名称 (如: 'LOGIN', 'DOWNLOAD')
 * @param {string} details 详细描述
 */
async function addLog(action, details) {
    try {
        const logs = await readData('logs.json');

        const newLog = {
            id: Date.now() + Math.random().toString(36).substr(2, 5),
            action,
            details,
            timestamp: new Date().toISOString()
        };

        // 将新日志插入到数组最前面（方便默认展示最新）
        logs.unshift(newLog);

        // 为了性能，建议只保留最近的 2000 条日志
        const truncatedLogs = logs.slice(0, 2000);

        await writeData('logs.json', truncatedLogs);
    } catch (error) {
        console.error('[Logger] 记录日志失败:', error);
    }
}

module.exports = { addLog };