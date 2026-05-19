import { describe, test, expect } from 'vitest';
import { generateBuildingMeshData, signedPolygonArea } from './buildingGeometry';
import { exportTerrainOBJ, exportBuildingsOBJ } from './meshExporter';
import { srcSampleIndex } from './geoUtils';

/**
 * Orientation regression tests.
 *
 * Canonical target frame (chosen = terrain-to-3d convention):
 *   Z-up, meters, min-corner at (0,0,0), NO negative coords,
 *   +X = EAST (lon increases), +Y = NORTH (lat increases), Z = elevation.
 *
 * Synthetic terrain: 4x4 grid, pure SOUTH→NORTH height gradient.
 * heightData stores row 0 = NORTH (terrainLoader image-pixel convention),
 * so row 0 = 300 m (north, high), row 3 = 0 m (south, low).
 *
 * These tests assert the *target* behavior and therefore FAIL on the
 * current (buggy) code — that is the RED step.
 */

const RES = 4;
const REAL_W = 1000;
const REAL_H = 1000;
// bounds = [[nLat, wLon], [sLat, eLon]]
const N_LAT = 50.01;
const S_LAT = 50.0;
const W_LON = 14.0;
const E_LON = 14.01;

const makeTerrain = () => {
  const heightData = new Float32Array(RES * RES);
  for (let row = 0; row < RES; row++) {
    // row 0 = NORTH = highest (300), row 3 = SOUTH = 0
    const h = 300 - row * 100;
    for (let col = 0; col < RES; col++) {
      heightData[row * RES + col] = h;
    }
  }
  return {
    heightData,
    resolution: RES,
    bounds: [[N_LAT, W_LON], [S_LAT, E_LON]],
    realWidth: REAL_W,
    realHeight: REAL_H,
    minHeight: 0,
    maxHeight: 300,
  };
};

// Square footprint (~30 m) centered on a geographic point.
const squareBuilding = (lat, lon, id = 1) => {
  const d = 0.0003; // ~30 m in lat at this scale
  return {
    id,
    polygon: [
      [lat - d, lon - d],
      [lat - d, lon + d],
      [lat + d, lon + d],
      [lat + d, lon - d],
    ],
    height: 10,
    minHeight: 0,
    type: 'house',
    levels: null,
  };
};

// A point 87.5% toward the north edge (clearly in the northern half).
const NORTH_LAT = S_LAT + 0.875 * (N_LAT - S_LAT);
// A point 12.5% toward the north edge (clearly in the southern half).
const SOUTH_LAT = S_LAT + 0.125 * (N_LAT - S_LAT);
const MID_LON = (W_LON + E_LON) / 2;

const parseVerts = (obj) =>
  obj
    .split('\n')
    .filter((l) => l.startsWith('v '))
    .map((l) => l.slice(2).trim().split(/\s+/).map(Number));

const parseNormals = (obj) =>
  obj
    .split('\n')
    .filter((l) => l.startsWith('vn '))
    .map((l) => l.slice(3).trim().split(/\s+/).map(Number));

const parseUVs = (obj) =>
  obj
    .split('\n')
    .filter((l) => l.startsWith('vt '))
    .map((l) => l.slice(3).trim().split(/\s+/).map(Number));

describe('terrain/building/ortho orientation', () => {
  test('budova na severu vzorkuje SEVERNÍ výšku terénu (Bug A)', () => {
    const terrain = makeTerrain();
    const northBuilding = squareBuilding(NORTH_LAT, MID_LON);
    const { positions } = generateBuildingMeshData([northBuilding], terrain, 1);

    expect(positions.length).toBeGreaterThan(0);

    // baseZ = avg terrain height under footprint (+ minHeight*scale, =0 here).
    // North footprint sits over the NORTH terrain (~300 m), not south (~0 m).
    let minZ = Infinity;
    for (let i = 2; i < positions.length; i += 3) minZ = Math.min(minZ, positions[i]);

    expect(minZ).toBeGreaterThan(250); // ≈300 (north). Buggy code reads south → ~100/0.
  });

  test('terén OBJ má min-corner origin, +Y=sever, žádné záporné Y (Bug B)', () => {
    const terrain = makeTerrain();
    const verts = parseVerts(exportTerrainOBJ(terrain, 1));

    const ys = verts.map((v) => v[1]);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    expect(minY).toBeGreaterThanOrEqual(0); // no negative coords
    expect(minY).toBeCloseTo(0, 3); // min-corner at origin
    expect(maxY).toBeCloseTo(REAL_H, 0); // north edge at +realHeight

    // The northernmost terrain vertex (max Y) must also be the highest (Z≈300),
    // because our gradient peaks in the north. Ties geometry orientation to data.
    const northVert = verts.reduce((a, b) => (b[1] > a[1] ? b : a));
    expect(northVert[2]).toBeGreaterThan(250);
  });

  test('budovy OBJ ve stejném min-corner frame, žádné záporné souřadnice (Bug B)', () => {
    const terrain = makeTerrain();
    const north = squareBuilding(NORTH_LAT, MID_LON, 1);
    const south = squareBuilding(SOUTH_LAT, MID_LON, 2);
    const meshData = generateBuildingMeshData([north, south], terrain, 1);

    const obj = exportBuildingsOBJ(meshData, REAL_W, REAL_H);
    const verts = parseVerts(obj);
    expect(verts.length).toBeGreaterThan(0);

    for (const [x, y] of verts) {
      expect(x).toBeGreaterThanOrEqual(-1e-6); // no negative X
      expect(y).toBeGreaterThanOrEqual(-1e-6); // no negative Y
      expect(x).toBeLessThanOrEqual(REAL_W + 1e-6);
      expect(y).toBeLessThanOrEqual(REAL_H + 1e-6);
    }

    // North building footprint must end up in the northern half (Y > realH/2).
    const maxY = Math.max(...verts.map((v) => v[1]));
    expect(maxY).toBeGreaterThan(REAL_H / 2);
  });

  test('terén OBJ a budovy OBJ horizontálně sedí na sebe (sever↔sever)', () => {
    const terrain = makeTerrain();
    const north = squareBuilding(NORTH_LAT, MID_LON);
    const meshData = generateBuildingMeshData([north], terrain, 1);

    const terrainNorthY = Math.max(...parseVerts(exportTerrainOBJ(terrain, 1)).map((v) => v[1]));
    const buildingY = Math.max(...parseVerts(exportBuildingsOBJ(meshData, REAL_W, REAL_H)).map((v) => v[1]));

    // North building (87.5% north) must lie below the terrain's north edge
    // but clearly in the northern part — same frame, same direction.
    expect(buildingY).toBeGreaterThan(REAL_H * 0.7);
    expect(buildingY).toBeLessThanOrEqual(terrainNorthY + 1e-6);
  });

  test('terén OBJ normála ny má správné znaménko pro sever-stoupající svah', () => {
    const terrain = makeTerrain();
    const normals = parseNormals(exportTerrainOBJ(terrain, 1));

    // Interior vertex (row=1, col=1) in row-major order: idx = row*RES + col.
    const ny = normals[1 * RES + 1][1];

    // Slope rises toward north (+Y). Height-field normal tilts toward south:
    // n_y = -d h / d y < 0.
    expect(ny).toBeLessThan(0);
  });

  test('terén OBJ trojúhelníky mají winding nahoru (+Z) — ne naruby', () => {
    // Flat terrain → every face lies in the XY plane, geometric normal is
    // exactly ±Z. Mirroring py must not leave the mesh inside-out.
    const terrain = makeTerrain();
    terrain.heightData = new Float32Array(RES * RES); // all zeros = flat
    const obj = exportTerrainOBJ(terrain, 1);

    const verts = parseVerts(obj);
    const faces = obj
      .split('\n')
      .filter((l) => l.startsWith('f '))
      .map((l) =>
        l
          .slice(2)
          .trim()
          .split(/\s+/)
          .map((tok) => parseInt(tok.split('/')[0], 10) - 1),
      );

    expect(faces.length).toBeGreaterThan(0);

    for (const [a, b, c] of faces) {
      const v1 = verts[a];
      const v2 = verts[b];
      const v3 = verts[c];
      const e1 = [v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]];
      const e2 = [v3[0] - v1[0], v3[1] - v1[1], v3[2] - v1[2]];
      const nz = e1[0] * e2[1] - e1[1] * e2[0]; // z of cross product
      expect(nz).toBeGreaterThan(0); // CCW from above → faces point up
    }
  });

  test('nejsevernější terén OBJ vertex má UV v=1 (3ds Max OpenGL konzistence)', () => {
    const terrain = makeTerrain();
    const obj = exportTerrainOBJ(terrain, 1);
    const verts = parseVerts(obj);
    const uvs = parseUVs(obj);

    // index of the vertex with max Y (northernmost in target frame)
    let northIdx = 0;
    for (let i = 1; i < verts.length; i++) if (verts[i][1] > verts[northIdx][1]) northIdx = i;

    // OpenGL/3ds Max: V=1 = top of texture = north content of ortho JPEG.
    expect(uvs[northIdx][1]).toBeCloseTo(1, 3);
  });
});

describe('follow-up: wall normals & resampling', () => {
  test('signedPolygonArea: kladná pro CCW, záporná pro CW, |area| správná', () => {
    // CCW square in standard XY axes (x east, y north) → +area.
    const ccw = [[0, 0], [10, 0], [10, 10], [0, 10]];
    expect(signedPolygonArea(ccw)).toBeCloseTo(100, 6);
    expect(signedPolygonArea([...ccw].reverse())).toBeCloseTo(-100, 6);
  });

  // Extract per-edge wall normals from generateBuildingMeshData output and
  // check each points OUTWARD (dot with centroid→edge-midpoint > 0).
  // Layout per building: top n verts, bottom n verts, then 4 verts per edge.
  const wallsPointOutward = (poly) => {
    const terrain = makeTerrain();
    const building = {
      id: 1,
      polygon: poly,
      height: 12,
      minHeight: 0,
      type: 'house',
      levels: null,
    };
    const { positions } = generateBuildingMeshData([building], terrain, 1);
    const { normals } = generateBuildingMeshData([building], terrain, 1);
    const n = poly.length;

    // centroid from the top-cap vertices (first n verts)
    let cx = 0;
    let cy = 0;
    for (let i = 0; i < n; i++) {
      cx += positions[i * 3];
      cy += positions[i * 3 + 1];
    }
    cx /= n;
    cy /= n;

    const results = [];
    for (let e = 0; e < n; e++) {
      const wb = 2 * n + e * 4; // first vertex of this wall quad
      const x0 = positions[wb * 3];
      const y0 = positions[wb * 3 + 1];
      const x1 = positions[(wb + 1) * 3];
      const y1 = positions[(wb + 1) * 3 + 1];
      const mx = (x0 + x1) / 2;
      const my = (y0 + y1) / 2;
      const nx = normals[wb * 3];
      const ny = normals[wb * 3 + 1];
      results.push(nx * (mx - cx) + ny * (my - cy)); // >0 = outward
    }
    return results;
  };

  test('stěny budovy míří VEN pro CCW i CW OSM polygon', () => {
    // squareBuilding order: (S,W)(S,E)(N,E)(N,W) — one winding…
    const sq = squareBuilding(NORTH_LAT, MID_LON).polygon;
    for (const d of wallsPointOutward(sq)) expect(d).toBeGreaterThan(0);
    // …and the reverse winding must work identically.
    for (const d of wallsPointOutward([...sq].reverse())) expect(d).toBeGreaterThan(0);
  });

  test('srcSampleIndex: krajní body dosáhnou celého cropu (off-by-one)', () => {
    expect(srcSampleIndex(0, 256, 100)).toBe(0);
    expect(srcSampleIndex(255, 256, 100)).toBe(99); // last output → last source
  });

  test('srcSampleIndex: guard pro outputSize <= 1 (žádné NaN/dělení nulou)', () => {
    expect(srcSampleIndex(0, 1, 100)).toBe(0);
  });

  // Ray-casting point-in-polygon — valid for concave shapes (a vertex-average
  // centroid is NOT a reliable "inside" reference for an L). poly = [[x,y]].
  const pointInPoly = (px, py, poly) => {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i];
      const [xj, yj] = poly[j];
      if (((yi > py) !== (yj > py)) &&
          (px < ((xj - xi) * (py - yi)) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  };

  // Ground truth for the *rendered* triangle: read the index buffer, compute
  // the geometric face normal from positions in actual index order, step a
  // tiny amount along it from the wall midpoint, and require that point to be
  // OUTSIDE the footprint while the opposite step is INSIDE. Concave-valid.
  // Returns one boolean per wall triangle (true = correctly outward-facing).
  const wallFacesOutward = (poly) => {
    const terrain = makeTerrain();
    const building = { id: 1, polygon: poly, height: 12, minHeight: 0, type: 'house', levels: null };
    const { positions, indices } = generateBuildingMeshData([building], terrain, 1);
    const n = poly.length;

    // footprint polygon in local meters = the top-cap vertices (first n)
    const localPoly = [];
    for (let i = 0; i < n; i++) localPoly.push([positions[i * 3], positions[i * 3 + 1]]);

    const ok = [];
    const eps = 0.05; // meters; smaller than any edge (~tens of m)
    for (let t = 0; t < indices.length; t += 3) {
      const ia = indices[t];
      const ib = indices[t + 1];
      const ic = indices[t + 2];
      if (ia < 2 * n || ib < 2 * n || ic < 2 * n) continue; // walls only
      const ax = positions[ia * 3], ay = positions[ia * 3 + 1], az = positions[ia * 3 + 2];
      const bx = positions[ib * 3], by = positions[ib * 3 + 1], bz = positions[ib * 3 + 2];
      const cxx = positions[ic * 3], cyy = positions[ic * 3 + 1], cz = positions[ic * 3 + 2];
      const e1 = [bx - ax, by - ay, bz - az];
      const e2 = [cxx - ax, cyy - ay, cz - az];
      let gnx = e1[1] * e2[2] - e1[2] * e2[1];
      let gny = e1[2] * e2[0] - e1[0] * e2[2];
      const glen = Math.hypot(gnx, gny) || 1;
      gnx /= glen;
      gny /= glen;
      const mx = (ax + bx + cxx) / 3;
      const my = (ay + by + cyy) / 3;
      const outOk = !pointInPoly(mx + eps * gnx, my + eps * gny, localPoly);
      const inOk = pointInPoly(mx - eps * gnx, my - eps * gny, localPoly);
      ok.push(outOk && inOk);
    }
    return ok;
  };

  // Concave L-shaped footprint (vertices listed CCW in lon=x / lat=y).
  const lShape = () => {
    const d = 0.0003;
    const cells = [[0, 0], [2, 0], [2, 1], [1, 1], [1, 2], [0, 2]];
    return cells.map(([col, row]) => [NORTH_LAT + row * d, MID_LON + col * d]);
  };

  test('stěnové trojúhelníky navinuté VEN — čtverec i konkávní L, CCW i CW', () => {
    for (const poly of [squareBuilding(NORTH_LAT, MID_LON).polygon, lShape()]) {
      const a = wallFacesOutward(poly);
      const b = wallFacesOutward([...poly].reverse());
      expect(a.length).toBeGreaterThan(0);
      expect(b.length).toBeGreaterThan(0);
      expect(a.every(Boolean)).toBe(true);
      expect(b.every(Boolean)).toBe(true);
    }
  });

  test('degenerovaná hrana (duplicitní sousední vrchol) → žádné NaN normály', () => {
    const terrain = makeTerrain();
    const lat = NORTH_LAT;
    const lon = MID_LON;
    const dd = 0.0003;
    // square with the first vertex duplicated consecutively (len=0 edge)
    const poly = [
      [lat - dd, lon - dd],
      [lat - dd, lon - dd],
      [lat - dd, lon + dd],
      [lat + dd, lon + dd],
      [lat + dd, lon - dd],
    ];
    const building = { id: 1, polygon: poly, height: 10, minHeight: 0, type: 'house', levels: null };
    const { normals } = generateBuildingMeshData([building], terrain, 1);
    for (let i = 0; i < normals.length; i++) {
      expect(Number.isFinite(normals[i])).toBe(true);
    }
  });
});
