const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const imagemin = require('imagemin').default;
const imageminMozjpeg = require('imagemin-mozjpeg').default;
const imageminPngquant = require('imagemin-pngquant').default;
const imageminWebp = require('imagemin-webp').default;
const imageminAvif = require('imagemin-avif').default;

const cron = require('node-cron');

// 加载配置
const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));

function cleanupCompressedFolder() {
  console.log('[Cleanup] 启动定期清理任务...');
  const compressedDir = path.join(__dirname, 'compressed');
  const uploadsDir = path.join(__dirname, 'uploads');
  
  [compressedDir, uploadsDir].forEach(dir => {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        try {
          // 只删除文件，保留目录
          if (fs.statSync(filePath).isFile()) {
            fs.unlinkSync(filePath);
            console.log(`[Cleanup] 已删除过期文件: ${file}`);
          }
        } catch (err) {
          console.error(`[Cleanup] 删除失败 ${file}:`, err.message);
        }
      }
    }
  });
}

// 启动定时任务 (优先使用 cronExpression)
if (config.cronExpression) {
  cron.schedule(config.cronExpression, cleanupCompressedFolder);
  console.log(`[Cleanup] 定时清理任务已按照 Cron 表达式启动: ${config.cronExpression}`);
} else {
  const intervalMs = (config.cleanupIntervalMinutes || 60) * 60 * 1000;
  setInterval(cleanupCompressedFolder, intervalMs);
  console.log(`[Cleanup] 定时清理任务已按照间隔时间启动: ${config.cleanupIntervalMinutes || 60} 分钟`);
}


const app = express();

const PORT = 3000;

const upload = multer({ dest: 'uploads/' });

// 全局客户端连接池
const clients = {};

// 1. 先定义动态路由，避免被 static 中间件拦截或产生冲突
app.get('/events/:clientId', (req, res) => {
  const clientId = req.params.clientId;
  console.log(`[SSE] 客户端 ${clientId} 建立连接`);
  
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });

  clients[clientId] = res;

  // 立即发送确认消息
  res.write(`data: ${JSON.stringify({ type: 'connected', clientId })}\n\n`);

  // 发送心跳以防止连接超时（每30秒一次）
  const heartbeat = setInterval(() => {
    if (clients[clientId]) {
      res.write(': heartbeat\n\n');
    }
  }, 30000);

  req.on('close', () => {
    console.log(`[SSE] 客户端 ${clientId} 连接关闭`);
    clearInterval(heartbeat);
    delete clients[clientId];
  });
});

app.post('/upload', upload.array('images'), async (req, res) => {
  const { format, clientId } = req.body;
  console.log(`[Upload] 收到任务 - 客户端ID: ${clientId}, 文件数量: ${req.files ? req.files.length : 0}`);
  
  const outputDir = path.join(__dirname, 'compressed');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  const plugins = [
    imageminMozjpeg({ quality: 60 }),
    imageminPngquant({ quality: [0.8, 1] })
  ];

  if (format === 'webp') {
    plugins.push(imageminWebp({ lossless: true }));
  } else if (format === 'avif') {
    plugins.push(imageminAvif({ lossless: true }));
  }

  let summary = '<h2>Compression Results</h2><ul>';
  const totalCount = req.files.length;
  let processedCount = 0;

  for (const file of req.files) {
    const inputPath = file.path;
    const originalSize = fs.statSync(inputPath).size;

    console.log(`[Compression] 正在处理: ${file.originalname}`);
    await imagemin([inputPath], {
      destination: outputDir,
      plugins
    });

    const compressedFileName = fs.readdirSync(outputDir).find(f => f.startsWith(file.filename));
    const compressedFilePath = path.join(outputDir, compressedFileName);
    const compressedSize = fs.statSync(compressedFilePath).size;

    summary += `<li>
      ${file.originalname}: Original ${(originalSize / 1024).toFixed(2)} KB → Compressed ${(compressedSize / 1024).toFixed(2)} KB
      - <a href="/download/${compressedFileName}">Download</a>
    </li>`;

    fs.unlinkSync(inputPath);
    processedCount++;

    if (clientId && clients[clientId]) {
      const percentage = Math.round((processedCount / totalCount) * 100);
      console.log(`[SSE] 推送进度给 ${clientId}: ${percentage}%`);
      clients[clientId].write(`data: ${JSON.stringify({ percentage })}\n\n`);
    }
  }


  summary += '</ul>';
  res.send(summary);
});

app.get('/download/:filename', (req, res) => {
  const filePath = path.join(__dirname, 'compressed', req.params.filename);
  res.download(filePath, err => {
    if (!err) {
      fs.unlinkSync(filePath);
    }
  });
});

// 2. 静态中间件和根路由放在后面
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const os = require('os');

// 获取局域网 IP
function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  // 优先返回 192 开头的地址
  const preferred = addresses.find(addr => addr.startsWith('192.168.'));
  return preferred || addresses[0] || 'localhost';
}

app.listen(PORT, '0.0.0.0', () => {
  const localIP = getLocalIPs();
  console.log(`\n=========================================`);
  console.log(`服务已启动！`);
  console.log(`本地访问: http://localhost:${PORT}`);
  console.log(`局域网访问: http://${localIP}:${PORT}`);
  console.log(`=========================================\n`);
});


