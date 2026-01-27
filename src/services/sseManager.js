/**
 * SSE 客户端管理器
 */
class SSEManager {
  constructor() {
    this.clients = {};
  }

  addClient(clientId, res) {
    this.clients[clientId] = res;
    console.log(`[SSE] 客户端 ${clientId} 已注册`);
  }

  removeClient(clientId) {
    delete this.clients[clientId];
    console.log(`[SSE] 客户端 ${clientId} 已移除`);
  }

  sendUpdate(clientId, data) {
    if (this.clients[clientId]) {
      this.clients[clientId].write(`data: ${JSON.stringify(data)}\n\n`);
    }
  }

  getClient(clientId) {
    return this.clients[clientId];
  }
}

module.exports = new SSEManager();
