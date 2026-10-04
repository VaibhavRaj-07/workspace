import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { env } from '../config/env.js';
import { ALLOWED_MIME_TYPES } from '../config/constants.js';
import { ApiError } from '../utils/api-error.js';

// Ensure upload directory exists
const uploadDir = path.resolve(process.cwd(), env.UPLOAD_DIR);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    const sanitizedBase = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${sanitizedBase}-${uniqueSuffix}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: {
    fileSize: env.MAX_FILE_SIZE_BYTES, // 10 MB
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        ApiError.badRequest(
          `Unsupported file type: ${file.mimetype}. Allowed types include images, documents, PDFs, zip, etc.`
        )
      );
    }
  },
});
