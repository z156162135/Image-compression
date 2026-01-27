const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const config = require('../config');

class CleanupService {
  constructor() {
    this.compressedDir = path.join(__dirname, '../../compressed');
    this.uploadsDir = path.join(__dirname, '../../uploads');
  }

  /**
   * 执行清理逻辑
   */
  executeCleanup() {
    console.log('[Cleanup] 启动定期清理任务...');
    [this.compressedDir, this.uploadsDir].forEach(dir => {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const filePath = path.join(dir, file);
          try {
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

  /**
   * 初始化定时任务
   */
  init() {
    if (config.cronExpression) {
      cron.schedule(config.cronExpression, () => this.executeCleanup());
      console.log(`[Cleanup] 定时清理任务已按照 Cron 表达式启动: ${config.cronExpression}`);
    } else {
      const intervalMs = (config.cleanupIntervalMinutes || 60) * 60 * 1000;
      setInterval(() => this.executeCleanup(), intervalMs);
      console.log(`[Cleanup] 定时清理任务已按照间隔时间启动: ${config.cleanupIntervalMinutes || 60} 分钟`);
    }
  }
}

module.exports = new CleanupService();
