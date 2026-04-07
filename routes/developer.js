const express = require('express');
const { readData, writeData } = require('../utils/fileDb');
const authenticateToken = require('../middlewares/auth');
const router = express.Router();

// 挂载鉴权中间件：所有 /developer 下的接口都需要 Token 才能访问
router.use(authenticateToken);

// ================= 1. 代理管理 =================

// GET /proxy：返回保存的代理 URL 数组
router.get('/proxies', async (req, res) => {
    try {
        const proxies = await readData('proxies.json');
        res.json({ code: 200, msg: "success", data: proxies });
    } catch (error) {
        res.status(500).json({ code: 500, msg: "读取代理数据失败", data: [] });
    }
});

// POST /proxy：接收 { url: ["..."] } 并持久化保存
router.put('/proxies', async (req, res) => {
    try {
        const { proxies:url} = req.body;
        // console.log(req)

        // console.log(url)

        // 校验传入的是否为数组
        if (!url || !Array.isArray(url)) {
            return res.status(400).json({ code: 400, msg: "无效的参数格式，url 必须是一个数组" });
        }

        // 覆盖写入 proxies.json
        await writeData('proxies.json', url);
        res.json({ code: 200, msg: "代理设置保存成功" });
    } catch (error) {
        res.status(500).json({ code: 500, msg: "保存代理数据失败" });
    }
});


// ================= 2. 插件管理 =================

// GET /plugins：获取当前登录开发者自己的插件列表
router.get('/plugins', async (req, res) => {
    try {
        // 1. 直接从 Token 中提取身份，绝对可信
        const currentDeveloper = req.user.username;



        // 2. 读取所有插件数据
        const allPlugins = await readData('plugins.json');

        

        // 3. 严格过滤，只返回属于该开发者的插件
        const myPlugins = allPlugins.filter(p => p.author === currentDeveloper);

        res.json({ code: 200, msg: "success", data: myPlugins });

    } catch (error) {
        console.error('[Error] 读取插件列表失败:', error);
        res.status(500).json({ code: 500, msg: "读取插件数据失败", data: [] });
    }
});
router.get('/plugins/stats', async (req, res) => {
    try {
        // 1. 从 Token 中提取当前登录的开发者身份
        const currentDeveloper = req.user.username;

        // 2. 读取所有的插件数据
        const allPlugins = await readData('plugins.json');

        // 3. 过滤并映射数据格式
        const statsData = allPlugins
            .filter(p => p.author === currentDeveloper) // 仅保留自己的插件
            .map(p => ({
                name: p.name,
                icon: p.icon || '', // 容错：如果没有图标则返回空字符串
                // 如果原 JSON 中还没有这两个字段，默认返回 0 
                // (如果你为了立刻看前端效果，可以临时改成 Math.floor(Math.random() * 1000) 模拟数据)
                views: p.views || 0,
                downloads: p.downloads || 0
            }));

        // 4. 返回约定好的 JSON 格式
        res.json({
            code: 200,
            msg: "success",
            data: statsData
        });

    } catch (error) {
        console.error('[Error] 读取插件统计数据失败:', error);
        res.status(500).json({
            code: 500,
            msg: "读取统计数据失败",
            data: []
        });
    }
});

router.get('/plugins/:name', async (req, res) => {
    try {
        const { name } = req.params;
        const plugins = await readData('plugins.json');
        const plugin = plugins.find(p => p.name === name);

        if (!plugin) {
            return res.status(404).json({ code: 404, msg: "未找到该插件" });
        }

        res.json({ code: 200, msg: "success", data: plugin });
    } catch (error) {
        res.status(500).json({ code: 500, msg: "获取插件详情失败" });
    }
});


// PUT /plugins/:name：更新指定名称的插件信息
router.put('/plugins/:name', async (req, res) => {
    try {
        const { name } = req.params;
        const updatePayload = req.body;

        // 获取当前操作者的身份
        const currentDeveloper = req.user.username;

        const plugins = await readData('plugins.json');
        const pluginIndex = plugins.findIndex(p => p.name === name);

        // 1. 检查插件是否存在
        if (pluginIndex === -1) {
            return res.status(404).json({ code: 404, msg: `未找到名称为 ${name} 的插件` });
        }

        // 2. 核心安全防御 (BOLA 防御)：判断这个插件是不是当前登录人的！
        if (plugins[pluginIndex].author !== currentDeveloper) {
            return res.status(403).json({
                code: 403,
                msg: "越权操作拒绝：你只能修改属于你自己的插件！"
            });
        }

        // 3. 合并更新数据
        plugins[pluginIndex] = {
            ...plugins[pluginIndex], // 保留旧数据
            ...updatePayload,        // 覆盖新数据
            author: currentDeveloper // 强制锁死作者字段，防止恶意黑客通过请求体把作者改成别人
        };

        // 写回文件
        await writeData('plugins.json', plugins);

        res.json({ code: 200, msg: `插件 ${name} 更新成功`, data: plugins[pluginIndex] });
    } catch (error) {
        console.error('[Error] 更新插件失败:', error);
        res.status(500).json({ code: 500, msg: "更新插件数据失败" });
    }
});

router.delete('/plugins/:name', async (req, res) => {
    try {
        const { name } = req.params;
        const currentDeveloper = req.user.username; // 从 Token 提取当前登录者身份

        const plugins = await readData('plugins.json');
        const pluginIndex = plugins.findIndex(p => p.name === name);

        // 1. 检查要删除的插件是否存在
        if (pluginIndex === -1) {
            return res.status(404).json({
                code: 404,
                msg: `删除失败：未找到名称为 [${name}] 的插件`
            });
        }

        // 🔥 2. 核心安全防御：越权拦截
        // 严格比对：这个插件的作者，是不是当前发起请求的人？
        if (plugins[pluginIndex].author !== currentDeveloper) {
            return res.status(403).json({
                code: 403,
                msg: "越权操作拒绝：你只能删除属于你自己的插件！"
            });
        }

        // 3. 执行删除操作 (使用 splice 从数组中移除该项)
        plugins.splice(pluginIndex, 1);

        // 4. 写回文件并同步更新内存缓存
        await writeData('plugins.json', plugins);

        // (可选) 如果你之前配置了 GitHub Action 自动同步，也可以在这里触发一下，让 Github 仓库也知道这个插件下架了
        // triggerGithubAction(name, 'deleted');

        res.json({
            code: 200,
            msg: `插件 [${name}] 已成功删除`
        });

    } catch (error) {
        console.error('[Error] 删除插件失败:', error);
        res.status(500).json({ code: 500, msg: "服务器内部错误，删除失败" });
    }
});

// POST /plugins：发布新插件
// 实际请求路径: POST /api/v1/developer/plugins
// POST /plugins：发布新插件
router.post('/plugins', async (req, res) => {
    try {
        const newPlugin = req.body;
        const currentDeveloper = req.user.username;

        // 1. 基础字段校验 (新字段可选填，就不加入强校验了)
        if (!newPlugin.name || !newPlugin.version || !newPlugin.downloadUrl) {
            return res.status(400).json({ code: 400, msg: "名称、版本和下载链接是必填项" });
        }

        const plugins = await readData('plugins.json');
        if (plugins.some(p => p.name === newPlugin.name)) {
            return res.status(409).json({ code: 409, msg: `发布失败：已存在名为 [${newPlugin.name}] 的插件。` });
        }

        // 🔥 2. 组装最终数据：加入新增的 docUrl 和 longDesc
        const pluginToSave = {
            ...newPlugin,
            docUrl: newPlugin.docUrl || '',     // 适配新字段：文档链接，没有则为空字符串
            longDesc: newPlugin.longDesc || '', // 适配新字段：长描述，没有则为空字符串
            loadModes: Array.isArray(newPlugin.loadModes) ? newPlugin.loadModes : ['bds'],
            author: currentDeveloper,
            views: 0,
            downloads: 0,
            createdAt: new Date().toISOString()
        };

        plugins.push(pluginToSave);
        await writeData('plugins.json', plugins);

        res.json({ code: 200, msg: "插件发布成功！", data: pluginToSave });

    } catch (error) {
        console.error('[Error] 发布插件失败:', error);
        res.status(500).json({ code: 500, msg: "服务器内部错误，发布失败" });
    }
});

module.exports = router;