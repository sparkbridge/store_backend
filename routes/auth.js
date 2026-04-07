const express = require('express');
const authenticateToken = require('../middlewares/auth');
const { readData, writeData } = require('../utils/fileDb'); // 新增：引入文件读写工具
const router = express.Router();

// ================= 1. 验证 Token 是否有效 =================
// 实际请求路径: GET /api/v1/auth/verify
router.get('/verify', authenticateToken, (req, res) => {
    res.json({
        code: 200,
        msg: "Token is valid",
        data: {
            user: req.user.username,
            role: req.user.role
        }
    });
});

// ================= 2. 修改当前用户密码 =================
// 实际请求路径: PUT /api/v1/auth/password
router.put('/password', authenticateToken, async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        // 从 Token 中安全提取当前操作者的账号名
        const currentUsername = req.user.username;

        // 1. 基础参数校验
        if (!oldPassword || !newPassword) {
            return res.status(400).json({
                code: 400,
                msg: "旧密码和新密码不能为空"
            });
        }

        // 2. 读取所有用户数据
        const users = await readData('users.json');
        const userIndex = users.findIndex(u => u.username === currentUsername);

        // 容错兜底：万一 Token 有效但用户刚被超级管理员删了
        if (userIndex === -1) {
            return res.status(404).json({
                code: 404,
                msg: "用户不存在或已被删除"
            });
        }

        // 🔥 3. 核心安全防御：比对旧密码
        if (users[userIndex].password !== oldPassword) {
            return res.status(400).json({
                code: 400,
                msg: "原密码验证失败"
            });
        }

        // 4. 校验通过，更新为新密码
        users[userIndex].password = newPassword;

        // 5. 写回文件并更新内存缓存
        await writeData('users.json', users);

        res.json({
            code: 200,
            msg: "密码修改成功"
        });

    } catch (error) {
        console.error('[Error] 修改密码失败:', error);
        res.status(500).json({ code: 500, msg: "服务器内部错误，密码修改失败" });
    }
});

module.exports = router;