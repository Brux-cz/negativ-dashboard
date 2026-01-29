import React, { useState } from 'react';
import { FolderOpen, Settings } from 'lucide-react';

// Import utilities and constants
import { tools, maxScripts, projects, currentUser, categories } from './utils';

// Import components
import { ToolCard, TerrainModal, OrthoMapModal, AIBuildingModal, AtmosphereModal } from './components';

/**
 * Main Application Component
 */
export default function App() {
  const [activeProject, setActiveProject] = useState(projects[0]);
  const [showBuildingModal, setShowBuildingModal] = useState(false);
  const [showAtmosphereModal, setShowAtmosphereModal] = useState(false);
  const [showOrthoModal, setShowOrthoModal] = useState(false);
  const [showTerrainModal, setShowTerrainModal] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');

  const [orthoShiftHeld, setOrthoShiftHeld] = useState(false);

  const handleToolClick = (id, event) => {
    if (id === 'building-gen') setShowBuildingModal(true);
    else if (id === 'atmosphere') setShowAtmosphereModal(true);
    else if (id === 'ortho') {
      setOrthoShiftHeld(event?.shiftKey || false);
      setShowOrthoModal(true);
    }
    else if (id === 'terrain') setShowTerrainModal(true);
  };

  const filteredTools = activeCategory === 'all' ? tools : tools.filter(t => t.category === activeCategory);

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
      <TerrainModal isOpen={showTerrainModal} onClose={() => setShowTerrainModal(false)} />
    </div>
  );
}
