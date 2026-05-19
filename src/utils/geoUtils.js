// Geographic utility functions

/**
 * Calculate distance between two coordinates in meters (Haversine formula)
 * @param {number} lat1 - First point latitude
 * @param {number} lon1 - First point longitude
 * @param {number} lat2 - Second point latitude
 * @param {number} lon2 - Second point longitude
 * @returns {number} Distance in meters
 */
export const getDistanceMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Format distance for display
 * @param {number} meters - Distance in meters
 * @returns {string} Formatted distance string
 */
export const formatDistance = (meters) => {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km`;
  }
  return `${Math.round(meters)} m`;
};

/**
 * Map an output grid index to the nearest source-pixel index when resampling.
 * Maps the full closed interval: index 0 → 0, index (outputSize-1) →
 * (srcSize-1), so the south/east edge of a crop is fully sampled (the old
 * `floor(i * srcSize/outputSize)` never reached the last source row/column).
 *
 * @param {number} i - output index (0 .. outputSize-1)
 * @param {number} outputSize - number of output samples along the axis
 * @param {number} srcSize - number of source pixels along the axis
 * @returns {number} source index (0 .. srcSize-1)
 */
export const srcSampleIndex = (i, outputSize, srcSize) => {
  if (outputSize <= 1) return 0;
  return Math.round((i * (srcSize - 1)) / (outputSize - 1));
};
