// filepath: api/src/utils/qrGenerator.js
const QRCode = require('qrcode');

// Generate a unique QR code string identifier
// Format: GP-HH-XXXXXXXXXX (10 random uppercase alphanumeric chars)
function generateQRCodeString() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'GP-HH-';
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Generate QR code as base64 data URL for storage and display
async function generateQRCodeImage(qrCodeString) {
  try {
    const dataUrl = await QRCode.toDataURL(qrCodeString, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 300,
      margin: 2,
      color: {
        dark: '#1f2937',
        light: '#ffffff',
      },
    });
    return dataUrl;
  } catch (err) {
    throw new Error('QR code image generation failed: ' + err.message);
  }
}

// Generate QR code as raw PNG buffer (for printing/download)
async function generateQRCodeBuffer(qrCodeString) {
  try {
    const buffer = await QRCode.toBuffer(qrCodeString, {
      errorCorrectionLevel: 'H',
      type: 'png',
      width: 400,
      margin: 2,
    });
    return buffer;
  } catch (err) {
    throw new Error('QR code buffer generation failed: ' + err.message);
  }
}

module.exports = { generateQRCodeString, generateQRCodeImage, generateQRCodeBuffer };
