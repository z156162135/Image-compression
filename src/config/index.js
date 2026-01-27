const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../../config.json');
let config = {};

try {
  config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (err) {
  console.error('[Config] 无法读取配置文件，使用默认设置');
  config = {
    cronExpression: '0 * * * *',
    cleanupIntervalMinutes: 60
  };
}

module.exports = config;
