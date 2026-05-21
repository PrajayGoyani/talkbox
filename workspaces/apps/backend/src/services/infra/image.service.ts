import fs from "fs/promises";
import path from "path";

export class ImageService {
  public uploadDir: any;

  constructor() {
    this.uploadDir = path.join(process.cwd(), "public", "uploads");
  }

  /**
   * Process an image buffer to WebP.
   * @param {Buffer} buffer - The image buffer from multer memoryStorage.
   * @returns {Promise<Buffer>} - The processed WebP buffer.
   */
  async getProcessedBuffer(buffer: Buffer): Promise<Buffer> {
    const pipeline = new Bun.Image(buffer)
      .resize(256, 256, {
        fit: "inside",
      })
      .webp({ quality: 80 });
    return await pipeline.buffer();
  }

  /**
   * Process an image buffer to WebP and save it to the uploads directory.
   * @param {Buffer} buffer - The image buffer from multer memoryStorage.
   * @param {string} prefix - Filename prefix (e.g., 'avatar-').
   * @returns {Promise<string>} - The filename of the saved image.
   */
  async processAndSaveAvatar(buffer: Buffer, prefix: string = "avatar-"): Promise<string> {
    const uniqueSuffix = crypto.randomUUID();
    const filename = `${prefix}${uniqueSuffix}.webp`;
    const outputPath = path.join(this.uploadDir, filename);

    // Ensure directory exists
    await fs.mkdir(this.uploadDir, { recursive: true });

    const processedBuffer = await this.getProcessedBuffer(buffer);
    await Bun.write(outputPath, processedBuffer);

    return filename;
  }

  /**
   * Delete an old avatar from disk.
   * @param {string} avatarUrl - The URL or path stored in the DB (e.g., '/uploads/avatar-xxx.webp').
   */
  async deleteOldAvatar(avatarUrl: string) {
    if (!avatarUrl || avatarUrl.startsWith("http")) return; // Don't try to delete remote URLs (Cloudinary)

    try {
      const filename = path.basename(avatarUrl);
      const filePath = path.join(this.uploadDir, filename);
      await fs.unlink(filePath);
    } catch (error) {
      console.warn(`Failed to delete old avatar: ${avatarUrl}`, (error as Error).message);
    }
  }
}

export const imageService = {};
