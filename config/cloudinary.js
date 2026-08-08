const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const makeStorage = (folder) => new CloudinaryStorage({
    cloudinary,
    params: {
        folder,
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
        transformation: [{ quality: 'auto', fetch_format: 'auto' }],
    },
});

const upload         = multer({ storage: makeStorage(process.env.CLOUDINARY_FOLDER || 'qurandaily') });
const uploadProjects = multer({ storage: makeStorage('qasim/projects') });

module.exports = { cloudinary, upload, uploadProjects };
