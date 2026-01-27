const os = require('os');

/**
 * 获取局域网 IPv4 地址
 */
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

module.exports = {
  getLocalIPs
};
