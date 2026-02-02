/**
 * Default building heights by OSM building type (meters).
 */
const DEFAULT_HEIGHTS = {
  house: 6,
  detached: 6,
  residential: 9,
  apartments: 15,
  commercial: 10,
  retail: 8,
  office: 12,
  industrial: 8,
  warehouse: 6,
  garage: 3,
  garages: 3,
  shed: 3,
  roof: 4,
  church: 15,
  cathedral: 25,
  chapel: 10,
  school: 10,
  hospital: 15,
  hotel: 15,
  yes: 9, // generic default
};

const METERS_PER_LEVEL = 3;

/**
 * Fetch OSM building footprints within bounds using Overpass API.
 *
 * @param {[[number,number],[number,number]]} bounds - [[nLat,wLon],[sLat,eLon]]
 * @returns {Promise<Building[]>}
 *
 * @typedef {Object} Building
 * @property {number} id - OSM way ID
 * @property {[number,number][]} polygon - array of [lat,lon] points
 * @property {number} height - building height in meters
 * @property {number|null} minHeight - min height (for building:parts)
 * @property {string} type - building type tag value
 * @property {number|null} levels - number of levels if known
 */
export const fetchBuildings = async (bounds) => {
  const [[nLat, wLon], [sLat, eLon]] = bounds;
  const bbox = `${sLat},${wLon},${nLat},${eLon}`;

  const query = `
    [out:json][timeout:30];
    (
      way["building"](${bbox});
      relation["building"](${bbox});
    );
    out body;
    >;
    out skel qt;
  `;

  const response = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: `data=${encodeURIComponent(query)}`,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  if (!response.ok) {
    throw new Error(`Overpass API error: ${response.status}`);
  }

  const data = await response.json();

  // Index nodes by ID for fast lookup
  const nodes = {};
  for (const el of data.elements) {
    if (el.type === 'node') {
      nodes[el.id] = [el.lat, el.lon];
    }
  }

  // Extract buildings
  const buildings = [];
  for (const el of data.elements) {
    if (el.type !== 'way' || !el.tags?.building) continue;

    // Resolve node references to coordinates
    const polygon = [];
    let valid = true;
    for (const nodeId of el.nodes) {
      if (!nodes[nodeId]) { valid = false; break; }
      polygon.push(nodes[nodeId]);
    }
    if (!valid || polygon.length < 3) continue;

    // Remove closing node if it duplicates the first
    const first = polygon[0];
    const last = polygon[polygon.length - 1];
    if (first[0] === last[0] && first[1] === last[1]) {
      polygon.pop();
    }
    if (polygon.length < 3) continue;

    const tags = el.tags;
    const type = tags.building || 'yes';

    // Determine height
    let height = null;
    if (tags.height) {
      height = parseFloat(tags.height);
    } else if (tags['building:levels']) {
      height = parseInt(tags['building:levels']) * METERS_PER_LEVEL;
    }
    if (!height || isNaN(height)) {
      height = DEFAULT_HEIGHTS[type] || DEFAULT_HEIGHTS.yes;
    }

    const minHeight = tags.min_height ? parseFloat(tags.min_height) : 0;

    buildings.push({
      id: el.id,
      polygon,
      height,
      minHeight,
      type,
      levels: tags['building:levels'] ? parseInt(tags['building:levels']) : null,
    });
  }

  return buildings;
};
