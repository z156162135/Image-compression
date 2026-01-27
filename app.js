const express = require('express');
const path = require('path');
const cleanupService = require('./src/services/cleanupService');
const networkUtils = require('./src/utils/network');
const routes = require('./src/routes');

const app = express();
const PORT = process.env.PORT || 3000;

// 初始化定时清理服务
cleanupService.init();

// 中间件配置
app.use(express.urlencoded({ extended: true }));

// 挂载路由 (包含静态页面入口和动态接口)
// 注意：为了保持之前的逻辑，将静态资源服务放在路由之后或由路由处理
app.use('/', routes);

// 静态资源服务 (用于加载 js/css/images 等)
app.use(express.static('public'));

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
  const localIP = networkUtils.getLocalIPs();
  console.log(`\n=========================================`);
  console.log(`[Image-Compression] 服务已启动！`);
  console.log(`本地访问: http://localhost:${PORT}`);
  console.log(`局域网访问: http://${localIP}:${PORT}`);
  console.log(`=========================================\n`);
});
