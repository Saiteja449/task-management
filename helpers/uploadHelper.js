import cloudinary from "../configs/cloudinary.js";
import streamifier from "streamifier";

/**
 * Upload a single file buffer to Cloudinary.
 * @param {Buffer} fileBuffer - The file buffer from multer
 * @param {string} folder - Cloudinary folder name
 * @param {string} resourceType - "image", "raw", or "auto"
 * @returns {Promise<{url: string, publicId: string}>}
 */
export const uploadToCloudinary = (
  fileBuffer,
  folder = "taskflow",
  resourceType = "auto",
  originalName = ""
) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        use_filename: true,
        unique_filename: true,
        filename_override: originalName,
        access_mode: "public",
        type: "upload",
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            format: result.format,
          });
        }
      }
    );

    streamifier.createReadStream(fileBuffer).pipe(uploadStream);
  });
};

/**
 * Determine the correct Cloudinary resource_type based on mimetype.
 * - "image" for image files (jpeg, png, gif, etc.)
 * - "video" for video/audio files
 * - "raw" for everything else (PDF, Word, Excel, zip, etc.)
 */
const getResourceType = (mimetype) => {
  if (mimetype.startsWith("image/")) return "image";
  return "raw";
};

/**
 * Upload multiple file buffers to Cloudinary.
 * @param {Array<{buffer: Buffer, mimetype: string, originalname: string}>} files
 * @param {string} folder
 * @returns {Promise<Object[]>} Array of file objects
 */
export const uploadMultipleToCloudinary = async (
  files,
  folder = "taskflow/attachments",
) => {
  if (!files || files.length === 0) return [];

  const uploadPromises = files.map(async (file) => {
    const result = await uploadToCloudinary(
      file.buffer,
      folder,
      getResourceType(file.mimetype),
      file.originalname,
    );
    return {
      url: result.url,
      publicId: result.publicId,
      format: result.format,
      type: file.mimetype,
      name: file.originalname
    };
  });

  return await Promise.all(uploadPromises);
};
