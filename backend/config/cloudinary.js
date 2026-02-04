const cloudinary = require('cloudinary').v2;
require('dotenv').config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dccvlyogx',
  api_key: process.env.CLOUDINARY_API_KEY || '945521281134793',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'WLy0okp9aBbFblQCqqjtnL-EAi8'
});

// Parse Cloudinary URL if provided
// Format: cloudinary://api_key:api_secret@cloud_name
if (process.env.CLOUDINARY_URL) {
  const match = process.env.CLOUDINARY_URL.match(/cloudinary:\/\/([^:]+):([^@]+)@(.+)/);
  if (match) {
    cloudinary.config({
      api_key: match[1],
      api_secret: match[2],
      cloud_name: match[3]
    });
  }
}

module.exports = cloudinary;

