const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const imagemin = require('imagemin').default;
const imageminMozjpeg = require('imagemin-mozjpeg').default;
const imageminPngquant = require('imagemin-pngquant').default;
const imageminWebp = require('imagemin-webp').default;
const imageminAvif = require('imagemin-avif').default;


const app = express();
const PORT = 3000;

const upload = multer({ dest: 'uploads/' });

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/upload', upload.array('images'), async (req, res) => {
  const outputDir = path.join(__dirname, 'compressed');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  const plugins = [
    imageminMozjpeg({ quality: 85 }),
    imageminPngquant({ quality: [0.8, 1] })
  ];

  if (req.body.format === 'webp') {
    plugins.push(imageminWebp({ lossless: true }));
  } else if (req.body.format === 'avif') {
    plugins.push(imageminAvif({ lossless: true }));
  }

  let summary = '<h2>Compression Results</h2><ul>';
  let processedCount = 0;
  const totalCount = req.files.length;

  for (const file of req.files) {
    const inputPath = file.path;
    const originalSize = fs.statSync(inputPath).size;

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

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});