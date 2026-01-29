import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { Map, Mountain, Building2, Home, Layers, Sparkles, Camera, FolderOpen, ChevronRight, Settings, Download, Zap, Box, Check, X, Plus, Upload, RefreshCw, MapPin, Square, Crosshair, Lock, Unlock, FileImage, FileText, Keyboard } from 'lucide-react';
import { MapContainer, TileLayer, useMap, useMapEvents, Rectangle, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

const tools = [
  { id: 'ortho', name: 'Ortho Map', subtitle: 'Download & Process', description: 'Stažení ortofoto mapy s automatickým odstraněním stínů přes ComfyUI.', icon: Map, category: 'data', status: 'ready' },
  { id: 'terrain', name: '3D Terrain', subtitle: 'Elevation + Ortho', description: 'Stažení 3D terénu s možností importu a aplikace ortho mapy.', icon: Mountain, category: 'data', status: 'ready' },
  { id: 'osm', name: 'OSM Buildings', subtitle: 'OpenStreetMap', description: '3D kontextové budovy z OpenStreetMap pro jakoukoliv oblast.', icon: Building2, category: 'data', status: 'ready' },
  { id: 'building-gen', name: 'AI Building', subtitle: 'Generator', description: 'Generování 3D modelů budov z fotografií nebo skic.', icon: Home, category: 'ai', status: 'beta' },
  { id: 'material-gen', name: 'AI Materials', subtitle: 'Textures & PBR', description: 'Generování textur a kompletních PBR materiálů včetně všech map.', icon: Layers, category: 'ai', status: 'ready' },
  { id: 'upscale', name: 'Creative Upscale', subtitle: 'V-Ray Integration', description: 'Upscale přímo z V-Ray framebufferu s AI vylepšením.', icon: Sparkles, category: 'vray', status: 'connected' },
  { id: 'atmosphere', name: 'AI Atmosphere', subtitle: 'Camera Variants', description: 'Generování atmosférických variant z renderů pomocí archetypů.', icon: Camera, category: 'ai', status: 'new' }
];

const maxScripts = [
  { id: 1, name: 'Context Importer', description: 'Import terrain, ortho a OSM dat', version: '2.1.0', installed: true },
  { id: 2, name: 'Camera Exporter', description: 'Export kamer pro AI Atmosphere', version: '1.4.2', installed: true },
  { id: 3, name: 'Material Applicator', description: 'Aplikace AI materiálů na objekty', version: '1.0.3', installed: false },
  { id: 4, name: 'VRay Bridge', description: 'Propojení s Creative Upscale', version: '3.0.1', installed: true },
  { id: 5, name: 'Batch Renderer', description: 'Dávkové renderování atmosfér', version: '1.2.0', installed: false },
];

const atmosphereArchetypes = [
  { id: 'day', name: 'Day Light', code: '+40', preview: 'from-sky-200 to-sky-400' },
  { id: 'warm', name: 'Warm Light', code: '+10', preview: 'from-amber-200 to-amber-400' },
  { id: 'golden', name: 'Golden Hour', code: '+5', preview: 'from-orange-300 to-orange-500' },
  { id: 'lastlight', name: 'Last Light', code: '+2', preview: 'from-red-300 to-orange-400' },
  { id: 'dusk', name: 'Warm Dusk', code: '-1', preview: 'from-purple-300 to-orange-300' },
  { id: 'bluehour', name: 'Blue Hour', code: '-8', preview: 'from-blue-400 to-indigo-600' },
  { id: 'night', name: 'Night', code: '-16', preview: 'from-slate-700 to-slate-900' },
  { id: 'overcast', name: 'Overcast', code: '0', preview: 'from-gray-300 to-gray-400' },
];

const projects = [
  { id: 1686, name: 'Malešice', code: '1686', client: 'KLA' },
  { id: 1685, name: 'Žižkov', code: '1685', client: 'KLA' },
  { id: 1684, name: 'Maldives', code: '1684', client: 'ZHA' },
  { id: 1683, name: 'MMD', code: '1683', client: 'POP' },
  { id: 1682, name: 'Notahotel', code: '1682', client: 'SOT' },
  { id: 1681, name: 'Al Maryah', code: '1681', client: 'BIG' },
];

const currentUser = { id: 1, name: 'Petr Malý', initials: 'PM', role: '3D Artist' };

const StatusBadge = ({ status }) => {
  const styles = { ready: 'bg-neutral-200 text-neutral-600', connected: 'bg-emerald-100 text-emerald-700', beta: 'bg-amber-100 text-amber-700', new: 'bg-blue-100 text-blue-700' };
  const labels = { ready: 'Ready', connected: 'Connected', beta: 'Beta', new: 'New' };
  return <span className={`text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded-full ${styles[status]}`}>{labels[status]}</span>;
};

const ToolCard = ({ tool, onClick }) => {
  const Icon = tool.icon;
  return (
    <button onClick={onClick} className="group relative bg-white border border-neutral-200 rounded-sm p-5 text-left transition-all duration-300 hover:border-neutral-900 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5">
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 bg-neutral-100 rounded-sm flex items-center justify-center group-hover:bg-neutral-900 transition-colors duration-300">
          <Icon className="w-4 h-4 text-neutral-600 group-hover:text-white transition-colors duration-300" strokeWidth={1.5} />
        </div>
        <StatusBadge status={tool.status} />
      </div>
      <h3 className="text-base font-medium text-neutral-900 tracking-tight">{tool.name}</h3>
      <p className="text-[10px] uppercase tracking-wider text-neutral-400 mb-2">{tool.subtitle}</p>
      <p className="text-xs text-neutral-500 leading-relaxed">{tool.description}</p>
      <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <ChevronRight className="w-4 h-4 text-neutral-400" />
      </div>
    </button>
  );
};

// Ortho Map Sources - tile URL patterns
const orthoSources = [
  { id: 'google', name: 'Google', url: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', tileUrl: (z, x, y) => `https://mt1.google.com/vt/lyrs=s&x=${x}&y=${y}&z=${z}` },
  { id: 'esri', name: 'Esri', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', tileUrl: (z, x, y) => `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}` },
];

// Custom marker icon
const centerIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#171717" stroke-width="2"><circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/></svg>`),
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

// Tile math utilities
const deg2tile = (lat, lon, zoom) => {
  const x = Math.floor((lon + 180) / 360 * Math.pow(2, zoom));
  const y = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
  return { x, y };
};

const tile2deg = (x, y, zoom) => {
  const n = Math.PI - 2 * Math.PI * y / Math.pow(2, zoom);
  const lat = 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  const lon = x / Math.pow(2, zoom) * 360 - 180;
  return { lat, lon };
};

// Get tile bounds for crop rectangle
const getTileBounds = (center, tileZoom, gridSize) => {
  if (!center) return null;
  const centerTile = deg2tile(center[0], center[1], tileZoom);
  const halfGrid = Math.floor(gridSize / 2);

  const topLeft = tile2deg(centerTile.x - halfGrid, centerTile.y - halfGrid, tileZoom);
  const bottomRight = tile2deg(centerTile.x + halfGrid + 1, centerTile.y + halfGrid + 1, tileZoom);

  return [[topLeft.lat, topLeft.lon], [bottomRight.lat, bottomRight.lon]];
};

// Calculate distance between two coordinates in meters (Haversine formula)
const getDistanceMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Format distance for display
const formatDistance = (meters) => {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km`;
  }
  return `${Math.round(meters)} m`;
};

// Generate World File content (.jgw for JPG, .pgw for PNG)
const generateWorldFile = (bounds, pixelWidth, pixelHeight) => {
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

// Estimate file size in MB
const estimateFileSize = (width, height, format, quality) => {
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

// Map click handler component
const MapClickHandler = ({ onMapClick, onZoomChange }) => {
  const map = useMap();

  useMapEvents({
    click(e) {
      onMapClick([e.latlng.lat, e.latlng.lng]);
    },
    zoomend() {
      onZoomChange(map.getZoom());
    }
  });

  // Report initial zoom
  useEffect(() => {
    onZoomChange(map.getZoom());
  }, [map, onZoomChange]);

  return null;
};

// Dark overlay component - darkens area outside crop bounds
const DarkOverlay = ({ bounds }) => {
  const map = useMap();
  const [points, setPoints] = useState(null);

  useEffect(() => {
    if (!bounds) {
      setPoints(null);
      return;
    }

    const updatePoints = () => {
      const mapBounds = map.getBounds();
      const mapNW = map.latLngToContainerPoint(mapBounds.getNorthWest());
      const mapSE = map.latLngToContainerPoint(mapBounds.getSouthEast());
      const cropNW = map.latLngToContainerPoint(L.latLng(bounds[0][0], bounds[0][1]));
      const cropSE = map.latLngToContainerPoint(L.latLng(bounds[1][0], bounds[1][1]));

      setPoints({ mapNW, mapSE, cropNW, cropSE });
    };

    updatePoints();
    map.on('move zoom', updatePoints);

    return () => {
      map.off('move zoom', updatePoints);
    };
  }, [map, bounds]);

  if (!points) return null;

  const { mapNW, mapSE, cropNW, cropSE } = points;

  // Create SVG path for dark overlay with hole for crop area
  const pathD = `
    M ${mapNW.x - 100} ${mapNW.y - 100}
    L ${mapSE.x + 100} ${mapNW.y - 100}
    L ${mapSE.x + 100} ${mapSE.y + 100}
    L ${mapNW.x - 100} ${mapSE.y + 100}
    Z
    M ${cropNW.x} ${cropNW.y}
    L ${cropNW.x} ${cropSE.y}
    L ${cropSE.x} ${cropSE.y}
    L ${cropSE.x} ${cropNW.y}
    Z
  `;

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 500,
      }}
    >
      <path d={pathD} fill="rgba(0, 0, 0, 0.6)" fillRule="evenodd" />
    </svg>
  );
};

// Dimension labels component - shows real-world dimensions on crop edges
// Uses portal to render labels outside MapContainer while accessing map context
const DimensionLabels = ({ bounds, portalContainer }) => {
  const map = useMap();
  const [dimensions, setDimensions] = useState(null);

  useEffect(() => {
    if (!bounds) {
      setDimensions(null);
      return;
    }

    const updateDimensions = () => {
      const [[lat1, lon1], [lat2, lon2]] = bounds;
      const width = getDistanceMeters(lat1, lon1, lat1, lon2);
      const height = getDistanceMeters(lat1, lon1, lat2, lon1);

      const cropNW = map.latLngToContainerPoint(L.latLng(lat1, lon1));
      const cropSE = map.latLngToContainerPoint(L.latLng(lat2, lon2));
      const centerX = (cropNW.x + cropSE.x) / 2;
      const centerY = (cropNW.y + cropSE.y) / 2;

      setDimensions({
        width: formatDistance(width),
        height: formatDistance(height),
        topX: centerX,
        topY: cropNW.y - 8,
        leftX: cropNW.x - 8,
        leftY: centerY,
      });
    };

    updateDimensions();
    map.on('move zoom', updateDimensions);

    return () => {
      map.off('move zoom', updateDimensions);
    };
  }, [map, bounds]);

  if (!dimensions || !portalContainer) return null;

  return ReactDOM.createPortal(
    <>
      {/* Top dimension (width) */}
      <div
        style={{
          position: 'absolute',
          left: dimensions.topX,
          top: dimensions.topY,
          transform: 'translate(-50%, -100%)',
          zIndex: 600,
          pointerEvents: 'none',
        }}
        className="bg-black/80 text-white text-xs font-mono px-2 py-1 rounded whitespace-nowrap"
      >
        {dimensions.width}
      </div>
      {/* Left dimension (height) */}
      <div
        style={{
          position: 'absolute',
          left: dimensions.leftX,
          top: dimensions.leftY,
          transform: 'translate(-100%, -50%) rotate(-90deg)',
          transformOrigin: 'right center',
          zIndex: 600,
          pointerEvents: 'none',
        }}
        className="bg-black/80 text-white text-xs font-mono px-2 py-1 rounded whitespace-nowrap"
      >
        {dimensions.height}
      </div>
    </>,
    portalContainer
  );
};

// Map view controller - moves map when center changes
const MapViewController = ({ center, zoom }) => {
  const map = useMap();

  useEffect(() => {
    if (center) {
      map.setView(center, zoom, { animate: true });
    }
  }, [map, center, zoom]);

  return null;
};

// localStorage key
const STORAGE_KEY = 'ortho-map-settings';

const OrthoMapModal = ({ isOpen, onClose, shiftHeld = false }) => {
  // Load saved settings from localStorage
  const loadSettings = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  };

  const savedSettings = loadSettings();

  // Clear invalid source from localStorage if it doesn't exist anymore
  const getValidSource = () => {
    const found = orthoSources.find(s => s.id === savedSettings?.sourceId);
    if (!found && savedSettings?.sourceId) {
      // Remove invalid source from localStorage
      localStorage.removeItem(STORAGE_KEY);
    }
    return found || orthoSources[0];
  };

  const [selectedSource, setSelectedSource] = useState(getValidSource);
  const [center, setCenter] = useState(savedSettings?.center || null);
  const [mapView, setMapView] = useState(savedSettings?.mapView || [50.0755, 14.4378]);
  const [mapZoom, setMapZoom] = useState(savedSettings?.mapZoom || 14);
  const [tileZoom, setTileZoom] = useState(savedSettings?.tileZoom || 18);
  const [gridSize, setGridSize] = useState(savedSettings?.gridSize || 7);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentMapZoom, setCurrentMapZoom] = useState(14);
  const [searchResults, setSearchResults] = useState([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searching, setSearching] = useState(false);

  // New state for enhanced features
  const [imageFormat, setImageFormat] = useState(savedSettings?.imageFormat || 'png');
  const [jpgQuality, setJpgQuality] = useState(savedSettings?.jpgQuality || 85);
  const [generateWorldFileFlag, setGenerateWorldFileFlag] = useState(savedSettings?.generateWorldFile || false);
  const [useCustomSize, setUseCustomSize] = useState(false);
  const [customWidth, setCustomWidth] = useState(2048);
  const [customHeight, setCustomHeight] = useState(2048);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const modalRef = useRef(null);
  const mapContainerRef = useRef(null);

  const handleZoomChange = useCallback((zoom) => {
    setCurrentMapZoom(Math.round(zoom));
  }, []);

  // Save settings to localStorage
  useEffect(() => {
    const settings = {
      sourceId: selectedSource.id,
      center,
      mapView,
      mapZoom,
      tileZoom,
      gridSize,
      imageFormat,
      jpgQuality,
      generateWorldFile: generateWorldFileFlag,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [selectedSource, center, mapView, mapZoom, tileZoom, gridSize, imageFormat, jpgQuality, generateWorldFileFlag]);

  // Calculate actual output dimensions
  const outputDimensions = useMemo(() => {
    if (useCustomSize) {
      return { width: customWidth, height: customHeight };
    }
    const pixels = gridSize * 256;
    return { width: pixels, height: pixels };
  }, [useCustomSize, customWidth, customHeight, gridSize]);

  // Estimate file size
  const estimatedSize = useMemo(() => {
    return estimateFileSize(outputDimensions.width, outputDimensions.height, imageFormat, jpgQuality);
  }, [outputDimensions, imageFormat, jpgQuality]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      // Don't trigger if typing in input
      if (e.target.tagName === 'INPUT') return;

      switch (e.key) {
        case '+':
        case '=':
          setTileZoom(z => Math.min(21, z + 1));
          break;
        case '-':
          setTileZoom(z => Math.max(17, z - 1));
          break;
        case 'Enter':
          if (center && !downloading) {
            handleDownload();
          }
          break;
        case 'Escape':
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, center, downloading, onClose]);

  // Pixel sizes
  const pixelSizes = [
    { value: 7, pixels: 1792, label: '1792 px' },
    { value: 11, pixels: 2816, label: '2816 px' },
    { value: 15, pixels: 3840, label: '3840 px' },
    { value: 21, pixels: 5376, label: '5376 px' },
    { value: 31, pixels: 7936, label: '7936 px' },
    { value: 41, pixels: 10496, label: '10496 px' },
  ];

  const tileZooms = [
    { value: 17, label: '17' },
    { value: 18, label: '18' },
    { value: 19, label: '19' },
    { value: 20, label: '20' },
    { value: 21, label: '21' },
  ];

  const handleMapClick = useCallback((latlng) => {
    setCenter(latlng);
  }, []);

  // Real geocoding search using Nominatim
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    // Check if input is coordinates (lat, lon)
    const coordMatch = searchQuery.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lon = parseFloat(coordMatch[2]);
      if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
        setCenter([lat, lon]);
        setMapView([lat, lon]);
        setMapZoom(17);
        setSearchResults([]);
        return;
      }
    }

    setSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&addressdetails=1`
      );
      const data = await response.json();
      setSearchResults(data.map(item => ({
        name: item.display_name,
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
      })));
    } catch (e) {
      console.error('Search failed:', e);
    }
    setSearching(false);
  };

  const selectSearchResult = (result) => {
    setCenter([result.lat, result.lon]);
    setMapView([result.lat, result.lon]);
    setMapZoom(17);
    setSearchResults([]);
    setSearchQuery('');
  };

  // Download tiles and stitch them
  const handleDownload = async () => {
    if (!center) return;

    setDownloading(true);
    setDownloadProgress(0);

    try {
      const centerTile = deg2tile(center[0], center[1], tileZoom);
      const halfGrid = Math.floor(gridSize / 2);

      const tileSize = 256;
      const totalSize = gridSize * tileSize;

      const canvas = document.createElement('canvas');
      canvas.width = totalSize;
      canvas.height = totalSize;
      const ctx = canvas.getContext('2d');

      const tiles = [];
      for (let dy = -halfGrid; dy <= halfGrid; dy++) {
        for (let dx = -halfGrid; dx <= halfGrid; dx++) {
          tiles.push({
            x: centerTile.x + dx,
            y: centerTile.y + dy,
            canvasX: (dx + halfGrid) * tileSize,
            canvasY: (dy + halfGrid) * tileSize,
          });
        }
      }

      const loadTile = (tile) => {
        return new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            ctx.drawImage(img, tile.canvasX, tile.canvasY, tileSize, tileSize);
            resolve(true);
          };
          img.onerror = () => {
            ctx.fillStyle = '#e5e5e5';
            ctx.fillRect(tile.canvasX, tile.canvasY, tileSize, tileSize);
            resolve(false);
          };
          img.src = selectedSource.tileUrl(tileZoom, tile.x, tile.y);
        });
      };

      const batchSize = 10;
      let loaded = 0;
      const totalTiles = tiles.length;

      for (let i = 0; i < tiles.length; i += batchSize) {
        const batch = tiles.slice(i, i + batchSize);
        await Promise.all(batch.map(loadTile));
        loaded += batch.length;
        setDownloadProgress((loaded / totalTiles) * 100);
      }

      // Generate smart filename
      const date = new Date();
      const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
      const latStr = center[0].toFixed(3).replace('.', '_');
      const lonStr = center[1].toFixed(3).replace('.', '_');
      const baseFilename = `ortho_${latStr}_${lonStr}_z${tileZoom}_${dateStr}`;

      // Get bounds for world file
      const bounds = getTileBounds(center, tileZoom, gridSize);

      // Export image
      const mimeType = imageFormat === 'jpg' ? 'image/jpeg' : 'image/png';
      const quality = imageFormat === 'jpg' ? jpgQuality / 100 : undefined;

      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `${baseFilename}.${imageFormat}`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);

        // Generate World File if requested
        if (generateWorldFileFlag && bounds) {
          const worldFileContent = generateWorldFile(bounds, totalSize, totalSize);
          const worldFileExt = imageFormat === 'jpg' ? 'jgw' : 'pgw';
          const worldBlob = new Blob([worldFileContent], { type: 'text/plain' });
          const worldUrl = URL.createObjectURL(worldBlob);
          const worldLink = document.createElement('a');
          worldLink.download = `${baseFilename}.${worldFileExt}`;
          worldLink.href = worldUrl;
          setTimeout(() => {
            worldLink.click();
            URL.revokeObjectURL(worldUrl);
          }, 100);
        }

        setDownloading(false);
        setDownloadProgress(0);
      }, mimeType, quality);

    } catch (error) {
      console.error('Download failed:', error);
      setDownloading(false);
      setDownloadProgress(0);
    }
  };

  // Maze state
  const [mazeCompleted, setMazeCompleted] = useState(false);
  const [mazeCrashed, setMazeCrashed] = useState(false);
  const [mazeStarted, setMazeStarted] = useState(false);
  const [showBigH, setShowBigH] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const mazeRef = useRef(null);

  // Easter egg quiz state
  const [quizQuestion, setQuizQuestion] = useState(null);
  const [isDrawing, setIsDrawing] = useState(true);
  const [drawingNumber, setDrawingNumber] = useState(1);
  const [quizAnswer, setQuizAnswer] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [showWrong, setShowWrong] = useState(false);
  const [wrongCount, setWrongCount] = useState(0);

  // Mini-game state
  const [showMiniGame, setShowMiniGame] = useState(false);
  const [currentGame, setCurrentGame] = useState(null);
  const [gameScore, setGameScore] = useState(0);
  const [gameTimeLeft, setGameTimeLeft] = useState(0);
  const [clickCount, setClickCount] = useState(0);
  const [memorySequence, setMemorySequence] = useState([]);
  const [playerSequence, setPlayerSequence] = useState([]);
  const [memoryShowIndex, setMemoryShowIndex] = useState(-1);
  const [mathProblem, setMathProblem] = useState(null);
  const [mathAnswer, setMathAnswer] = useState('');
  const [mathScore, setMathScore] = useState(0);
  const [gameWon, setGameWon] = useState(false);

  // Lottery state for game selection
  const [isLottery, setIsLottery] = useState(false);
  const [lotteryIndex, setLotteryIndex] = useState(0);
  const [lotterySpeed, setLotterySpeed] = useState(50);
  const [lotteryDone, setLotteryDone] = useState(false);

  // Secret bypass - set when modal opened with Shift held
  const [secretBypass, setSecretBypass] = useState(false);

  // Set secret bypass when modal opens with Shift held
  useEffect(() => {
    if (isOpen && shiftHeld) {
      setSecretBypass(true);
    }
  }, [isOpen, shiftHeld]);

  const isEasterEggDismissed = searchQuery.toLowerCase().includes('hodkovice') || secretBypass;

  // Questions about Petr
  const petrQuestions = useMemo(() => [
    { id: 1, question: "Jak se jmenuje Petrův pes?", answer: "gaia", hint: "Bohyně Země v řecké mytologii, matka všeho živého" },
    { id: 2, question: "Jaké bylo první zvíře které Petr měl?", answer: "želva", hint: "Pomalé zvíře s krunýřem, žije hodně dlouho" },
    { id: 3, question: "Který den v měsíci má Petr narozeniny?", answer: "31", hint: "Poslední den v měsíci který má 31 dní" },
    { id: 4, question: "Jak se jmenuje Petrova babička?", answer: "svatava", hint: "Staročeské jméno, zní trochu svatě" },
    { id: 5, question: "Jaký je Petrův oblíbený seriál?", answer: "supernatural", hint: "Dva bratři loví démony a příšery, 15 sérií" },
    { id: 6, question: "Máte Petra rádi?", answer: "ano", hint: "Opravdu se ptáš??? Chceš zpátky do bludiště?", trapOnHint: true },
    { id: 7, question: "Ve které vesnici Petr bydlel?", answer: "hodkovice", hint: "TRAP" },
    { id: 8, question: "Jaká je Petrova oblíbená barva?", answer: "zelená", hint: "Barva trávy, lesa a přírody" },
    { id: 9, question: "Kolik má Petr sourozenců?", answer: "2", hint: "Více než jeden, méně než tři" },
    { id: 10, question: "Jaké je Petrovo oblíbené jídlo?", answer: "křehká kachna", hint: "Pečené vodní ptáče, servírované křupavé" },
  ], []);

  // Hint visibility state
  const [showHint, setShowHint] = useState(false);
  const [hintWasClicked, setHintWasClicked] = useState(false);

  // Maze walls definition - array of {x, y, width, height}
  const mazeWalls = useMemo(() => [
    // Outer walls
    { x: 0, y: 0, w: 100, h: 2 },      // top
    { x: 0, y: 98, w: 100, h: 2 },     // bottom
    { x: 0, y: 0, w: 2, h: 40 },       // left top
    { x: 0, y: 60, w: 2, h: 40 },      // left bottom (gap in middle for start)
    { x: 98, y: 0, w: 2, h: 40 },      // right top
    { x: 98, y: 60, w: 2, h: 40 },     // right bottom (gap for finish)
    // Inner maze walls - horizontal
    { x: 10, y: 15, w: 25, h: 2 },
    { x: 45, y: 15, w: 35, h: 2 },
    { x: 20, y: 30, w: 40, h: 2 },
    { x: 70, y: 30, w: 20, h: 2 },
    { x: 10, y: 45, w: 30, h: 2 },
    { x: 50, y: 45, w: 15, h: 2 },
    { x: 75, y: 45, w: 15, h: 2 },
    { x: 5, y: 60, w: 25, h: 2 },
    { x: 40, y: 60, w: 25, h: 2 },
    { x: 75, y: 60, w: 15, h: 2 },
    { x: 15, y: 75, w: 35, h: 2 },
    { x: 60, y: 75, w: 30, h: 2 },
    { x: 25, y: 85, w: 50, h: 2 },
    // Inner maze walls - vertical
    { x: 20, y: 2, w: 2, h: 13 },
    { x: 35, y: 17, w: 2, h: 13 },
    { x: 55, y: 2, w: 2, h: 13 },
    { x: 80, y: 17, w: 2, h: 13 },
    { x: 10, y: 32, w: 2, h: 13 },
    { x: 45, y: 32, w: 2, h: 13 },
    { x: 65, y: 32, w: 2, h: 28 },
    { x: 25, y: 47, w: 2, h: 13 },
    { x: 85, y: 47, w: 2, h: 13 },
    { x: 5, y: 62, w: 2, h: 13 },
    { x: 35, y: 62, w: 2, h: 13 },
    { x: 50, y: 62, w: 2, h: 13 },
    { x: 80, y: 62, w: 2, h: 13 },
    { x: 15, y: 77, w: 2, h: 8 },
    { x: 45, y: 77, w: 2, h: 8 },
    { x: 70, y: 77, w: 2, h: 8 },
  ], []);

  // Check if point is inside any wall
  const isOnWall = useCallback((x, y) => {
    // Convert screen coordinates to percentage
    if (!mazeRef.current) return false;
    const rect = mazeRef.current.getBoundingClientRect();
    const px = ((x - rect.left) / rect.width) * 100;
    const py = ((y - rect.top) / rect.height) * 100;

    // Check each wall
    for (const wall of mazeWalls) {
      if (px >= wall.x && px <= wall.x + wall.w &&
          py >= wall.y && py <= wall.y + wall.h) {
        return true;
      }
    }
    return false;
  }, [mazeWalls]);

  // Check if reached finish
  const isAtFinish = useCallback((x, y) => {
    if (!mazeRef.current) return false;
    const rect = mazeRef.current.getBoundingClientRect();
    const px = ((x - rect.left) / rect.width) * 100;
    const py = ((y - rect.top) / rect.height) * 100;
    // Finish zone is on the right side gap (98-100%, 40-60%)
    return px >= 96 && py >= 40 && py <= 60;
  }, []);

  // Handle maze mouse move
  const handleMazeMove = useCallback((e) => {
    if (!mazeStarted || mazeCrashed || mazeCompleted) return;

    const x = e.clientX;
    const y = e.clientY;
    setMousePos({ x, y });

    if (isOnWall(x, y)) {
      // Crashed!
      setMazeCrashed(true);
      setTimeout(() => {
        setShowBigH(true);
      }, 500);
      setTimeout(() => {
        // Reset maze
        setMazeCrashed(false);
        setShowBigH(false);
        setMazeStarted(false);
      }, 3000);
    } else if (isAtFinish(x, y)) {
      // Completed!
      setMazeCompleted(true);
    }
  }, [mazeStarted, mazeCrashed, mazeCompleted, isOnWall, isAtFinish]);

  // Start maze when entering start zone
  const handleMazeStart = useCallback((e) => {
    if (mazeStarted || mazeCrashed || mazeCompleted) return;

    if (!mazeRef.current) return;
    const rect = mazeRef.current.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * 100;
    const py = ((e.clientY - rect.top) / rect.height) * 100;

    // Start zone is on the left side gap (0-4%, 40-60%)
    if (px <= 4 && py >= 40 && py <= 60) {
      setMazeStarted(true);
    }
  }, [mazeStarted, mazeCrashed, mazeCompleted]);

  // Drawing animation effect - only after maze completed
  useEffect(() => {
    if (!isOpen || isEasterEggDismissed || !mazeCompleted) return;

    if (isDrawing) {
      const interval = setInterval(() => {
        setDrawingNumber(Math.floor(Math.random() * 10) + 1);
      }, 100);

      const timeout = setTimeout(() => {
        clearInterval(interval);
        const randomQ = petrQuestions[Math.floor(Math.random() * petrQuestions.length)];
        setQuizQuestion(randomQ);
        setShowHint(false);
        setHintWasClicked(false);
        setIsDrawing(false);
      }, 3000);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [isOpen, isDrawing, isEasterEggDismissed, mazeCompleted, petrQuestions]);

  // Check answer
  const checkAnswer = () => {
    if (!quizQuestion || !quizAnswer.trim()) return;

    if (quizAnswer.toLowerCase().trim() === quizQuestion.answer) {
      // Check if this is a trap question and hint was clicked
      if (quizQuestion.trapOnHint && hintWasClicked) {
        // They said "ano" after reading "Chceš zpátky do bludiště?" - back to maze!
        setMazeCompleted(false);
        setMazeStarted(false);
        setIsDrawing(true);
        setQuizQuestion(null);
        setQuizAnswer('');
        setShowHint(false);
        setHintWasClicked(false);
        setWrongCount(0);
      } else {
        // Normal correct answer
        setShowSuccess(true);
        setWrongCount(0);
        setTimeout(() => {
          setShowSuccess(false);
          setShowMiniGame(true);
        }, 2000);
      }
    } else {
      // Wrong answer!
      const newWrongCount = wrongCount + 1;
      setWrongCount(newWrongCount);
      setShowWrong(true);
      setQuizAnswer('');

      setTimeout(() => {
        setShowWrong(false);

        // After 3 wrong answers, back to maze!
        if (newWrongCount >= 3) {
          setMazeCompleted(false);
          setMazeStarted(false);
          setIsDrawing(true);
          setQuizQuestion(null);
          setQuizAnswer('');
          setShowHint(false);
          setHintWasClicked(false);
          setWrongCount(0);
        }
      }, 1500);
    }
  };

  // Mini-games
  const miniGames = [
    { id: 'click', name: '🖱️ KLIKACÍ ŠÍLENSTVÍ', desc: 'Klikni 20x za 5 sekund!' },
    { id: 'memory', name: '🧠 PAMĚŤOVÁ VÝZVA', desc: 'Zapamatuj si sekvenci!' },
    { id: 'math', name: '🔢 MATEMATICKÝ BOSS', desc: 'Vyřeš 5 příkladů za 30s!' },
  ];

  // Start lottery when mini-game section appears
  useEffect(() => {
    if (showMiniGame && !currentGame && !isLottery && !lotteryDone) {
      setIsLottery(true);
      setLotterySpeed(80);
      setLotteryIndex(0);
    }
  }, [showMiniGame, currentGame, isLottery, lotteryDone]);

  // Lottery animation effect
  useEffect(() => {
    if (!isLottery) return;

    const timer = setTimeout(() => {
      setLotteryIndex(prev => {
        const nextIndex = (prev + 1) % miniGames.length;

        // Check if we should stop
        setLotterySpeed(currentSpeed => {
          const newSpeed = currentSpeed * 1.08;
          if (newSpeed > 800) {
            setIsLottery(false);
            setLotteryDone(true);
            return currentSpeed;
          }
          return newSpeed;
        });

        return nextIndex;
      });
    }, lotterySpeed);

    return () => clearTimeout(timer);
  }, [isLottery, lotterySpeed, miniGames.length]);

  // Start the selected game when lottery is done
  useEffect(() => {
    if (lotteryDone && !currentGame) {
      const timer = setTimeout(() => {
        const selectedGame = miniGames[lotteryIndex];
        if (selectedGame) {
          setCurrentGame(selectedGame.id);
          setGameWon(false);

          if (selectedGame.id === 'click') {
            setClickCount(0);
            setGameTimeLeft(5);
          } else if (selectedGame.id === 'memory') {
            const seq = Array.from({ length: 5 }, () => Math.floor(Math.random() * 4));
            setMemorySequence(seq);
            setPlayerSequence([]);
            setMemoryShowIndex(0);
          } else if (selectedGame.id === 'math') {
            setMathScore(0);
            setGameTimeLeft(30);
            // Generate first math problem
            const ops = ['+', '-', '*'];
            const op = ops[Math.floor(Math.random() * ops.length)];
            let a, b;
            if (op === '*') {
              a = Math.floor(Math.random() * 10) + 1;
              b = Math.floor(Math.random() * 10) + 1;
            } else {
              a = Math.floor(Math.random() * 50) + 10;
              b = Math.floor(Math.random() * 30) + 1;
            }
            const answer = op === '+' ? a + b : op === '-' ? a - b : a * b;
            setMathProblem({ a, b, op, answer });
            setMathAnswer('');
          }
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [lotteryDone, currentGame, lotteryIndex, miniGames]);

  const startGame = (gameId) => {
    setCurrentGame(gameId);
    setGameWon(false);

    if (gameId === 'click') {
      setClickCount(0);
      setGameTimeLeft(5);
    } else if (gameId === 'memory') {
      const seq = Array.from({ length: 5 }, () => Math.floor(Math.random() * 4));
      setMemorySequence(seq);
      setPlayerSequence([]);
      setMemoryShowIndex(0);
    } else if (gameId === 'math') {
      setMathScore(0);
      setGameTimeLeft(30);
      // Generate first math problem inline
      const ops = ['+', '-', '*'];
      const op = ops[Math.floor(Math.random() * ops.length)];
      let a, b;
      if (op === '*') {
        a = Math.floor(Math.random() * 10) + 1;
        b = Math.floor(Math.random() * 10) + 1;
      } else {
        a = Math.floor(Math.random() * 50) + 10;
        b = Math.floor(Math.random() * 30) + 1;
      }
      const answer = op === '+' ? a + b : op === '-' ? a - b : a * b;
      setMathProblem({ a, b, op, answer });
      setMathAnswer('');
    }
  };

  const generateMathProblem = () => {
    const ops = ['+', '-', '*'];
    const op = ops[Math.floor(Math.random() * ops.length)];
    let a, b;
    if (op === '*') {
      a = Math.floor(Math.random() * 10) + 1;
      b = Math.floor(Math.random() * 10) + 1;
    } else {
      a = Math.floor(Math.random() * 50) + 10;
      b = Math.floor(Math.random() * 30) + 1;
    }
    const answer = op === '+' ? a + b : op === '-' ? a - b : a * b;
    setMathProblem({ a, b, op, answer });
    setMathAnswer('');
  };

  // Click game timer
  useEffect(() => {
    if (currentGame === 'click' && gameTimeLeft > 0) {
      const timer = setTimeout(() => setGameTimeLeft(t => t - 1), 1000);
      return () => clearTimeout(timer);
    } else if (currentGame === 'click' && gameTimeLeft === 0 && clickCount >= 20) {
      setGameWon(true);
      setTimeout(() => {
        setSearchQuery('hodkovice');
      }, 2000);
    }
  }, [currentGame, gameTimeLeft, clickCount]);

  // Math game timer
  useEffect(() => {
    if (currentGame === 'math' && gameTimeLeft > 0 && !gameWon) {
      const timer = setTimeout(() => setGameTimeLeft(t => t - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [currentGame, gameTimeLeft, gameWon]);

  // Memory game show sequence
  useEffect(() => {
    if (currentGame === 'memory' && memoryShowIndex >= 0 && memoryShowIndex < memorySequence.length) {
      const timer = setTimeout(() => {
        setMemoryShowIndex(i => i + 1);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [currentGame, memoryShowIndex, memorySequence]);

  const handleMemoryClick = (colorIndex) => {
    if (memoryShowIndex < memorySequence.length) return;
    const newSeq = [...playerSequence, colorIndex];
    setPlayerSequence(newSeq);
    if (newSeq[newSeq.length - 1] !== memorySequence[newSeq.length - 1]) {
      // Wrong!
      setPlayerSequence([]);
      setMemoryShowIndex(0);
    } else if (newSeq.length === memorySequence.length) {
      // Won!
      setGameWon(true);
      setTimeout(() => {
        setSearchQuery('hodkovice');
      }, 2000);
    }
  };

  const checkMathAnswer = () => {
    if (parseInt(mathAnswer) === mathProblem.answer) {
      const newScore = mathScore + 1;
      setMathScore(newScore);
      if (newScore >= 5) {
        setGameWon(true);
        setTimeout(() => {
          setSearchQuery('hodkovice');
        }, 2000);
      } else {
        generateMathProblem();
      }
    }
  };

  if (!isOpen) return null;

  const cropBounds = getTileBounds(center, tileZoom, gridSize);

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose} ref={modalRef}>
      {/* Windows 98 Easter Egg */}
      {!isEasterEggDismissed && (
        <div
          className="fixed inset-0 z-[9999] overflow-hidden flex items-center justify-center"
          onClick={e => e.stopPropagation()}
          style={{
            background: 'linear-gradient(45deg, #ff00ff, #00ffff, #ffff00, #ff0000, #00ff00, #0000ff)',
            backgroundSize: '400% 400%',
            animation: 'rainbow 15s ease infinite',
          }}
        >
          <style>{`
            @keyframes rainbow {
              0% { background-position: 0% 50%; }
              50% { background-position: 100% 50%; }
              100% { background-position: 0% 50%; }
            }
            @keyframes floatSmooth {
              0% { transform: translateY(0) rotate(var(--rot)); }
              25% { transform: translateY(-15px) rotate(calc(var(--rot) + 3deg)); }
              50% { transform: translateY(-25px) rotate(calc(var(--rot) + 5deg)); }
              75% { transform: translateY(-10px) rotate(calc(var(--rot) + 2deg)); }
              100% { transform: translateY(0) rotate(var(--rot)); }
            }
            @keyframes colorCycle {
              0% { color: #ff00ff; text-shadow: 0 0 10px #ff00ff; }
              20% { color: #00ffff; text-shadow: 0 0 10px #00ffff; }
              40% { color: #ffff00; text-shadow: 0 0 10px #ffff00; }
              60% { color: #00ff00; text-shadow: 0 0 10px #00ff00; }
              80% { color: #ff0000; text-shadow: 0 0 10px #ff0000; }
              100% { color: #ff00ff; text-shadow: 0 0 10px #ff00ff; }
            }
            @keyframes pulse {
              0%, 100% { transform: scale(1); filter: brightness(1); }
              50% { transform: scale(1.08); filter: brightness(1.2); }
            }
            @keyframes successPulse {
              0%, 100% { transform: scale(1); filter: drop-shadow(0 0 20px #22c55e); }
              50% { transform: scale(1.15); filter: drop-shadow(0 0 40px #22c55e); }
            }
            @keyframes wrongShake {
              0%, 100% { transform: translateX(0); }
              10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
              20%, 40%, 60%, 80% { transform: translateX(10px); }
            }
            @keyframes wrongPulse {
              0%, 100% { background-color: transparent; }
              50% { background-color: rgba(255, 0, 0, 0.3); }
            }
            @keyframes crashShake {
              0%, 100% { transform: translate(0, 0) rotate(0deg); }
              10% { transform: translate(-20px, -10px) rotate(-5deg); }
              20% { transform: translate(20px, 10px) rotate(5deg); }
              30% { transform: translate(-15px, 5px) rotate(-3deg); }
              40% { transform: translate(15px, -5px) rotate(3deg); }
              50% { transform: translate(-10px, 10px) rotate(-2deg); }
              60% { transform: translate(10px, -10px) rotate(2deg); }
              70% { transform: translate(-5px, 5px) rotate(-1deg); }
              80% { transform: translate(5px, -5px) rotate(1deg); }
              90% { transform: translate(-2px, 2px) rotate(0deg); }
            }
            @keyframes bigHGrow {
              0% { transform: scale(0.1); opacity: 0; }
              50% { transform: scale(1.2); opacity: 1; }
              100% { transform: scale(1); opacity: 1; }
            }
            @keyframes glitchText {
              0%, 100% { text-shadow: 2px 0 #ff00ff, -2px 0 #00ffff; }
              25% { text-shadow: -2px 0 #ff00ff, 2px 0 #00ffff; }
              50% { text-shadow: 2px 2px #ff00ff, -2px -2px #00ffff; }
              75% { text-shadow: -2px 2px #ff00ff, 2px -2px #00ffff; }
            }
          `}</style>

          {/* PETR SVETR floating everywhere */}
          {[...Array(20)].map((_, i) => (
            <div
              key={`petr-${i}`}
              style={{
                position: 'absolute',
                left: `${(i * 19) % 90 + 5}%`,
                top: `${(i * 23) % 85 + 5}%`,
                fontFamily: '"Comic Sans MS", cursive',
                fontSize: `${16 + (i % 4) * 10}px`,
                fontWeight: 'bold',
                textShadow: '3px 3px 6px rgba(0,0,0,0.5)',
                animation: `floatSmooth ${8 + (i % 5) * 2}s ease-in-out infinite, colorCycle ${10 + (i % 4) * 3}s ease infinite`,
                animationDelay: `${i * 0.4}s`,
                '--rot': `${(i * 25) % 360 - 180}deg`,
                pointerEvents: 'none',
              }}
            >
              PETR SVETR
            </div>
          ))}

          {/* Maze phase */}
          {!mazeCompleted && (
            <div
              ref={mazeRef}
              className="fixed inset-0 z-20"
              onMouseMove={(e) => { handleMazeStart(e); handleMazeMove(e); }}
              style={{
                cursor: mazeStarted ? 'none' : 'default',
                animation: mazeCrashed ? 'crashShake 0.5s ease-in-out' : 'none',
              }}
            >
              {/* Maze walls */}
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                }}
              >
                {mazeWalls.map((wall, i) => (
                  <rect
                    key={i}
                    x={wall.x}
                    y={wall.y}
                    width={wall.w}
                    height={wall.h}
                    fill="white"
                  />
                ))}
                {/* Start zone indicator */}
                <rect x="0" y="40" width="4" height="20" fill="#00ff00" opacity="0.5" />
                <text x="2" y="52" fontSize="3" fill="#00ff00" textAnchor="middle" fontFamily="Comic Sans MS">START</text>
                {/* Finish zone indicator */}
                <rect x="96" y="40" width="4" height="20" fill="#ff00ff" opacity="0.5" />
                <text x="98" y="52" fontSize="3" fill="#ff00ff" textAnchor="middle" fontFamily="Comic Sans MS">CÍL</text>
              </svg>

              {/* Mouse cursor when playing */}
              {mazeStarted && !mazeCrashed && (
                <div
                  style={{
                    position: 'fixed',
                    left: mousePos.x - 8,
                    top: mousePos.y - 8,
                    width: 16,
                    height: 16,
                    background: '#ffff00',
                    borderRadius: '50%',
                    border: '2px solid #000',
                    pointerEvents: 'none',
                    zIndex: 100,
                    boxShadow: '0 0 10px #ffff00',
                  }}
                />
              )}

              {/* Instructions */}
              {!mazeStarted && !mazeCrashed && (
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                    pointerEvents: 'none',
                  }}
                >
                  <div style={{
                    fontFamily: '"Comic Sans MS", cursive',
                    fontSize: '48px',
                    color: '#fff',
                    textShadow: '3px 3px 6px #000',
                    marginBottom: '20px',
                  }}>
                    BLUDIŠTĚ
                  </div>
                  <div style={{
                    fontFamily: '"Comic Sans MS", cursive',
                    fontSize: '24px',
                    color: '#ffff00',
                    textShadow: '2px 2px 4px #000',
                  }}>
                    Najeď myší na START a projdi do CÍLE
                  </div>
                  <div style={{
                    fontFamily: '"Comic Sans MS", cursive',
                    fontSize: '18px',
                    color: '#ff0000',
                    textShadow: '2px 2px 4px #000',
                    marginTop: '10px',
                  }}>
                    NEDOTÝKEJ SE STĚN!
                  </div>
                </div>
              )}

              {/* Big H on crash */}
              {showBigH && (
                <div
                  style={{
                    position: 'fixed',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(0,0,0,0.8)',
                    zIndex: 200,
                  }}
                >
                  <div
                    style={{
                      fontFamily: '"Comic Sans MS", cursive',
                      fontSize: '80vw',
                      fontWeight: 'bold',
                      color: '#ff0000',
                      animation: 'bigHGrow 1s ease-out forwards, glitchText 0.1s infinite',
                      textShadow: '0 0 50px #ff0000',
                    }}
                  >
                    H
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Main content - only show after maze completed */}
          {mazeCompleted && (
          <div className="text-center relative z-10" onClick={e => e.stopPropagation()}>
            {/* Game won */}
            {gameWon ? (
              <div style={{ animation: 'successPulse 0.5s ease infinite' }}>
                <div style={{ fontSize: '120px' }}>🏆</div>
                <div style={{
                  fontFamily: '"Comic Sans MS", cursive',
                  fontSize: '48px',
                  color: '#22c55e',
                  textShadow: '0 0 20px #22c55e',
                  marginTop: '20px',
                }}>
                  VÍTĚZ!
                </div>
                <div style={{
                  fontFamily: '"Comic Sans MS", cursive',
                  fontSize: '18px',
                  color: '#00ffff',
                  marginTop: '10px',
                  textShadow: '1px 1px 2px #000',
                }}>
                  Jsi hoden vstupu... 👁️
                </div>
              </div>
            ) : showMiniGame ? (
              <div onClick={e => e.stopPropagation()}>
                {!currentGame ? (
                  <>
                    {/* Lottery game selection */}
                    <div style={{ fontSize: '80px', marginBottom: '20px', animation: 'pulse 3s ease-in-out infinite' }}>🎰</div>
                    <div style={{
                      fontFamily: '"Comic Sans MS", cursive',
                      fontSize: '32px',
                      background: 'linear-gradient(90deg, #ff00ff, #00ffff, #ffff00)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      marginBottom: '30px',
                      filter: 'drop-shadow(3px 3px 0px #000)',
                    }}>
                      {lotteryDone ? '🎯 VYLOSOVÁNO! 🎯' : '🎲 LOSUJI HRU... 🎲'}
                    </div>

                    {/* Lottery cards flying */}
                    <div style={{
                      position: 'relative',
                      width: '300px',
                      height: '150px',
                      margin: '0 auto',
                      overflow: 'visible',
                    }}>
                      {miniGames.map((game, i) => {
                        const isSelected = lotteryIndex === i;
                        const colors = [
                          'linear-gradient(135deg, #ff00ff, #ff66ff)',
                          'linear-gradient(135deg, #00ffff, #66ffff)',
                          'linear-gradient(135deg, #ffff00, #ffff66)',
                        ];
                        return (
                          <div
                            key={game.id}
                            style={{
                              position: 'absolute',
                              left: '50%',
                              top: '50%',
                              transform: `translate(-50%, -50%) scale(${isSelected ? 1.3 : 0.7}) rotate(${isSelected ? 0 : (i - 1) * 15}deg)`,
                              padding: '20px 30px',
                              fontSize: '18px',
                              fontFamily: '"Comic Sans MS", cursive',
                              background: colors[i],
                              border: isSelected ? '6px solid #fff' : '3px solid rgba(255,255,255,0.5)',
                              borderRadius: '12px',
                              color: i === 2 ? '#000' : '#fff',
                              minWidth: '200px',
                              textAlign: 'center',
                              transition: `all ${lotterySpeed > 300 ? '0.3s' : '0.1s'} ease`,
                              opacity: isSelected ? 1 : 0.3,
                              boxShadow: isSelected ? '0 0 30px rgba(255,255,255,0.8), 4px 4px 0px #000' : '2px 2px 0px #000',
                              zIndex: isSelected ? 10 : 1,
                            }}
                          >
                            <div style={{ fontSize: '24px', marginBottom: '10px' }}>{game.name}</div>
                            <div style={{ fontSize: '14px', opacity: 0.8 }}>{game.desc}</div>
                          </div>
                        );
                      })}
                    </div>

                    {lotteryDone && (
                      <div style={{
                        marginTop: '40px',
                        fontFamily: '"Comic Sans MS", cursive',
                        fontSize: '18px',
                        color: '#00ff00',
                        animation: 'pulse 0.5s ease infinite',
                      }}>
                        Připrav se...
                      </div>
                    )}
                  </>
                ) : currentGame === 'click' ? (
                  <>
                    {/* Click game */}
                    <div style={{ fontSize: '60px', marginBottom: '20px' }}>🖱️</div>
                    <div style={{
                      fontFamily: '"Comic Sans MS", cursive',
                      fontSize: '28px',
                      color: '#ff00ff',
                      marginBottom: '20px',
                      textShadow: '2px 2px 4px #000',
                    }}>
                      Klikni 20x! Zbývá: {gameTimeLeft}s
                    </div>
                    <div style={{
                      fontSize: '72px',
                      fontFamily: '"Comic Sans MS", cursive',
                      color: clickCount >= 20 ? '#00ff00' : '#fff',
                      marginBottom: '20px',
                      textShadow: '3px 3px 6px #000',
                    }}>
                      {clickCount} / 20
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); if (gameTimeLeft > 0) setClickCount(c => c + 1); }}
                      disabled={gameTimeLeft === 0}
                      style={{
                        padding: '40px 80px',
                        fontSize: '24px',
                        fontFamily: '"Comic Sans MS", cursive',
                        background: gameTimeLeft > 0 ? 'linear-gradient(135deg, #ff00ff, #00ffff)' : '#666',
                        border: '4px solid #fff',
                        borderRadius: '20px',
                        color: '#fff',
                        cursor: gameTimeLeft > 0 ? 'pointer' : 'not-allowed',
                        boxShadow: gameTimeLeft > 0 ? '6px 6px 0px #000' : 'none',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {gameTimeLeft > 0 ? '👆 KLIKEJ! 👆' : (clickCount >= 20 ? '✅ HOTOVO!' : '❌ KONEC')}
                    </button>
                  </>
                ) : currentGame === 'memory' ? (
                  <>
                    {/* Memory game */}
                    <div style={{ fontSize: '60px', marginBottom: '20px' }}>🧠</div>
                    <div style={{
                      fontFamily: '"Comic Sans MS", cursive',
                      fontSize: '24px',
                      color: '#00ffff',
                      marginBottom: '20px',
                      textShadow: '2px 2px 4px #000',
                    }}>
                      {memoryShowIndex < memorySequence.length ? 'Zapamatuj si!' : 'Opakuj sekvenci!'}
                    </div>
                    <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginBottom: '20px' }}>
                      {['#ff0000', '#00ff00', '#0000ff', '#ffff00'].map((color, i) => (
                        <button
                          type="button"
                          key={i}
                          onClick={(e) => { e.stopPropagation(); handleMemoryClick(i); }}
                          disabled={memoryShowIndex < memorySequence.length}
                          style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: '12px',
                            border: '4px solid #fff',
                            background: color,
                            opacity: memoryShowIndex < memorySequence.length
                              ? (memorySequence[memoryShowIndex] === i ? 1 : 0.3)
                              : 0.8,
                            cursor: memoryShowIndex >= memorySequence.length ? 'pointer' : 'default',
                            transform: memoryShowIndex < memorySequence.length && memorySequence[memoryShowIndex] === i
                              ? 'scale(1.3)'
                              : 'scale(1)',
                            transition: 'all 0.5s ease',
                            boxShadow: memoryShowIndex < memorySequence.length && memorySequence[memoryShowIndex] === i
                              ? `0 0 30px ${color}`
                              : '3px 3px 0px #000',
                          }}
                        />
                      ))}
                    </div>
                    <div style={{ fontSize: '16px', color: '#ffff00', fontFamily: '"Comic Sans MS", cursive', textShadow: '1px 1px 2px #000' }}>
                      Krok: {playerSequence.length} / {memorySequence.length}
                    </div>
                  </>
                ) : currentGame === 'math' ? (
                  <>
                    {/* Math game */}
                    <div style={{ fontSize: '60px', marginBottom: '20px' }}>🔢</div>
                    <div style={{
                      fontFamily: '"Comic Sans MS", cursive',
                      fontSize: '24px',
                      color: '#ffff00',
                      marginBottom: '10px',
                      textShadow: '2px 2px 4px #000',
                    }}>
                      Čas: {gameTimeLeft}s | Skóre: {mathScore}/5
                    </div>
                    {mathProblem && gameTimeLeft > 0 && (
                      <>
                        <div style={{
                          fontSize: '48px',
                          fontFamily: '"Comic Sans MS", cursive',
                          color: '#fff',
                          marginBottom: '20px',
                          textShadow: '3px 3px 6px #000',
                        }}>
                          {mathProblem.a} {mathProblem.op} {mathProblem.b} = ?
                        </div>
                        <input
                          type="number"
                          value={mathAnswer}
                          onChange={e => setMathAnswer(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); checkMathAnswer(); } }}
                          onClick={e => e.stopPropagation()}
                          autoFocus
                          style={{
                            padding: '15px 30px',
                            fontSize: '28px',
                            fontFamily: '"Comic Sans MS", cursive',
                            border: '4px solid #ffff00',
                            borderRadius: '8px',
                            background: 'rgba(0,0,0,0.8)',
                            color: '#ffff00',
                            textAlign: 'center',
                            outline: 'none',
                            width: '150px',
                            boxShadow: '0 0 20px #ffff00',
                          }}
                        />
                        <div style={{ marginTop: '15px' }}>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); checkMathAnswer(); }}
                            style={{
                              padding: '12px 40px',
                              fontSize: '18px',
                              fontFamily: '"Comic Sans MS", cursive',
                              background: 'linear-gradient(135deg, #ffff00, #00ff00)',
                              border: '4px solid #fff',
                              borderRadius: '8px',
                              color: '#000',
                              cursor: 'pointer',
                              boxShadow: '4px 4px 0px #000',
                              transition: 'all 0.3s ease',
                            }}
                          >
                            Odpovědět
                          </button>
                        </div>
                      </>
                    )}
                    {gameTimeLeft === 0 && mathScore < 5 && (
                      <div style={{ color: '#ff0000', fontSize: '24px', textShadow: '2px 2px 4px #000' }}>❌ Čas vypršel!</div>
                    )}
                  </>
                ) : null}
              </div>
            ) : showSuccess ? (
              <div style={{ animation: 'successPulse 0.5s ease infinite' }}>
                <div style={{ fontSize: '120px' }}>✅</div>
                <div style={{
                  fontFamily: '"Comic Sans MS", cursive',
                  fontSize: '48px',
                  color: '#22c55e',
                  textShadow: '0 0 20px #22c55e',
                  marginTop: '20px',
                }}>
                  SPRÁVNĚ!
                </div>
                <div style={{
                  fontFamily: '"Comic Sans MS", cursive',
                  fontSize: '18px',
                  color: '#00ffff',
                  marginTop: '10px',
                  textShadow: '1px 1px 2px #000',
                }}>
                  Připrav se na mini hru... 🎮
                </div>
              </div>
            ) : showWrong ? (
              <div style={{ animation: 'wrongShake 0.5s ease' }}>
                <div style={{ fontSize: '120px' }}>❌</div>
                <div style={{
                  fontFamily: '"Comic Sans MS", cursive',
                  fontSize: '48px',
                  color: '#ff0000',
                  textShadow: '0 0 20px #ff0000',
                  marginTop: '20px',
                }}>
                  ŠPATNĚ!
                </div>
                <div style={{
                  fontFamily: '"Comic Sans MS", cursive',
                  fontSize: '18px',
                  color: '#ffff00',
                  marginTop: '10px',
                  textShadow: '1px 1px 2px #000',
                }}>
                  {wrongCount >= 3 ? '3x špatně... Zpátky do bludiště! 🔄' : `Zkus to znovu! (${wrongCount}/3)`}
                </div>
              </div>
            ) : (
              <>
                {/* The Mysterious Eye */}
                <div style={{ animation: 'pulse 4s ease-in-out infinite', marginBottom: '30px' }}>
                  <svg width="220" height="130" viewBox="0 0 220 130">
                    {/* Eye glow */}
                    <ellipse cx="110" cy="65" rx="95" ry="55" fill="rgba(255,0,255,0.3)" />
                    {/* Eye outline */}
                    <ellipse cx="110" cy="65" rx="90" ry="50" fill="none" stroke="#fff" strokeWidth="4" />
                    {/* Iris rainbow */}
                    <circle cx="110" cy="65" r="38" fill="url(#irisGradient)" />
                    <defs>
                      <linearGradient id="irisGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#ff00ff" />
                        <stop offset="50%" stopColor="#00ffff" />
                        <stop offset="100%" stopColor="#ffff00" />
                      </linearGradient>
                    </defs>
                    {/* Pupil with number */}
                    <circle cx="110" cy="65" r="20" fill="#000" />
                    {/* Number in pupil */}
                    <text
                      x="110"
                      y="73"
                      textAnchor="middle"
                      fill="#0f0"
                      fontSize="26"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {isDrawing ? drawingNumber : quizQuestion?.id || '?'}
                    </text>
                    {/* Eye shine */}
                    <circle cx="125" cy="52" r="10" fill="rgba(255,255,255,0.7)" />
                  </svg>
                </div>

                {/* Title */}
                <div style={{
                  fontFamily: '"Comic Sans MS", cursive',
                  fontSize: '36px',
                  background: 'linear-gradient(90deg, #ff00ff, #00ffff, #ffff00, #00ff00)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  textShadow: 'none',
                  marginBottom: '20px',
                  filter: 'drop-shadow(3px 3px 0px #000)',
                }}>
                  {isDrawing ? '🔮 Losuji otázku... 🔮' : '👁️ OKO POZNÁNÍ 👁️'}
                </div>

                {/* Question */}
                {!isDrawing && quizQuestion && (
                  <>
                    <div style={{
                      fontFamily: '"Comic Sans MS", cursive',
                      fontSize: '14px',
                      color: '#ffff00',
                      marginBottom: '10px',
                      textShadow: '1px 1px 2px #000',
                    }}>
                      Otázka č. {quizQuestion.id} z 10
                    </div>
                    <div style={{
                      fontFamily: '"Comic Sans MS", cursive',
                      fontSize: '24px',
                      color: '#fff',
                      textShadow: '2px 2px 4px #000, 0 0 20px #ff00ff',
                      marginBottom: '10px',
                      maxWidth: '500px',
                      padding: '0 20px',
                    }}>
                      {quizQuestion.question}
                    </div>
                    <input
                      type="text"
                      value={quizAnswer}
                      onChange={e => setQuizAnswer(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && checkAnswer()}
                      placeholder="Tvoje odpověď..."
                      autoFocus
                      style={{
                        marginTop: '20px',
                        padding: '15px 30px',
                        fontSize: '20px',
                        fontFamily: '"Comic Sans MS", cursive',
                        border: '4px solid #00ffff',
                        borderRadius: '8px',
                        background: 'rgba(0,0,0,0.8)',
                        color: '#00ffff',
                        textAlign: 'center',
                        outline: 'none',
                        width: '300px',
                        boxShadow: '0 0 20px #00ffff',
                      }}
                    />
                    <div style={{ marginTop: '15px' }}>
                      <button
                        onClick={checkAnswer}
                        style={{
                          padding: '12px 40px',
                          fontSize: '18px',
                          fontFamily: '"Comic Sans MS", cursive',
                          background: 'linear-gradient(135deg, #ff00ff, #00ffff)',
                          border: '4px solid #fff',
                          borderRadius: '8px',
                          color: '#fff',
                          cursor: 'pointer',
                          textShadow: '2px 2px 4px #000',
                          boxShadow: '4px 4px 0px #000',
                          transition: 'all 0.3s ease',
                        }}
                      >
                        ✨ Odpovědět ✨
                      </button>
                    </div>
                    <div style={{
                      fontFamily: '"Comic Sans MS", cursive',
                      fontSize: '14px',
                      color: '#ffff00',
                      marginTop: '30px',
                      textShadow: '1px 1px 2px #000',
                    }}>
                      Odpověz správně a odhalíš tajemství... 🌟
                    </div>

                    {/* Hint button - fixed on right side (only if hint exists) */}
                    {quizQuestion.hint && (
                      <div
                        style={{
                          position: 'fixed',
                          right: '30px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          zIndex: 10000,
                        }}
                      >
                        {!showHint ? (
                          <button
                            onClick={() => {
                              if (quizQuestion.hint === 'TRAP') {
                                // Send back to maze!
                                setMazeCompleted(false);
                                setMazeStarted(false);
                                setIsDrawing(true);
                                setQuizQuestion(null);
                                setQuizAnswer('');
                              } else {
                                setShowHint(true);
                                setHintWasClicked(true);
                              }
                            }}
                            style={{
                              fontFamily: 'Georgia, serif',
                              fontStyle: 'italic',
                              fontSize: '20px',
                              color: 'rgba(255,255,255,0.6)',
                              background: 'rgba(0,0,0,0.3)',
                              border: '2px solid rgba(255,255,255,0.3)',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              writingMode: 'vertical-rl',
                              textOrientation: 'mixed',
                              padding: '20px 12px',
                              transition: 'all 0.3s ease',
                            }}
                            onMouseOver={e => { e.target.style.color = '#fff'; e.target.style.background = 'rgba(0,0,0,0.6)'; }}
                            onMouseOut={e => { e.target.style.color = 'rgba(255,255,255,0.6)'; e.target.style.background = 'rgba(0,0,0,0.3)'; }}
                          >
                            nápověda
                          </button>
                        ) : (
                          <div
                            style={{
                              background: 'rgba(0,0,0,0.9)',
                              border: '3px solid #ffff00',
                              borderRadius: '12px',
                              padding: '20px',
                              maxWidth: '250px',
                              boxShadow: '0 0 30px rgba(255,255,0,0.3)',
                            }}
                          >
                            <div style={{
                              fontFamily: 'Georgia, serif',
                              fontStyle: 'italic',
                              fontSize: '12px',
                              color: '#ffff00',
                              marginBottom: '10px',
                              textTransform: 'uppercase',
                              letterSpacing: '2px',
                            }}>
                              Nápověda
                            </div>
                            <div style={{
                              fontFamily: '"Comic Sans MS", cursive',
                              fontSize: '16px',
                              color: '#fff',
                              lineHeight: '1.5',
                            }}>
                              {quizQuestion.hint}
                            </div>
                            <button
                              onClick={() => setShowHint(false)}
                              style={{
                                marginTop: '15px',
                                fontFamily: '"Comic Sans MS", cursive',
                                fontSize: '12px',
                                color: '#888',
                                background: 'transparent',
                                border: '1px solid #444',
                                borderRadius: '4px',
                                padding: '5px 10px',
                                cursor: 'pointer',
                              }}
                            >
                              Skrýt
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
          )}
        </div>
      )}
      <div className="bg-neutral-900 rounded-lg w-full h-full shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header - Dark */}
        <div className="px-5 py-4 border-b border-neutral-700 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <Map className="w-5 h-5 text-neutral-900" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Ortho Map Downloader</h2>
              <p className="text-sm text-neutral-400">Klikni na mapu pro nastavení středu • <span className="text-neutral-500">ESC zavřít, +/- zoom, Enter stáhnout</span></p>
            </div>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-white p-2 hover:bg-neutral-800 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Map */}
          <div className="flex-1 relative" ref={mapContainerRef}>
            <MapContainer
              center={mapView}
              zoom={mapZoom}
              className="h-full w-full"
            >
              <TileLayer url={selectedSource.url} maxZoom={21} />
              <MapClickHandler onMapClick={handleMapClick} onZoomChange={handleZoomChange} />
              <MapViewController center={mapView} zoom={mapZoom} />
              <DarkOverlay bounds={cropBounds} />

              {center && (
                <Marker position={center} icon={centerIcon}>
                  <Popup>
                    <div className="text-sm">
                      <div className="font-medium">Střed výřezu</div>
                      <div className="font-mono text-neutral-500">
                        {center[0].toFixed(6)}, {center[1].toFixed(6)}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )}

              {cropBounds && (
                <Rectangle
                  bounds={cropBounds}
                  pathOptions={{
                    color: '#ffffff',
                    weight: 2,
                    fillColor: 'transparent',
                    fillOpacity: 0,
                  }}
                />
              )}

              <DimensionLabels bounds={cropBounds} portalContainer={mapContainerRef.current} />
            </MapContainer>

            {/* Zoom indicator */}
            <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-sm px-3 py-2 rounded-lg">
              <div className="text-sm font-mono font-bold text-white">Zoom: {currentMapZoom}</div>
            </div>

            {/* Center info */}
            {center && (
              <div className="absolute bottom-3 left-3 bg-black/80 backdrop-blur-sm px-4 py-3 rounded-lg">
                <div className="text-xs text-neutral-400 mb-1">Střed výřezu</div>
                <div className="text-sm font-mono font-medium text-white">
                  {center[0].toFixed(6)}, {center[1].toFixed(6)}
                </div>
              </div>
            )}

            {/* Scale bar placeholder */}
            <div className="absolute bottom-3 right-3 bg-black/80 backdrop-blur-sm px-3 py-2 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-16 h-1 bg-white rounded" />
                <span className="text-xs text-white font-mono">
                  {currentMapZoom >= 18 ? '50m' : currentMapZoom >= 15 ? '200m' : '1km'}
                </span>
              </div>
            </div>
          </div>

          {/* Sidebar - Dark Mode */}
          <div className={`${sidebarCollapsed ? 'w-12' : 'w-96'} bg-neutral-800 border-l border-neutral-700 overflow-y-auto shrink-0 transition-all duration-300`}>
            {sidebarCollapsed ? (
              <button
                onClick={() => setSidebarCollapsed(false)}
                className="w-full h-full flex items-center justify-center text-neutral-400 hover:text-white"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <div className="p-5 space-y-6">
                {/* Collapse button */}
                <button
                  onClick={() => setSidebarCollapsed(true)}
                  className="absolute top-20 right-[370px] p-1 bg-neutral-700 rounded-l-lg text-neutral-400 hover:text-white z-10"
                >
                  <ChevronRight className="w-4 h-4 rotate-180" />
                </button>

                {/* Search */}
                <div>
                  <label className="text-sm font-medium text-neutral-300 mb-2 block">Hledat místo</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSearch()}
                      placeholder="Adresa nebo 50.0755, 14.4378"
                      className="flex-1 px-3 py-2.5 text-sm bg-neutral-700 border border-neutral-600 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-white focus:ring-1 focus:ring-white"
                    />
                    <button
                      onClick={handleSearch}
                      disabled={searching}
                      className="px-3 py-2.5 bg-white text-neutral-900 rounded-lg hover:bg-neutral-200 disabled:bg-neutral-600 transition-colors"
                    >
                      {searching ? '...' : <MapPin className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Search results */}
                  {searchResults.length > 0 && (
                    <div className="mt-2 bg-neutral-700 border border-neutral-600 rounded-lg max-h-48 overflow-y-auto">
                      {searchResults.map((result, i) => (
                        <button
                          key={i}
                          onClick={() => selectSearchResult(result)}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-neutral-600 border-b border-neutral-600 last:border-0 transition-colors"
                        >
                          <div className="truncate text-white">{result.name}</div>
                          <div className="text-xs font-mono text-neutral-400">
                            {result.lat.toFixed(5)}, {result.lon.toFixed(5)}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Map Source */}
                <div>
                  <label className="text-sm font-medium text-neutral-300 mb-2 block">Zdroj mapy</label>
                  <div className="flex gap-2">
                    {orthoSources.map(source => (
                      <button
                        key={source.id}
                        onClick={() => setSelectedSource(source)}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                          selectedSource.id === source.id
                            ? 'bg-white text-neutral-900'
                            : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
                        }`}
                      >
                        {source.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tile Zoom - Slider */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-neutral-300">Zoom pro stažení</label>
                    <span className="text-sm font-mono text-white">{tileZoom}</span>
                  </div>
                  <input
                    type="range"
                    min={17}
                    max={21}
                    value={tileZoom}
                    onChange={e => setTileZoom(parseInt(e.target.value))}
                    className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-white"
                  />
                  <div className="flex justify-between text-xs text-neutral-500 mt-1">
                    <span>17</span>
                    <span>18</span>
                    <span>19</span>
                    <span>20</span>
                    <span>21</span>
                  </div>
                  <button
                    onClick={() => setTileZoom(Math.min(21, Math.max(17, currentMapZoom)))}
                    className="text-xs text-white hover:text-neutral-300 mt-2"
                  >
                    Použít aktuální zoom mapy ({currentMapZoom})
                  </button>
                </div>

                {/* Pixel size - Presets + Custom */}
                <div>
                  <label className="text-sm font-medium text-neutral-300 mb-2 block">Velikost výřezu</label>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {pixelSizes.slice(0, 6).map(p => (
                      <button
                        key={p.value}
                        onClick={() => { setGridSize(p.value); setUseCustomSize(false); }}
                        className={`py-2 rounded-lg text-sm font-medium transition-all ${
                          gridSize === p.value && !useCustomSize
                            ? 'bg-white text-neutral-900'
                            : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  {/* Custom size toggle */}
                  <button
                    onClick={() => setUseCustomSize(!useCustomSize)}
                    className={`w-full py-2 rounded-lg text-sm font-medium transition-all mb-2 ${
                      useCustomSize
                        ? 'bg-white text-neutral-900'
                        : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
                    }`}
                  >
                    Vlastní velikost
                  </button>

                  {useCustomSize && (
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-xs text-neutral-500 mb-1 block">Šířka (px)</label>
                        <input
                          type="number"
                          value={customWidth}
                          onChange={e => setCustomWidth(parseInt(e.target.value) || 256)}
                          className="w-full px-3 py-2 text-sm bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:outline-none focus:border-white"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-neutral-500 mb-1 block">Výška (px)</label>
                        <input
                          type="number"
                          value={customHeight}
                          onChange={e => setCustomHeight(parseInt(e.target.value) || 256)}
                          className="w-full px-3 py-2 text-sm bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:outline-none focus:border-white"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Format selection */}
                <div>
                  <label className="text-sm font-medium text-neutral-300 mb-2 block">Formát</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setImageFormat('png')}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                        imageFormat === 'png'
                          ? 'bg-white text-neutral-900'
                          : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
                      }`}
                    >
                      <FileImage className="w-4 h-4" />
                      PNG
                    </button>
                    <button
                      onClick={() => setImageFormat('jpg')}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                        imageFormat === 'jpg'
                          ? 'bg-white text-neutral-900'
                          : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
                      }`}
                    >
                      <FileImage className="w-4 h-4" />
                      JPG
                    </button>
                  </div>

                  {imageFormat === 'jpg' && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs text-neutral-500">Kvalita</label>
                        <span className="text-xs font-mono text-white">{jpgQuality}%</span>
                      </div>
                      <input
                        type="range"
                        min={10}
                        max={100}
                        value={jpgQuality}
                        onChange={e => setJpgQuality(parseInt(e.target.value))}
                        className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-white"
                      />
                    </div>
                  )}
                </div>

                {/* Info section */}
                <div className="bg-neutral-700/50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-400">Rozlišení:</span>
                    <span className="font-mono text-white">{outputDimensions.width} × {outputDimensions.height} px</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-400">Tiles:</span>
                    <span className="font-mono text-white">{gridSize * gridSize}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-400">Odhad velikosti:</span>
                    <span className="font-mono text-white">~{estimatedSize.toFixed(1)} MB</span>
                  </div>
                </div>

                {/* Download button */}
                <div className="pt-4 border-t border-neutral-700">
                  {downloading ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-neutral-300 flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Generuji...
                        </span>
                        <span className="font-mono text-white">{Math.round(downloadProgress)}%</span>
                      </div>
                      <div className="w-full bg-neutral-700 rounded-full h-2">
                        <div className="bg-white h-2 rounded-full transition-all" style={{ width: `${downloadProgress}%` }} />
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={handleDownload}
                      disabled={!center}
                      className="w-full py-3.5 bg-white text-neutral-900 text-sm font-semibold rounded-lg hover:bg-neutral-200 disabled:bg-neutral-700 disabled:text-neutral-500 flex items-center justify-center gap-2 transition-colors"
                    >
                      <Download className="w-5 h-5" />
                      Stáhnout {imageFormat.toUpperCase()}
                    </button>
                  )}
                  {!center && (
                    <p className="text-sm text-neutral-500 text-center mt-3">
                      Klikni na mapu pro výběr středu
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const AIBuildingModal = ({ isOpen, onClose }) => {
  const [uploadedImages, setUploadedImages] = useState([]);
  const [currentPhase, setCurrentPhase] = useState('upload');
  const [generatedViews, setGeneratedViews] = useState({ front: false, side: false, top: false, back: false });
  const [progress, setProgress] = useState({ view: 0, model: 0 });
  const viewTypes = [{ id: 'front', label: 'Přední' }, { id: 'side', label: 'Boční' }, { id: 'top', label: 'Horní' }, { id: 'back', label: 'Zadní' }];
  const handleUploadClick = () => setUploadedImages(prev => prev.length < 5 ? [...prev, true] : prev);
  const handleGenerateViews = () => { setCurrentPhase('generating-views'); ['front','side','top','back'].forEach((v,i) => setTimeout(() => { setGeneratedViews(p => ({...p,[v]:true})); setProgress(p => ({...p,view:((i+1)/4)*100})); if(i===3) setTimeout(() => setCurrentPhase('views-ready'), 400); }, (i+1)*600)); };
  const handleGenerate3D = () => { setCurrentPhase('generating-3d'); const int = setInterval(() => setProgress(p => { if(p.model >= 100) { clearInterval(int); setTimeout(() => setCurrentPhase('complete'), 200); return p; } return {...p, model: p.model + 3}; }), 40); };
  const handleReset = () => { setUploadedImages([]); setCurrentPhase('upload'); setGeneratedViews({ front: false, side: false, top: false, back: false }); setProgress({ view: 0, model: 0 }); };
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-sm w-full max-w-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
          <div className="flex items-center gap-2"><div className="w-8 h-8 bg-neutral-900 rounded-sm flex items-center justify-center"><Home className="w-4 h-4 text-white" /></div><div><h2 className="text-base font-medium">AI Building Generator</h2><p className="text-[10px] text-neutral-400">Generování 3D z fotek</p></div></div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-900"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5">
          {currentPhase === 'upload' && (<div className="space-y-4"><div><h3 className="text-xs font-medium mb-2">1. Nahraj referenční fotky</h3><div className="grid grid-cols-5 gap-2">{[...Array(5)].map((_, i) => (<button key={i} onClick={handleUploadClick} className={`aspect-square rounded-sm border-2 border-dashed flex items-center justify-center transition-all ${uploadedImages[i] ? 'border-white bg-emerald-50' : 'border-neutral-200 hover:border-neutral-400'}`}>{uploadedImages[i] ? <Check className="w-5 h-5 text-white" /> : <Upload className="w-5 h-5 text-neutral-300" />}</button>))}</div><p className="text-[10px] text-neutral-400 mt-1">Nahráno {uploadedImages.length}/5</p></div><button onClick={handleGenerateViews} disabled={uploadedImages.length === 0} className="w-full py-2.5 bg-neutral-900 text-white text-sm rounded-sm hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-400 flex items-center justify-center gap-2"><Zap className="w-4 h-4" />Generovat pohledy</button></div>)}
          {(currentPhase === 'generating-views' || currentPhase === 'views-ready') && (<div className="space-y-4"><div><div className="flex items-center justify-between mb-2"><h3 className="text-xs font-medium">2. Generované pohledy</h3>{currentPhase === 'generating-views' && <span className="text-[10px] text-neutral-400">{Math.round(progress.view)}%</span>}</div><div className="grid grid-cols-4 gap-2">{viewTypes.map(v => (<div key={v.id} className={`aspect-square rounded-sm border flex items-center justify-center ${generatedViews[v.id] ? 'border-neutral-900 bg-neutral-100' : 'border-neutral-200 bg-neutral-50'}`}>{generatedViews[v.id] ? <div className="text-center"><Box className="w-6 h-6 text-neutral-600 mx-auto mb-0.5" /><span className="text-[9px] text-neutral-500">{v.label}</span></div> : <div className="w-5 h-5 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin" />}</div>))}</div></div><button onClick={handleGenerate3D} disabled={currentPhase !== 'views-ready'} className="w-full py-2.5 bg-neutral-900 text-white text-sm rounded-sm hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-400 flex items-center justify-center gap-2"><Box className="w-4 h-4" />Generovat 3D model</button></div>)}
          {currentPhase === 'generating-3d' && (<div className="text-center py-10"><div className="w-12 h-12 border-4 border-neutral-200 border-t-neutral-900 rounded-full animate-spin mx-auto mb-3" /><h3 className="text-base font-medium mb-1">Generování 3D...</h3><p className="text-xs text-neutral-400 mb-3">Může trvat pár minut</p><div className="w-full max-w-xs mx-auto bg-neutral-100 rounded-full h-1.5"><div className="bg-neutral-900 h-1.5 rounded-full transition-all" style={{width:`${progress.model}%`}} /></div><span className="text-[10px] text-neutral-400 mt-1 block">{Math.round(progress.model)}%</span></div>)}
          {currentPhase === 'complete' && (<div className="space-y-4"><div className="text-center py-6"><div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3"><Check className="w-6 h-6 text-emerald-600" /></div><h3 className="text-base font-medium mb-1">Model vygenerován!</h3><p className="text-xs text-neutral-400">Připraven k exportu</p></div><div className="aspect-video bg-neutral-100 rounded-sm flex items-center justify-center"><div className="text-center"><Box className="w-12 h-12 text-neutral-400 mx-auto mb-1" /><span className="text-xs text-neutral-500">3D Preview</span></div></div><div className="flex gap-2"><button onClick={handleReset} className="flex-1 py-2.5 border border-neutral-200 text-neutral-600 text-sm rounded-sm hover:bg-neutral-50 flex items-center justify-center gap-2"><RefreshCw className="w-4 h-4" />Nový</button><button className="flex-1 py-2.5 bg-neutral-900 text-white text-sm rounded-sm hover:bg-neutral-800 flex items-center justify-center gap-2"><Download className="w-4 h-4" />Export</button></div></div>)}
        </div>
      </div>
    </div>
  );
};

const AtmosphereModal = ({ isOpen, onClose }) => {
  const [selected, setSelected] = useState([]);
  const toggle = (id) => setSelected(p => p.includes(id) ? p.filter(a => a !== id) : [...p, id]);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-sm w-full max-w-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
          <div className="flex items-center gap-2"><div className="w-8 h-8 bg-neutral-900 rounded-sm flex items-center justify-center"><Camera className="w-4 h-4 text-white" /></div><div><h2 className="text-base font-medium">AI Atmosphere</h2><p className="text-[10px] text-neutral-400">Atmosférické varianty</p></div></div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-900"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5">
          <h3 className="text-xs font-medium mb-3">Vyber archetypy osvětlení</h3>
          <div className="grid grid-cols-4 gap-2">
            {atmosphereArchetypes.map(a => (<button key={a.id} onClick={() => toggle(a.id)} className={`p-3 rounded-sm border-2 transition-all text-left ${selected.includes(a.id) ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200 hover:border-neutral-400'}`}><div className={`w-full h-10 rounded-sm bg-gradient-to-br ${a.preview} mb-2`} /><div className="text-xs font-medium">{a.name}</div><div className="text-[10px] text-neutral-400 font-mono">{a.code}</div></button>))}
          </div>
          <div className="mt-5 pt-4 border-t border-neutral-100 flex items-center justify-between">
            <span className="text-xs text-neutral-500">Vybráno: {selected.length}</span>
            <button disabled={selected.length === 0} className="px-4 py-2 bg-neutral-900 text-white text-sm rounded-sm hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-400 flex items-center gap-2"><Sparkles className="w-4 h-4" />Generovat</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Negativ Logo Component
const NegativLogo = () => (
  <svg viewBox="0 0 120 24" className="h-5 w-auto" fill="currentColor">
    <text x="0" y="18" className="text-[18px] font-medium tracking-tight" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>negativ</text>
  </svg>
);

export default function App() {
  const [activeProject, setActiveProject] = useState(projects[0]);
  const [showBuildingModal, setShowBuildingModal] = useState(false);
  const [showAtmosphereModal, setShowAtmosphereModal] = useState(false);
  const [showOrthoModal, setShowOrthoModal] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');

  const [orthoShiftHeld, setOrthoShiftHeld] = useState(false);

  const handleToolClick = (id, event) => {
    if (id === 'building-gen') setShowBuildingModal(true);
    else if (id === 'atmosphere') setShowAtmosphereModal(true);
    else if (id === 'ortho') {
      setOrthoShiftHeld(event?.shiftKey || false);
      setShowOrthoModal(true);
    }
  };
  
  const filteredTools = activeCategory === 'all' ? tools : tools.filter(t => t.category === activeCategory);
  const categories = [{ id: 'all', label: 'Vše' }, { id: 'data', label: 'Data' }, { id: 'ai', label: 'AI' }, { id: 'vray', label: 'V-Ray' }];
  
  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header - Negativ style */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <div className="flex items-center">
              <span className="text-lg font-medium tracking-tight text-neutral-900">negativ</span>
              <span className="text-[10px] text-neutral-400 ml-2 uppercase tracking-wider hidden sm:inline">tools</span>
            </div>
            
            {/* Right side */}
            <div className="flex items-center gap-4">
              {/* Project selector */}
              <div className="flex items-center gap-1.5 px-2 py-1 bg-neutral-100 rounded-sm">
                <FolderOpen className="w-3.5 h-3.5 text-neutral-400" />
                <select 
                  value={activeProject.id} 
                  onChange={(e) => setActiveProject(projects.find(p => p.id === parseInt(e.target.value)))} 
                  className="bg-transparent text-xs font-medium text-neutral-700 focus:outline-none cursor-pointer"
                >
                  {projects.map(p => <option key={p.id} value={p.id}>{p.code}—{p.client}</option>)}
                </select>
              </div>
              
              {/* User */}
              <div className="w-7 h-7 bg-neutral-900 rounded-full flex items-center justify-center">
                <span className="text-white text-[10px] font-medium">{currentUser.initials}</span>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero - Negativ style with project code */}
        <div className="mb-8">
          <div className="flex items-baseline gap-3 mb-2">
            <span className="text-[11px] font-mono text-neutral-400">{activeProject.code}—</span>
            <h1 className="text-2xl font-light text-neutral-900">{activeProject.name}</h1>
          </div>
          <p className="text-sm text-neutral-500">
            Klient: <span className="font-medium text-neutral-700">{activeProject.client}</span>
          </p>
        </div>
        
        {/* Category Filter */}
        <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1">
          {categories.map(c => (
            <button 
              key={c.id} 
              onClick={() => setActiveCategory(c.id)} 
              className={`px-3 py-1.5 text-xs rounded-sm whitespace-nowrap transition-all ${
                activeCategory === c.id 
                  ? 'bg-neutral-900 text-white' 
                  : 'bg-white text-neutral-600 border border-neutral-200 hover:border-neutral-400'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        
        {/* Tools Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-12">
          {filteredTools.map(t => <ToolCard key={t.id} tool={t} onClick={(e) => handleToolClick(t.id, e)} />)}
        </div>
        
        {/* 3ds Max Scripts */}
        <div className="bg-white border border-neutral-200 rounded-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-medium text-neutral-900">3ds Max Skripty</h2>
              <p className="text-xs text-neutral-400">Nainstalované rozšíření</p>
            </div>
            <button className="text-xs text-neutral-500 hover:text-neutral-900 flex items-center gap-1">
              <Settings className="w-3.5 h-3.5" />
              Spravovat
            </button>
          </div>
          <div className="space-y-2">
            {maxScripts.map(s => (
              <div key={s.id} className="flex items-center justify-between p-3 border border-neutral-100 rounded-sm hover:border-neutral-200 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-1.5 h-1.5 rounded-full ${s.installed ? 'bg-white' : 'bg-neutral-300'}`} />
                  <div>
                    <div className="text-sm font-medium text-neutral-900">{s.name}</div>
                    <div className="text-[10px] text-neutral-400">{s.description}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono text-neutral-400">v{s.version}</span>
                  {s.installed 
                    ? <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Nainstalováno</span> 
                    : <button className="text-[10px] text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded hover:bg-neutral-200">Instalovat</button>
                  }
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Footer - Negativ style */}
        <footer className="mt-12 pt-6 border-t border-neutral-200">
          <div className="flex items-center justify-between text-[10px] text-neutral-400">
            <span>© 2025 negativ tools</span>
            <span className="font-mono">{activeProject.code}—{activeProject.name.toLowerCase()}</span>
          </div>
        </footer>
      </main>
      
      <AIBuildingModal isOpen={showBuildingModal} onClose={() => setShowBuildingModal(false)} />
      <AtmosphereModal isOpen={showAtmosphereModal} onClose={() => setShowAtmosphereModal(false)} />
      <OrthoMapModal isOpen={showOrthoModal} onClose={() => setShowOrthoModal(false)} shiftHeld={orthoShiftHeld} />
    </div>
  );
}
