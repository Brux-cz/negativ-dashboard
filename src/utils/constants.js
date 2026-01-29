import { Map, Mountain, Building2, Home, Layers, Sparkles, Camera } from 'lucide-react';

// Tool definitions
export const tools = [
  { id: 'ortho', name: 'Ortho Map', subtitle: 'Download & Process', description: 'Stažení ortofoto mapy s automatickým odstraněním stínů přes ComfyUI.', icon: Map, category: 'data', status: 'ready' },
  { id: 'terrain', name: '3D Terrain', subtitle: 'Elevation + Ortho', description: 'Stažení 3D terénu s možností importu a aplikace ortho mapy.', icon: Mountain, category: 'data', status: 'ready' },
  { id: 'osm', name: 'OSM Buildings', subtitle: 'OpenStreetMap', description: '3D kontextové budovy z OpenStreetMap pro jakoukoliv oblast.', icon: Building2, category: 'data', status: 'ready' },
  { id: 'building-gen', name: 'AI Building', subtitle: 'Generator', description: 'Generování 3D modelů budov z fotografií nebo skic.', icon: Home, category: 'ai', status: 'beta' },
  { id: 'material-gen', name: 'AI Materials', subtitle: 'Textures & PBR', description: 'Generování textur a kompletních PBR materiálů včetně všech map.', icon: Layers, category: 'ai', status: 'ready' },
  { id: 'upscale', name: 'Creative Upscale', subtitle: 'V-Ray Integration', description: 'Upscale přímo z V-Ray framebufferu s AI vylepšením.', icon: Sparkles, category: 'vray', status: 'connected' },
  { id: 'atmosphere', name: 'AI Atmosphere', subtitle: 'Camera Variants', description: 'Generování atmosférických variant z renderů pomocí archetypů.', icon: Camera, category: 'ai', status: 'new' }
];

// 3ds Max scripts
export const maxScripts = [
  { id: 1, name: 'Context Importer', description: 'Import terrain, ortho a OSM dat', version: '2.1.0', installed: true },
  { id: 2, name: 'Camera Exporter', description: 'Export kamer pro AI Atmosphere', version: '1.4.2', installed: true },
  { id: 3, name: 'Material Applicator', description: 'Aplikace AI materiálů na objekty', version: '1.0.3', installed: false },
  { id: 4, name: 'VRay Bridge', description: 'Propojení s Creative Upscale', version: '3.0.1', installed: true },
  { id: 5, name: 'Batch Renderer', description: 'Dávkové renderování atmosfér', version: '1.2.0', installed: false },
];

// Atmosphere archetypes
export const atmosphereArchetypes = [
  { id: 'day', name: 'Day Light', code: '+40', preview: 'from-sky-200 to-sky-400' },
  { id: 'warm', name: 'Warm Light', code: '+10', preview: 'from-amber-200 to-amber-400' },
  { id: 'golden', name: 'Golden Hour', code: '+5', preview: 'from-orange-300 to-orange-500' },
  { id: 'lastlight', name: 'Last Light', code: '+2', preview: 'from-red-300 to-orange-400' },
  { id: 'dusk', name: 'Warm Dusk', code: '-1', preview: 'from-purple-300 to-orange-300' },
  { id: 'bluehour', name: 'Blue Hour', code: '-8', preview: 'from-blue-400 to-indigo-600' },
  { id: 'night', name: 'Night', code: '-16', preview: 'from-slate-700 to-slate-900' },
  { id: 'overcast', name: 'Overcast', code: '0', preview: 'from-gray-300 to-gray-400' },
];

// Projects
export const projects = [
  { id: 1686, name: 'Malešice', code: '1686', client: 'KLA' },
  { id: 1685, name: 'Žižkov', code: '1685', client: 'KLA' },
  { id: 1684, name: 'Maldives', code: '1684', client: 'ZHA' },
  { id: 1683, name: 'MMD', code: '1683', client: 'POP' },
  { id: 1682, name: 'Notahotel', code: '1682', client: 'SOT' },
  { id: 1681, name: 'Al Maryah', code: '1681', client: 'BIG' },
];

// Current user
export const currentUser = { id: 1, name: 'Petr Malý', initials: 'PM', role: '3D Artist' };

// Ortho Map Sources - tile URL patterns
export const orthoSources = [
  { id: 'google', name: 'Google', url: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', tileUrl: (z, x, y) => `https://mt1.google.com/vt/lyrs=s&x=${x}&y=${y}&z=${z}` },
  { id: 'esri', name: 'Esri', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', tileUrl: (z, x, y) => `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}` },
];

// Elevation source - AWS Terrain Tiles (Terrarium format) - FREE, no API key
export const elevationSource = {
  id: 'aws-terrarium',
  name: 'AWS Terrain (SRTM)',
  url: 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png',
  tileUrl: (z, x, y) => `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`,
  // Terrarium decoding: height = (R * 256 + G + B / 256) - 32768
  decodeHeight: (r, g, b) => (r * 256 + g + b / 256) - 32768,
  maxZoom: 15,
  attribution: 'AWS/Mapzen, SRTM'
};

// localStorage keys
export const ORTHO_STORAGE_KEY = 'ortho-map-settings';
export const TERRAIN_STORAGE_KEY = 'terrain-settings';

// Categories
export const categories = [
  { id: 'all', label: 'Vše' },
  { id: 'data', label: 'Data' },
  { id: 'ai', label: 'AI' },
  { id: 'vray', label: 'V-Ray' }
];
