const express = require('express');
const { readData } = require('../utils/fileDb');
const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const posts = await readData('posts.json');
        res.json({ code: 200, msg: "success", data: posts });
    } catch (error) {
        res.status(500).json({ code: 500, msg: "无法读取文章数据", data: [] });
    }
});

module.exports = router;