import React from 'react';
import { ChevronRight } from 'lucide-react';

/**
 * Status badge component for tool cards
 */
export const StatusBadge = ({ status }) => {
  const styles = {
    ready: 'bg-neutral-200 text-neutral-600',
    connected: 'bg-emerald-100 text-emerald-700',
    beta: 'bg-amber-100 text-amber-700',
    new: 'bg-blue-100 text-blue-700'
  };
  const labels = {
    ready: 'Ready',
    connected: 'Connected',
    beta: 'Beta',
    new: 'New'
  };
  return (
    <span className={`text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded-full ${styles[status]}`}>
      {labels[status]}
    </span>
  );
};

/**
 * Tool card component for dashboard
 */
export const ToolCard = ({ tool, onClick }) => {
  const Icon = tool.icon;
  return (
    <button
      onClick={onClick}
      className="group relative bg-white border border-neutral-200 rounded-sm p-5 text-left transition-all duration-300 hover:border-neutral-900 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5"
    >
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
