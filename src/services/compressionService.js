const imagemin = require('imagemin').default;
const imageminMozjpeg = require('imagemin-mozjpeg').default;
const imageminPngquant = require('imagemin-pngquant').default;
const imageminWebp = require('imagemin-webp').default;
const imageminAvif = require('imagemin-avif').default;
const path = require('path');
const fs = require('fs');

class CompressionService {
  constructor() {
    this.outputDir = path.join(__dirname, '../../compressed');
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir);
    }
  }

  /**
   * 压缩单张图片
   */
  async compressImage(file, format, quality = 60) {
    const inputPath = file.path;
    const originalSize = fs.statSync(inputPath).size;

    const plugins = [
      imageminMozjpeg({ quality }),
      imageminPngquant({ quality: [0.8, 1] })
    ];

    if (format === 'webp') {
      plugins.push(imageminWebp({ lossless: true }));
    } else if (format === 'avif') {
      plugins.push(imageminAvif({ lossless: true }));
    }

    await imagemin([inputPath], {
      destination: this.outputDir,
      plugins
    });

    const compressedFileName = fs.readdirSync(this.outputDir).find(f => f.startsWith(file.filename));
    const compressedFilePath = path.join(this.outputDir, compressedFileName);
    const compressedSize = fs.statSync(compressedFilePath).size;

    // 清理上传的原始文件
    fs.unlinkSync(inputPath);

    return {
      originalName: file.originalname,
      originalSize,
      compressedSize,
      compressedFileName
    };
  }
}

module.exports = new CompressionService();
