import earcut from 'earcut';
import { getDistanceMeters } from './geoUtils';

/**
 * Convert lat/lon to local meters centered at origin (matching PlaneGeometry).
 */
const latLonToLocal = (lat, lon, bounds, realWidth, realHeight) => {
  const [[nLat, wLon], [sLat, eLon]] = bounds;
  // Normalize to [0, realWidth] × [0, realHeight], then center
  const x = (lon - wLon) / (eLon - wLon) * realWidth - realWidth / 2;
  // Flip Y-axis: north=positive, south=negative (matching terrain rotation)
  const y = -((lat - nLat) / (sLat - nLat) * realHeight - realHeight / 2);
  return [x, y];
};

/**
 * Signed area of a 2D polygon (shoelace). poly = array of [x, y].
 * > 0 for counter-clockwise winding, < 0 for clockwise.
 * Used to make side-wall normals point outward regardless of how the
 * OSM way happens to be wound (OSM does not guarantee orientation).
 */
export const signedPolygonArea = (poly) => {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x0, y0] = poly[i];
    const [x1, y1] = poly[(i + 1) % poly.length];
    a += x0 * y1 - x1 * y0;
  }
  return a / 2;
};

/**
 * Sample terrain height at a local (x, y) position from the height grid.
 */
const sampleHeight = (x, y, heightData, resolution, realWidth, realHeight, verticalScale) => {
  // Convert centered coordinates to [0, 1] range
  const normX = (x + realWidth / 2) / realWidth;
  const normY = (y + realHeight / 2) / realHeight;

  const col = Math.min(resolution - 1, Math.max(0, Math.floor(normX * (resolution - 1))));
  // heightData row 0 = NORTH (terrainLoader image-pixel convention), but the
  // local Y axis has north = +realHeight/2 (normY → 1). Invert so a northern
  // footprint samples the northern terrain row, not the mirrored southern one.
  const row = Math.min(resolution - 1, Math.max(0, Math.floor((1 - normY) * (resolution - 1))));
  return heightData[row * resolution + col] * verticalScale;
};

/**
 * Generate merged 3D geometry for all buildings.
 *
 * @param {Building[]} buildings - from osmLoader
 * @param {TerrainData} terrain - from terrainLoader
 * @param {number} verticalScale - terrain vertical scale
 * @returns {{ positions: Float32Array, indices: Uint32Array, normals: Float32Array }}
 */
export const generateBuildingMeshData = (buildings, terrain, verticalScale = 1) => {
  const { heightData, resolution, bounds, realWidth, realHeight } = terrain;

  const allPositions = [];
  const allIndices = [];
  const allNormals = [];
  let vertexOffset = 0;

  for (const building of buildings) {
    // Convert polygon to local coordinates
    const localPoly = building.polygon.map(([lat, lon]) =>
      latLonToLocal(lat, lon, bounds, realWidth, realHeight)
    );

    // Check if building is within bounds (centered coordinates)
    const inBounds = localPoly.some(([x, y]) =>
      x >= -realWidth/2 && x <= realWidth/2 && y >= -realHeight/2 && y <= realHeight/2
    );
    if (!inBounds) continue;

    // Average terrain height under building footprint
    let avgTerrainH = 0;
    for (const [x, y] of localPoly) {
      avgTerrainH += sampleHeight(x, y, heightData, resolution, realWidth, realHeight, verticalScale);
    }
    avgTerrainH /= localPoly.length;

    // Building height is relative to terrain, not absolute
    // Scale building heights to match terrain exaggeration.
    // Both base elevation (minHeight) and body height must be scaled
    // to maintain proper visual alignment with scaled terrain.
    const baseZ = avgTerrainH + (building.minHeight * verticalScale);
    const topZ = baseZ + ((building.height - building.minHeight) * verticalScale);

    // Triangulate the polygon for top/bottom caps
    const flatCoords = [];
    for (const [x, y] of localPoly) {
      flatCoords.push(x, y);
    }
    const triIndices = earcut(flatCoords);
    if (triIndices.length === 0) continue;

    const n = localPoly.length;

    // --- Top face ---
    const topStart = vertexOffset;
    for (const [x, y] of localPoly) {
      allPositions.push(x, y, topZ);
      allNormals.push(0, 0, 1);
    }
    for (const idx of triIndices) {
      allIndices.push(topStart + idx);
    }
    vertexOffset += n;

    // --- Bottom face ---
    const bottomStart = vertexOffset;
    for (const [x, y] of localPoly) {
      allPositions.push(x, y, baseZ);
      allNormals.push(0, 0, -1);
    }
    for (let i = triIndices.length - 1; i >= 0; i--) {
      allIndices.push(bottomStart + triIndices[i]);
    }
    vertexOffset += n;

    // --- Side walls ---
    // OSM ways have no guaranteed winding. Use the polygon's signed area to
    // flip the edge-perpendicular so the wall normal always faces outward.
    const winding = signedPolygonArea(localPoly) > 0 ? 1 : -1;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const [x0, y0] = localPoly[i];
      const [x1, y1] = localPoly[j];

      const dx = x1 - x0;
      const dy = y1 - y0;
      const len = Math.sqrt(dx * dx + dy * dy);
      // Skip degenerate edges (adjacent duplicate OSM nodes) — would give
      // 0/0 = NaN normals. osmLoader only strips the closing duplicate.
      if (len < 1e-9) continue;

      // Wall normal, winding-independent (signed-area sign → outward).
      const nx = (winding * dy) / len;
      const ny = (winding * -dx) / len;

      const wallStart = vertexOffset;
      // 4 vertices per wall quad
      allPositions.push(x0, y0, baseZ);  allNormals.push(nx, ny, 0);
      allPositions.push(x1, y1, baseZ);  allNormals.push(nx, ny, 0);
      allPositions.push(x1, y1, topZ);   allNormals.push(nx, ny, 0);
      allPositions.push(x0, y0, topZ);   allNormals.push(nx, ny, 0);

      // Triangle index order must follow the winding so the geometric face
      // normal matches the (outward) shading normal — otherwise CW walls
      // render back-facing despite correct normals.
      if (winding === 1) {
        allIndices.push(wallStart, wallStart + 1, wallStart + 2);
        allIndices.push(wallStart, wallStart + 2, wallStart + 3);
      } else {
        allIndices.push(wallStart, wallStart + 2, wallStart + 1);
        allIndices.push(wallStart, wallStart + 3, wallStart + 2);
      }

      vertexOffset += 4;
    }
  }

  return {
    positions: new Float32Array(allPositions),
    indices: new Uint32Array(allIndices),
    normals: new Float32Array(allNormals),
  };
};
