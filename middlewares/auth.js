const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ code: 401, msg: "未授权：请求头缺失 Token" });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(401).json({ code: 401, msg: "未授权：Token 无效或已过期" });
        }
        req.user = user;
        next();
    });
};

module.exports = authenticateToken;