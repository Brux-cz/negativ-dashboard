// File generation utility functions

/**
 * Generate World File content (.jgw for JPG, .pgw for PNG)
 * World files are used for georeferencing raster images
 * @param {[[number, number], [number, number]]} bounds - Geographic bounds
 * @param {number} pixelWidth - Image width in pixels
 * @param {number} pixelHeight - Image height in pixels
 * @returns {string} World file content
 */
export const generateWorldFile = (bounds, pixelWidth, pixelHeight) => {
  const [[lat1, lon1], [lat2, lon2]] = bounds;
  const pixelSizeX = (lon2 - lon1) / pixelWidth;
  const pixelSizeY = (lat1 - lat2) / pixelHeight; // Negative because Y increases downward
  const topLeftX = lon1;
  const topLeftY = lat1;

  // World file format: 6 lines
  // Line 1: pixel size in x direction
  // Line 2: rotation about y axis (usually 0)
  // Line 3: rotation about x axis (usually 0)
  // Line 4: pixel size in y direction (negative)
  // Line 5: x coordinate of center of upper left pixel
  // Line 6: y coordinate of center of upper left pixel
  return `${pixelSizeX.toFixed(12)}
0.0
0.0
${pixelSizeY.toFixed(12)}
${(topLeftX + pixelSizeX / 2).toFixed(12)}
${(topLeftY + pixelSizeY / 2).toFixed(12)}`;
};

/**
 * Estimate file size in MB
 * @param {number} width - Image width in pixels
 * @param {number} height - Image height in pixels
 * @param {string} format - Image format ('png' or 'jpg')
 * @param {number} quality - JPG quality (0-100)
 * @returns {number} Estimated file size in MB
 */
export const estimateFileSize = (width, height, format, quality) => {
  const pixels = width * height;
  if (format === 'png') {
    // PNG is lossless, roughly 3-4 bytes per pixel after compression
    return (pixels * 3.5) / (1024 * 1024);
  } else {
    // JPG compression ratio depends on quality
    const compressionRatio = 0.1 + (quality / 100) * 0.4; // 0.1 at 0%, 0.5 at 100%
    return (pixels * 3 * compressionRatio) / (1024 * 1024);
  }
};
