const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const eventController = require('../controllers/eventController');
const uploadController = require('../controllers/uploadController');

const upload = multer({ dest: 'uploads/' });

// SSE 路由
router.get('/events/:clientId', eventController.handleEvents);

// 上传路由
router.post('/upload', upload.array('images'), uploadController.uploadImages);

// 下载路由
router.get('/download/:filename', (req, res) => {
  const filePath = path.join(__dirname, '../../compressed', req.params.filename);
  if (fs.existsSync(filePath)) {
    res.download(filePath, err => {
      if (!err) {
        fs.unlinkSync(filePath);
      }
    });
  } else {
    res.status(404).send('文件不存在或已被自动清理');
  }
});

// 根页面
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public', 'index.html'));
});

module.exports = router;
