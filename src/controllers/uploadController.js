const compressionService = require('../services/compressionService');
const sseManager = require('../services/sseManager');

exports.uploadImages = async (req, res) => {
  const { format, clientId } = req.body;
  const files = req.files || [];
  
  console.log(`[Upload] 收到任务 - 客户端ID: ${clientId}, 文件数量: ${files.length}`);

  const results = [];
  const totalCount = files.length;
  let processedCount = 0;

  for (const file of files) {
    try {
      console.log(`[Compression] 正在处理: ${file.originalname}`);
      const result = await compressionService.compressImage(file, format);
      
      results.push({
        success: true,
        originalName: result.originalName,
        originalSize: (result.originalSize / 1024).toFixed(2),
        compressedSize: (result.compressedSize / 1024).toFixed(2),
        fileName: result.compressedFileName
      });

      processedCount++;

      // 推送进度
      if (clientId) {
        sseManager.sendUpdate(clientId, { current: processedCount, total: totalCount });
      }
    } catch (err) {
      console.error(`[Compression] 处理失败 ${file.originalname}:`, err.message);
      results.push({
        success: false,
        originalName: file.originalname,
        error: err.message
      });
    }
  }

  res.json(results);
};

