import React, { useState } from 'react';
import { Home, X, Check, Upload, Zap, Box, RefreshCw, Download } from 'lucide-react';

/**
 * AIBuildingModal - AI Building Generator component
 */
export const AIBuildingModal = ({ isOpen, onClose }) => {
  const [uploadedImages, setUploadedImages] = useState([]);
  const [currentPhase, setCurrentPhase] = useState('upload');
  const [generatedViews, setGeneratedViews] = useState({ front: false, side: false, top: false, back: false });
  const [progress, setProgress] = useState({ view: 0, model: 0 });

  const viewTypes = [
    { id: 'front', label: 'Přední' },
    { id: 'side', label: 'Boční' },
    { id: 'top', label: 'Horní' },
    { id: 'back', label: 'Zadní' }
  ];

  const handleUploadClick = () => {
    setUploadedImages(prev => prev.length < 5 ? [...prev, true] : prev);
  };

  const handleGenerateViews = () => {
    setCurrentPhase('generating-views');
    ['front', 'side', 'top', 'back'].forEach((v, i) => {
      setTimeout(() => {
        setGeneratedViews(p => ({ ...p, [v]: true }));
        setProgress(p => ({ ...p, view: ((i + 1) / 4) * 100 }));
        if (i === 3) {
          setTimeout(() => setCurrentPhase('views-ready'), 400);
        }
      }, (i + 1) * 600);
    });
  };

  const handleGenerate3D = () => {
    setCurrentPhase('generating-3d');
    const int = setInterval(() => {
      setProgress(p => {
        if (p.model >= 100) {
          clearInterval(int);
          setTimeout(() => setCurrentPhase('complete'), 200);
          return p;
        }
        return { ...p, model: p.model + 3 };
      });
    }, 40);
  };

  const handleReset = () => {
    setUploadedImages([]);
    setCurrentPhase('upload');
    setGeneratedViews({ front: false, side: false, top: false, back: false });
    setProgress({ view: 0, model: 0 });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-sm w-full max-w-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-neutral-900 rounded-sm flex items-center justify-center">
              <Home className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-medium">AI Building Generator</h2>
              <p className="text-[10px] text-neutral-400">Generování 3D z fotek</p>
            </div>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-900">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">
          {currentPhase === 'upload' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-medium mb-2">1. Nahraj referenční fotky</h3>
                <div className="grid grid-cols-5 gap-2">
                  {[...Array(5)].map((_, i) => (
                    <button
                      key={i}
                      onClick={handleUploadClick}
                      className={`aspect-square rounded-sm border-2 border-dashed flex items-center justify-center transition-all ${
                        uploadedImages[i] ? 'border-white bg-emerald-50' : 'border-neutral-200 hover:border-neutral-400'
                      }`}
                    >
                      {uploadedImages[i] ? <Check className="w-5 h-5 text-white" /> : <Upload className="w-5 h-5 text-neutral-300" />}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-neutral-400 mt-1">Nahráno {uploadedImages.length}/5</p>
              </div>
              <button
                onClick={handleGenerateViews}
                disabled={uploadedImages.length === 0}
                className="w-full py-2.5 bg-neutral-900 text-white text-sm rounded-sm hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-400 flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4" />
                Generovat pohledy
              </button>
            </div>
          )}
          {(currentPhase === 'generating-views' || currentPhase === 'views-ready') && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-medium">2. Generované pohledy</h3>
                  {currentPhase === 'generating-views' && <span className="text-[10px] text-neutral-400">{Math.round(progress.view)}%</span>}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {viewTypes.map(v => (
                    <div
                      key={v.id}
                      className={`aspect-square rounded-sm border flex items-center justify-center ${
                        generatedViews[v.id] ? 'border-neutral-900 bg-neutral-100' : 'border-neutral-200 bg-neutral-50'
                      }`}
                    >
                      {generatedViews[v.id] ? (
                        <div className="text-center">
                          <Box className="w-6 h-6 text-neutral-600 mx-auto mb-0.5" />
                          <span className="text-[9px] text-neutral-500">{v.label}</span>
                        </div>
                      ) : (
                        <div className="w-5 h-5 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <button
                onClick={handleGenerate3D}
                disabled={currentPhase !== 'views-ready'}
                className="w-full py-2.5 bg-neutral-900 text-white text-sm rounded-sm hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-400 flex items-center justify-center gap-2"
              >
                <Box className="w-4 h-4" />
                Generovat 3D model
              </button>
            </div>
          )}
          {currentPhase === 'generating-3d' && (
            <div className="text-center py-10">
              <div className="w-12 h-12 border-4 border-neutral-200 border-t-neutral-900 rounded-full animate-spin mx-auto mb-3" />
              <h3 className="text-base font-medium mb-1">Generování 3D...</h3>
              <p className="text-xs text-neutral-400 mb-3">Může trvat pár minut</p>
              <div className="w-full max-w-xs mx-auto bg-neutral-100 rounded-full h-1.5">
                <div className="bg-neutral-900 h-1.5 rounded-full transition-all" style={{ width: `${progress.model}%` }} />
              </div>
              <span className="text-[10px] text-neutral-400 mt-1 block">{Math.round(progress.model)}%</span>
            </div>
          )}
          {currentPhase === 'complete' && (
            <div className="space-y-4">
              <div className="text-center py-6">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Check className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="text-base font-medium mb-1">Model vygenerován!</h3>
                <p className="text-xs text-neutral-400">Připraven k exportu</p>
              </div>
              <div className="aspect-video bg-neutral-100 rounded-sm flex items-center justify-center">
                <div className="text-center">
                  <Box className="w-12 h-12 text-neutral-400 mx-auto mb-1" />
                  <span className="text-xs text-neutral-500">3D Preview</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleReset}
                  className="flex-1 py-2.5 border border-neutral-200 text-neutral-600 text-sm rounded-sm hover:bg-neutral-50 flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Nový
                </button>
                <button className="flex-1 py-2.5 bg-neutral-900 text-white text-sm rounded-sm hover:bg-neutral-800 flex items-center justify-center gap-2">
                  <Download className="w-4 h-4" />
                  Export
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
