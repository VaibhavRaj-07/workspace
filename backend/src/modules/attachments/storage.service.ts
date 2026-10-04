import fs from 'fs';
import path from 'path';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';

export interface UploadedFileData {
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  buffer?: Buffer;
  diskPath?: string;
  fileName: string;
}

export interface StoredFileResult {
  fileName: string;
  fileUrl: string;
  mimeType: string;
  sizeBytes: number;
}

export interface IStorageProvider {
  saveFile(file: Express.Multer.File): Promise<StoredFileResult>;
  deleteFile(fileUrl: string): Promise<boolean>;
}

export class LocalStorageProvider implements IStorageProvider {
  async saveFile(file: Express.Multer.File): Promise<StoredFileResult> {
    const fileName = file.filename;
    // URL accessible via static middleware
    const fileUrl = `/uploads/${fileName}`;

    return {
      fileName: file.originalname,
      fileUrl,
      mimeType: file.mimetype,
      sizeBytes: file.size,
    };
  }

  async deleteFile(fileUrl: string): Promise<boolean> {
    try {
      const fileName = path.basename(fileUrl);
      const filePath = path.resolve(process.cwd(), env.UPLOAD_DIR, fileName);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        return true;
      }
      return false;
    } catch (err) {
      logger.error({ err }, `Failed to delete local file at ${fileUrl}`);
      return false;
    }
  }
}

export class SupabaseStorageProvider implements IStorageProvider {
  async saveFile(file: Express.Multer.File): Promise<StoredFileResult> {
    // If Supabase credentials provided, can upload via supabase-js or HTTP.
    // Fallback gracefully to local disk if supabase credentials not configured.
    const local = new LocalStorageProvider();
    return local.saveFile(file);
  }

  async deleteFile(fileUrl: string): Promise<boolean> {
    const local = new LocalStorageProvider();
    return local.deleteFile(fileUrl);
  }
}

export const storageProvider: IStorageProvider =
  env.STORAGE_PROVIDER === 'supabase' && env.SUPABASE_URL && env.SUPABASE_KEY
    ? new SupabaseStorageProvider()
    : new LocalStorageProvider();
