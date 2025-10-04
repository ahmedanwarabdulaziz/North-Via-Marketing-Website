const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function compressImages() {
  const publicDir = path.join(__dirname, '../public');
  const images = [
    { input: 'Hero-01.png', maxWidth: 1920, quality: 80 },
    { input: 'Hero-02.png', maxWidth: 1920, quality: 80 },
    { input: 'Hero-03.png', maxWidth: 1920, quality: 80 },
    { input: 'Hero-05.png', maxWidth: 1920, quality: 80 },
    { input: 'pic-002.png', maxWidth: 1200, quality: 85 },
  ];

  console.log('🖼️  Starting image compression...\n');

  for (const image of images) {
    const inputPath = path.join(publicDir, image.input);
    
    if (!fs.existsSync(inputPath)) {
      console.log(`⚠️  ${image.input} not found, skipping...`);
      continue;
    }

    const stats = fs.statSync(inputPath);
    const originalSize = (stats.size / 1024 / 1024).toFixed(2);

    try {
      // Create backup
      const backupPath = path.join(publicDir, `${image.input}.backup`);
      fs.copyFileSync(inputPath, backupPath);

      // Compress image to temporary file first
      const tempPath = path.join(publicDir, `${image.input}.temp`);
      await sharp(inputPath)
        .resize(image.maxWidth, null, {
          withoutEnlargement: true,
          fit: 'inside'
        })
        .png({
          quality: image.quality,
          compressionLevel: 9,
          progressive: true
        })
        .toFile(tempPath);

      // Replace original with compressed version
      fs.unlinkSync(inputPath);
      fs.renameSync(tempPath, inputPath);

      const newStats = fs.statSync(inputPath);
      const newSize = (newStats.size / 1024 / 1024).toFixed(2);
      const savings = ((stats.size - newStats.size) / stats.size * 100).toFixed(1);

      console.log(`✅ ${image.input}`);
      console.log(`   Before: ${originalSize} MB → After: ${newSize} MB (${savings}% smaller)`);
      console.log(`   Backup saved as: ${image.input}.backup\n`);

    } catch (error) {
      console.error(`❌ Error compressing ${image.input}:`, error.message);
      // Restore backup if compression failed
      const backupPath = path.join(publicDir, `${image.input}.backup`);
      if (fs.existsSync(backupPath)) {
        fs.copyFileSync(backupPath, inputPath);
        fs.unlinkSync(backupPath);
      }
    }
  }

  console.log('🎉 Image compression completed!');
}

compressImages().catch(console.error);
