const sseManager = require('../services/sseManager');

exports.handleEvents = (req, res) => {
  const { clientId } = req.params;
  console.log(`[SSE] 客户端 ${clientId} 建立连接`);
  
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });

  sseManager.addClient(clientId, res);

  // 立即发送确认消息
  res.write(`data: ${JSON.stringify({ type: 'connected', clientId })}\n\n`);

  // 发送心跳
  const heartbeat = setInterval(() => {
    if (sseManager.getClient(clientId)) {
      res.write(': heartbeat\n\n');
    }
  }, 30000);

  req.on('close', () => {
    console.log(`[SSE] 客户端 ${clientId} 连接关闭`);
    clearInterval(heartbeat);
    sseManager.removeClient(clientId);
  });
};
