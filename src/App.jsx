import React, { useState, useRef, useEffect } from 'react';
import { Map, Mountain, Building2, Home, Layers, Sparkles, Camera, FolderOpen, ChevronRight, Settings, Download, Zap, Box, Check, X, Plus, Upload, RefreshCw, MapPin, Square, Crosshair } from 'lucide-react';
import { MapContainer, TileLayer, useMap, useMapEvents, Rectangle } from 'react-leaflet';

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

// Ortho Map Sources
const orthoSources = [
  { id: 'esri', name: 'Esri World Imagery', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attribution: 'Esri' },
  { id: 'google', name: 'Google Satellite', url: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', attribution: 'Google' },
  { id: 'cuzk', name: 'ČÚZK Ortofoto', url: 'https://geoportal.cuzk.cz/WMS_ORTOFOTO_PUB/service.svc/get?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&FORMAT=image/png&TRANSPARENT=true&LAYERS=GR_ORTFOTORGB&CRS=EPSG:3857&STYLES=&WIDTH=256&HEIGHT=256&BBOX={bbox-epsg-3857}', attribution: 'ČÚZK', isWMS: true },
];

// Map selection component
const SelectionRectangle = ({ bounds, setBounds }) => {
  const [selecting, setSelecting] = useState(false);
  const [startPoint, setStartPoint] = useState(null);

  useMapEvents({
    mousedown(e) {
      if (e.originalEvent.shiftKey) {
        setSelecting(true);
        setStartPoint(e.latlng);
        setBounds(null);
      }
    },
    mousemove(e) {
      if (selecting && startPoint) {
        setBounds([[startPoint.lat, startPoint.lng], [e.latlng.lat, e.latlng.lng]]);
      }
    },
    mouseup() {
      setSelecting(false);
      setStartPoint(null);
    }
  });

  return bounds ? (
    <Rectangle
      bounds={bounds}
      pathOptions={{ color: '#171717', weight: 2, fillColor: '#171717', fillOpacity: 0.1, dashArray: '5, 5' }}
    />
  ) : null;
};

// Center map on coordinates
const MapController = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom || map.getZoom());
    }
  }, [center, zoom, map]);
  return null;
};

const OrthoMapModal = ({ isOpen, onClose }) => {
  const [selectedSource, setSelectedSource] = useState(orthoSources[0]);
  const [bounds, setBounds] = useState(null);
  const [mapCenter, setMapCenter] = useState([50.0755, 14.4378]); // Prague
  const [mapZoom, setMapZoom] = useState(14);
  const [searchQuery, setSearchQuery] = useState('');
  const [resolution, setResolution] = useState('high');
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const resolutions = [
    { id: 'low', name: 'Nízká', pixels: '1024×1024', desc: 'Rychlé stažení' },
    { id: 'medium', name: 'Střední', pixels: '2048×2048', desc: 'Vyvážená kvalita' },
    { id: 'high', name: 'Vysoká', pixels: '4096×4096', desc: 'Maximální detail' },
  ];

  const handleSearch = () => {
    // Simple geocoding simulation - in production use real geocoding API
    const locations = {
      'praha': [50.0755, 14.4378],
      'brno': [49.1951, 16.6068],
      'ostrava': [49.8209, 18.2625],
      'plzen': [49.7384, 13.3736],
      'liberec': [50.7663, 15.0543],
    };
    const query = searchQuery.toLowerCase().trim();
    if (locations[query]) {
      setMapCenter(locations[query]);
      setMapZoom(15);
    }
  };

  const handleDownload = () => {
    if (!bounds) return;
    setDownloading(true);
    setDownloadProgress(0);

    // Simulate download progress
    const interval = setInterval(() => {
      setDownloadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setDownloading(false);
            setDownloadProgress(0);
          }, 500);
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 200);
  };

  const getBoundsInfo = () => {
    if (!bounds) return null;
    const [[lat1, lng1], [lat2, lng2]] = bounds;
    const latDiff = Math.abs(lat2 - lat1) * 111; // km
    const lngDiff = Math.abs(lng2 - lng1) * 111 * Math.cos((lat1 + lat2) / 2 * Math.PI / 180); // km
    return {
      area: (latDiff * lngDiff).toFixed(2),
      width: lngDiff.toFixed(2),
      height: latDiff.toFixed(2),
    };
  };

  if (!isOpen) return null;

  const boundsInfo = getBoundsInfo();

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-sm w-full max-w-4xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-4 border-b border-neutral-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-neutral-900 rounded-sm flex items-center justify-center">
              <Map className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-medium">Ortho Map</h2>
              <p className="text-[10px] text-neutral-400">Stažení ortofoto mapy</p>
            </div>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-900">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Map */}
          <div className="flex-1 relative">
            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              className="h-full w-full"
              style={{ minHeight: '400px' }}
            >
              <TileLayer
                url={selectedSource.url}
                attribution={selectedSource.attribution}
                maxZoom={19}
              />
              <SelectionRectangle bounds={bounds} setBounds={setBounds} />
              <MapController center={mapCenter} zoom={mapZoom} />
            </MapContainer>

            {/* Map overlay instructions */}
            <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-sm text-xs text-neutral-600 shadow-sm">
              <kbd className="px-1.5 py-0.5 bg-neutral-100 rounded text-[10px] font-mono">Shift</kbd> + táhni pro výběr oblasti
            </div>

            {/* Bounds info overlay */}
            {boundsInfo && (
              <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-sm shadow-sm">
                <div className="text-[10px] text-neutral-400 mb-0.5">Vybraná oblast</div>
                <div className="text-xs font-medium text-neutral-900">
                  {boundsInfo.width} × {boundsInfo.height} km ({boundsInfo.area} km²)
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="w-72 border-l border-neutral-200 p-4 overflow-y-auto shrink-0">
            {/* Search */}
            <div className="mb-5">
              <label className="text-xs font-medium text-neutral-700 mb-1.5 block">Hledat místo</label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder="Praha, Brno..."
                  className="flex-1 px-2.5 py-1.5 text-sm border border-neutral-200 rounded-sm focus:outline-none focus:border-neutral-400"
                />
                <button
                  onClick={handleSearch}
                  className="px-2.5 py-1.5 bg-neutral-100 rounded-sm hover:bg-neutral-200 transition-colors"
                >
                  <MapPin className="w-4 h-4 text-neutral-600" />
                </button>
              </div>
            </div>

            {/* Source selection */}
            <div className="mb-5">
              <label className="text-xs font-medium text-neutral-700 mb-1.5 block">Mapový zdroj</label>
              <div className="space-y-1.5">
                {orthoSources.map(source => (
                  <button
                    key={source.id}
                    onClick={() => setSelectedSource(source)}
                    className={`w-full p-2.5 rounded-sm border text-left transition-all ${
                      selectedSource.id === source.id
                        ? 'border-neutral-900 bg-neutral-50'
                        : 'border-neutral-200 hover:border-neutral-400'
                    }`}
                  >
                    <div className="text-xs font-medium text-neutral-900">{source.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Resolution */}
            <div className="mb-5">
              <label className="text-xs font-medium text-neutral-700 mb-1.5 block">Rozlišení</label>
              <div className="space-y-1.5">
                {resolutions.map(res => (
                  <button
                    key={res.id}
                    onClick={() => setResolution(res.id)}
                    className={`w-full p-2.5 rounded-sm border text-left transition-all ${
                      resolution === res.id
                        ? 'border-neutral-900 bg-neutral-50'
                        : 'border-neutral-200 hover:border-neutral-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-medium text-neutral-900">{res.name}</div>
                      <div className="text-[10px] font-mono text-neutral-400">{res.pixels}</div>
                    </div>
                    <div className="text-[10px] text-neutral-400">{res.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Download button */}
            <div className="pt-4 border-t border-neutral-100">
              {downloading ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-600">Stahování...</span>
                    <span className="text-neutral-400">{Math.round(downloadProgress)}%</span>
                  </div>
                  <div className="w-full bg-neutral-100 rounded-full h-1.5">
                    <div
                      className="bg-neutral-900 h-1.5 rounded-full transition-all"
                      style={{ width: `${downloadProgress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleDownload}
                  disabled={!bounds}
                  className="w-full py-2.5 bg-neutral-900 text-white text-sm rounded-sm hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-400 flex items-center justify-center gap-2 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Stáhnout ortofoto
                </button>
              )}
              {!bounds && (
                <p className="text-[10px] text-neutral-400 text-center mt-2">
                  Vyberte oblast na mapě pomocí Shift + táhnutí
                </p>
              )}
            </div>
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
          {currentPhase === 'upload' && (<div className="space-y-4"><div><h3 className="text-xs font-medium mb-2">1. Nahraj referenční fotky</h3><div className="grid grid-cols-5 gap-2">{[...Array(5)].map((_, i) => (<button key={i} onClick={handleUploadClick} className={`aspect-square rounded-sm border-2 border-dashed flex items-center justify-center transition-all ${uploadedImages[i] ? 'border-emerald-500 bg-emerald-50' : 'border-neutral-200 hover:border-neutral-400'}`}>{uploadedImages[i] ? <Check className="w-5 h-5 text-emerald-500" /> : <Upload className="w-5 h-5 text-neutral-300" />}</button>))}</div><p className="text-[10px] text-neutral-400 mt-1">Nahráno {uploadedImages.length}/5</p></div><button onClick={handleGenerateViews} disabled={uploadedImages.length === 0} className="w-full py-2.5 bg-neutral-900 text-white text-sm rounded-sm hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-400 flex items-center justify-center gap-2"><Zap className="w-4 h-4" />Generovat pohledy</button></div>)}
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

  const handleToolClick = (id) => {
    if (id === 'building-gen') setShowBuildingModal(true);
    else if (id === 'atmosphere') setShowAtmosphereModal(true);
    else if (id === 'ortho') setShowOrthoModal(true);
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
          {filteredTools.map(t => <ToolCard key={t.id} tool={t} onClick={() => handleToolClick(t.id)} />)}
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
                  <div className={`w-1.5 h-1.5 rounded-full ${s.installed ? 'bg-emerald-500' : 'bg-neutral-300'}`} />
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
      <OrthoMapModal isOpen={showOrthoModal} onClose={() => setShowOrthoModal(false)} />
    </div>
  );
}
