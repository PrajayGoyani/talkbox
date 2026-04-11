import sharp from "sharp";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";

class ImageService {
  constructor() {
    this.uploadDir = path.join(process.cwd(), "public", "uploads");
  }

  /**
   * Process an image buffer to WebP.
   * @param {Buffer} buffer - The image buffer from multer memoryStorage.
   * @returns {Promise<Buffer>} - The processed WebP buffer.
   */
  async getProcessedBuffer(buffer) {
    return await sharp(buffer)
      .resize(256, 256, {
        fit: "cover",
        position: "center",
      })
      .webp({ quality: 80 })
      .toBuffer();
  }

  /**
   * Process an image buffer to WebP and save it to the uploads directory.
   * @param {Buffer} buffer - The image buffer from multer memoryStorage.
   * @param {string} prefix - Filename prefix (e.g., 'avatar-').
   * @returns {Promise<string>} - The filename of the saved image.
   */
  async processAndSaveAvatar(buffer, prefix = "avatar-") {
    const uniqueSuffix = Date.now() + "-" + crypto.randomBytes(6).toString("hex");
    const filename = `${prefix}${uniqueSuffix}.webp`;
    const outputPath = path.join(this.uploadDir, filename);

    // Ensure directory exists
    await fs.mkdir(this.uploadDir, { recursive: true });

    const processedBuffer = await this.getProcessedBuffer(buffer);
    await fs.writeFile(outputPath, processedBuffer);

    return filename;
  }

  /**
   * Delete an old avatar from disk.
   * @param {string} avatarUrl - The URL or path stored in the DB (e.g., '/uploads/avatar-xxx.webp').
   */
  async deleteOldAvatar(avatarUrl) {
    if (!avatarUrl || avatarUrl.startsWith("http")) return; // Don't try to delete remote URLs (Cloudinary)

    try {
      const filename = path.basename(avatarUrl);
      const filePath = path.join(this.uploadDir, filename);
      await fs.unlink(filePath);
    } catch (error) {
      console.warn(`Failed to delete old avatar: ${avatarUrl}`, error.message);
    }
  }
}

export const imageService = new ImageService();
