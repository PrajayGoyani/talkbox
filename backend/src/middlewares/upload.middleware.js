import multer from 'multer';
import path from 'path';
import crypto from 'crypto';

const uploadDir = path.join(process.cwd(), 'public', 'uploads');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
        cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};

export const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: fileFilter 
});
