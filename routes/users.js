const express = require('express');
const { readData, writeData } = require('../utils/fileDb');
const authenticateToken = require('../middlewares/auth');
const router = express.Router();

// 所有 /users 下的路由默认使用鉴权中间件
router.use(authenticateToken);

router.get('/', async (req, res) => {
    const users = await readData('users.json');
    const safeUsers = users.map(({ password, ...rest }) => rest);
    res.json({ code: 200, msg: "success", data: safeUsers });
});

router.post('/', async (req, res) => {
    const { username, password, role = 'admin' } = req.body;
    if (!username || !password) return res.status(400).json({ code: 400, msg: "账号密码不能为空" });

    const users = await readData('users.json');
    if (users.find(u => u.username === username)) return res.status(400).json({ code: 400, msg: "用户名已存在" });

    users.push({ username, password, role, createdAt: new Date().toISOString() });
    await writeData('users.json', users);
    res.json({ code: 200, msg: "用户添加成功" });
});

// 你可以将 put 和 delete 也写在这里，保持逻辑跟上一版一致，路径写为 /:username 即可
// ... 
router.put('/:username', authenticateToken, async (req, res) => {
    const { username } = req.params;
    const { newPassword } = req.body;

    const users = await readData('users.json');
    const userIndex = users.findIndex(u => u.username === username);

    if (userIndex === -1) return res.status(404).json({ code: 404, msg: "用户不存在" });

    users[userIndex].password = newPassword;
    await writeData('users.json', users);
    res.json({ code: 200, msg: "密码修改成功" });
});

// 删除用户
router.delete('/:username', authenticateToken, async (req, res) => {
    const { username } = req.params;

    // 防止删掉自己或者唯一的 root
    if (req.user.username === username) return res.status(403).json({ code: 403, msg: "不能删除当前登录的账号" });

    let users = await readData('users.json');
    const initialLength = users.length;
    users = users.filter(u => u.username !== username);

    if (users.length === initialLength) return res.status(404).json({ code: 404, msg: "用户不存在" });

    await writeData('users.json', users);
    res.json({ code: 200, msg: "用户删除成功" });
});
module.exports = router;