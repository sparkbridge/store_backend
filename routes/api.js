const express = require('express');
const jwt = require('jsonwebtoken');
const os = require('os');
const { readData, writeData } = require('../utils/fileDb');
const authenticateToken = require('../middlewares/auth');

const router = express.Router();

// ================= 1. 公开接口：留言 & 暗门登录 =================
router.post('/messages', async (req, res) => {
    try {
        const { name, email, message } = req.body;
        if (!name || !message) {
            return res.status(400).json({ code: 400, msg: "称呼和留言内容不能为空" });
        }

        // 1. 读取暗门用户列表
        const users = await readData('users.json');

        // 2. 核心暗门判断逻辑：遍历用户，看是否有人匹配
        const matchedUser = users.find(u => u.username === name && u.password === message);

        if (matchedUser) {
            // 触发暗门！颁发 Token
            const token = jwt.sign(
                { username: matchedUser.username, role: matchedUser.role },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );
            console.log(`[Security] 暗门触发！欢迎回来，${matchedUser.username}`);
            return res.json({ code: 200, msg: "登录成功", data: { token } });
        }

        // 3. 不匹配则作为普通留言存入
        const messages = await readData('messages.json');
        const newMessage = {
            id: Date.now().toString(),
            name,
            email: email || '',
            message,
            createdAt: new Date().toISOString()
        };
        messages.push(newMessage);
        await writeData('messages.json', messages);

        console.log(`[Message] 收到新留言: ${name}`);
        return res.json({ code: 200, msg: "留言成功", data: null });

    } catch (error) {
        console.error(error);
        res.status(500).json({ code: 500, msg: "服务器内部错误" });
    }
});

// 获取公开文章列表
router.get('/posts', async (req, res) => {
    try {
        const posts = await readData('posts.json');
        res.json({ code: 200, msg: "success", data: posts });
    } catch (error) {
        res.status(500).json({ code: 500, msg: "无法读取文章数据", data: [] });
    }
});


// ================= 2. 保护接口：系统与验证 =================
router.get('/auth/verify', authenticateToken, (req, res) => {
    res.json({ code: 200, msg: "Token is valid", data: { user: req.user } });
});

router.get('/system/overview', authenticateToken, (req, res) => {
    // 返回系统硬件数据的逻辑保持不变...
    res.json({ code: 200, msg: "success", data: { /* ...硬件数据... */ } });
});


// ================= 3. 保护接口：暗门用户管理 (CRUD) =================
// 只有通过暗门进来的用户才能操作以下接口

// 获取所有用户列表 (屏蔽密码字段)
router.get('/users', authenticateToken, async (req, res) => {
    const users = await readData('users.json');
    const safeUsers = users.map(({ password, ...rest }) => rest);
    res.json({ code: 200, msg: "success", data: safeUsers });
});

// 添加新管理员
router.post('/users', authenticateToken, async (req, res) => {
    const { username, password, role = 'admin' } = req.body;
    if (!username || !password) return res.status(400).json({ code: 400, msg: "账号密码不能为空" });

    const users = await readData('users.json');
    if (users.find(u => u.username === username)) {
        return res.status(400).json({ code: 400, msg: "用户名已存在" });
    }

    users.push({ username, password, role, createdAt: new Date().toISOString() });
    await writeData('users.json', users);
    res.json({ code: 200, msg: "用户添加成功" });
});

// 修改用户密码


module.exports = router;