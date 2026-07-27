import dotenv from 'dotenv';
dotenv.config();

/**
 * Process single uploaded file and return local URL.
 * @param {Object} file - The file object from multer (diskStorage)
 * @returns {Promise<{url: string, name: string, type: string}>}
 */
export const processLocalUpload = (file) => {
  return new Promise((resolve) => {
    const baseUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 8001}`;
    resolve({
      url: `${baseUrl}/uploads/${file.filename}`,
      name: file.originalname,
      type: file.mimetype,
    });
  });
};

/**
 * Process multiple uploaded files and return local URLs.
 * @param {Array<Object>} files - The file objects from multer
 * @returns {Promise<Object[]>} Array of file objects
 */
export const uploadMultipleToCloudinary = async (files) => {
  if (!files || files.length === 0) return [];

  const uploadPromises = files.map(async (file) => {
    const result = await processLocalUpload(file);
    return {
      url: result.url,
      type: result.type,
      name: result.name
    };
  });

  return await Promise.all(uploadPromises);
};

