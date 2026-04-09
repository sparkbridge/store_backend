require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { startProxyCron } = require('./utils/proxyManager');
// 直接引入 routes 目录，Node.js 会自动寻找该目录下的 index.js
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', true);
app.use(cors());
app.use(express.json());

// 将所有的路由挂载到 /api/v1 基础路径下
app.use('/api/v1', routes);

app.listen(PORT, () => {
    console.log(`LeShares Backend is running on http://localhost:${PORT}`);
    console.log(`API Base URL: http://localhost:${PORT}/api/v1`);
    startProxyCron();
});