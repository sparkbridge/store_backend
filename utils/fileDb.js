const fs = require('fs').promises;
const path = require('path');

// 建立一个全局内存缓存对象
const cache = {};

const readData = async (filename) => {
    try {
        // 1. 命中缓存：如果内存里已经有这个文件的数据，直接返回
        if (cache[filename]) {
            // ⚠️ 极其重要：必须返回深拷贝！
            // 如果直接返回 cache[filename]，外部路由里的修改会直接污染内存数据
            return JSON.parse(JSON.stringify(cache[filename]));
        }

        // 2. 未命中缓存：老老实实去读硬盘（通常只有服务器刚启动时的第一次请求会走这里）
        const filePath = path.join(__dirname, '../data', filename);
        const data = await fs.readFile(filePath, 'utf8');
        const parsedData = JSON.parse(data);

        // 3. 存入内存缓存
        cache[filename] = parsedData;

        // 同样返回深拷贝
        return JSON.parse(JSON.stringify(parsedData));
    } catch (error) {
        // 如果文件不存在，返回空数组，同时不在缓存中记录（等创建了再缓存）
        if (error.code === 'ENOENT') return [];
        throw error;
    }
};

const writeData = async (filename, data) => {
    const filePath = path.join(__dirname, '../data', filename);

    // 1. 异步写入硬盘，保证数据持久化
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');

    // 2. 同步更新内存缓存
    // 同样需要深拷贝，切断与外部传入对象的引用关系
    cache[filename] = JSON.parse(JSON.stringify(data));
};

module.exports = { readData, writeData };