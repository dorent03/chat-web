import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { env } from '../config/env';
import { Attachment } from '../db/schemas/attachment.schema';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const IMAGE_MAX_WIDTH = 1920;
const IMAGE_QUALITY = 80;
const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

/** Ensure the upload directory exists */
export async function ensureUploadDir(): Promise<void> {
  try {
    await fs.mkdir(env.UPLOAD_DIR, { recursive: true });
  } catch (err) {
    logger.error('Failed to create upload directory:', err);
    throw new AppError(500, 'Upload directory initialization failed');
  }
}

/**
 * Process an uploaded file: compress images, then save an attachment record.
 * Returns the created attachment.
 */
export async function processUpload(
  file: Express.Multer.File,
  messageId: string
) {
  let storagePath = file.path;
  let fileSize = file.size;

  if (IMAGE_MIME_TYPES.includes(file.mimetype)) {
    try {
      const compressed = await compressImage(file.path, file.mimetype);
      storagePath = compressed.path;
      fileSize = compressed.size;
    } catch (err) {
      logger.warn('Image compression failed, using original:', err);
    }
  }

  const relativePath = path.relative(process.cwd(), storagePath);

  const attachment = await Attachment.create({
    message_id: messageId,
    filename: file.filename,
    original_name: file.originalname,
    mime_type: file.mimetype,
    file_size: fileSize,
    storage_path: relativePath,
  });

  return attachment.toJSON();
}

/** Compress an image file using sharp */
async function compressImage(
  filePath: string,
  mimeType: string
): Promise<{ path: string; size: number }> {
  const ext = path.extname(filePath);
  const compressedPath = filePath.replace(ext, `_compressed${ext}`);

  let pipeline = sharp(filePath).resize(IMAGE_MAX_WIDTH, undefined, {
    withoutEnlargement: true,
    fit: 'inside',
  });

  switch (mimeType) {
    case 'image/jpeg':
      pipeline = pipeline.jpeg({ quality: IMAGE_QUALITY });
      break;
    case 'image/png':
      pipeline = pipeline.png({ quality: IMAGE_QUALITY });
      break;
    case 'image/webp':
      pipeline = pipeline.webp({ quality: IMAGE_QUALITY });
      break;
    case 'image/gif':
      /* GIF compression is limited; just resize */
      break;
  }

  await pipeline.toFile(compressedPath);

  /* Remove the original and rename compressed to original name */
  await fs.unlink(filePath);
  await fs.rename(compressedPath, filePath);

  const stats = await fs.stat(filePath);

  return { path: filePath, size: stats.size };
}

/** Delete a file from local storage */
export async function deleteFile(storagePath: string): Promise<void> {
  try {
    await fs.unlink(storagePath);
  } catch (err) {
    logger.warn(`Failed to delete file ${storagePath}:`, err);
  }
}

/** Get attachments for a message */
export async function getAttachments(messageId: string) {
  return Attachment.find({ message_id: messageId }).lean();
}
