const { readData } = require('./fileDb');

// 内存中缓存当前最快、可用的代理头
let activeProxy = '';

// 用于测试连通性的目标 URL（选一个你仓库里一定存在的小文件，比如 README，或者 Github API）
const TEST_URL = 'https://raw.githubusercontent.com/sparkbridge/plugins_hub/main/README.md';

/**
 * 拨测单个代理节点的健康状态与延迟
 */
async function testProxy(proxyUrl) {
    const controller = new AbortController();
    // 设置 5 秒超时，防止某个死代理把定时器卡住
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const startTime = Date.now();

    try {
        // 规范化代理前缀拼接（处理结尾有没有斜杠的情况）
        const urlToFetch = proxyUrl.endsWith('/') ? `${proxyUrl}${TEST_URL}` : `${proxyUrl}/${TEST_URL}`;

        const res = await fetch(urlToFetch, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
            return { url: proxyUrl, time: Date.now() - startTime, ok: true };
        }
        return { url: proxyUrl, time: 9999, ok: false };
    } catch (error) {
        clearTimeout(timeoutId);
        return { url: proxyUrl, time: 9999, ok: false }; // 超时或拒绝连接
    }
}

/**
 * 更新全局最优代理
 */
async function updateActiveProxy() {
    try {
        const proxies = await readData('proxies.json');
        if (!proxies || proxies.length === 0) {
            activeProxy = '';
            return;
        }

        // 并发测试池子里的所有代理
        const results = await Promise.all(proxies.map(testProxy));

        // 过滤出存活的节点，并按延迟从小到大排序
        const validProxies = results.filter(r => r.ok).sort((a, b) => a.time - b.time);

        if (validProxies.length > 0) {
            activeProxy = validProxies[0].url;
            console.log(`[Proxy Scheduler] 节点连通！已切换至最优代理: ${activeProxy} (延迟: ${validProxies[0].time}ms)`);
        } else {
            activeProxy = ''; // 全挂了，清空代理池，回退到 GitHub 直连
            console.log(`[Proxy Scheduler] ⚠️ 警告：所有代理节点均已失效，回退至直连模式。`);
        }
    } catch (error) {
        console.error('[Proxy Scheduler] 拨测任务异常:', error);
    }
}

/**
 * 获取当前存活的代理
 */
function getActiveProxy() {
    return activeProxy;
}

/**
 * 启动后台定时拨测任务
 */
function startProxyCron() {
    console.log('[Proxy Scheduler] 代理自动调度服务已启动...');
    updateActiveProxy(); // 服务启动时立刻测一次
    // 每 10 分钟 (600,000 毫秒) 重新拨测一次
    setInterval(updateActiveProxy, 10 * 60 * 1000);
}

module.exports = { startProxyCron, getActiveProxy };