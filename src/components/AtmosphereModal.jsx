import React, { useState } from 'react';
import { Camera, X, Sparkles } from 'lucide-react';
import { atmosphereArchetypes } from '../utils';

/**
 * AtmosphereModal - AI Atmosphere Generator component
 */
export const AtmosphereModal = ({ isOpen, onClose }) => {
  const [selected, setSelected] = useState([]);

  const toggle = (id) => {
    setSelected(p => p.includes(id) ? p.filter(a => a !== id) : [...p, id]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-sm w-full max-w-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-neutral-900 rounded-sm flex items-center justify-center">
              <Camera className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-medium">AI Atmosphere</h2>
              <p className="text-[10px] text-neutral-400">Atmosférické varianty</p>
            </div>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-900">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">
          <h3 className="text-xs font-medium mb-3">Vyber archetypy osvětlení</h3>
          <div className="grid grid-cols-4 gap-2">
            {atmosphereArchetypes.map(a => (
              <button
                key={a.id}
                onClick={() => toggle(a.id)}
                className={`p-3 rounded-sm border-2 transition-all text-left ${
                  selected.includes(a.id) ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200 hover:border-neutral-400'
                }`}
              >
                <div className={`w-full h-10 rounded-sm bg-gradient-to-br ${a.preview} mb-2`} />
                <div className="text-xs font-medium">{a.name}</div>
                <div className="text-[10px] text-neutral-400 font-mono">{a.code}</div>
              </button>
            ))}
          </div>
          <div className="mt-5 pt-4 border-t border-neutral-100 flex items-center justify-between">
            <span className="text-xs text-neutral-500">Vybráno: {selected.length}</span>
            <button
              disabled={selected.length === 0}
              className="px-4 py-2 bg-neutral-900 text-white text-sm rounded-sm hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-400 flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Generovat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
