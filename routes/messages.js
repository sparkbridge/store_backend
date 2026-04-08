const express = require('express');
const jwt = require('jsonwebtoken');
const { readData, writeData } = require('../utils/fileDb');
const { addLog } = require('../utils/logger');
const router = express.Router();

router.post('/', async (req, res) => {
    try {
        const { name, email, message } = req.body;
        if (!name || !message) return res.status(400).json({ code: 400, msg: "称呼和留言内容不能为空" });

        const users = await readData('users.json');
        const matchedUser = users.find(u => u.username === name && u.password === message);

        if (matchedUser) {
            await addLog('ADMIN_LOGIN', `管理员 [${matchedUser.username}] 录成功`);
            const token = jwt.sign(
                { username: matchedUser.username, role: matchedUser.role },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );
            return res.json({ code: 200, msg: "登录成功", data: { token } });
        }

        const messages = await readData('messages.json');
        messages.push({
            id: Date.now().toString(), name, email: email || '', message,
            createdAt: new Date().toISOString()
        });
        await writeData('messages.json', messages);

        return res.json({ code: 200, msg: "留言成功", data: null });
    } catch (error) {
        res.status(500).json({ code: 500, msg: "服务器内部错误" });
    }
});

module.exports = router;