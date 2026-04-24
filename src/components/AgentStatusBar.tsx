import { Brain, Search, CheckCircle, Tag } from 'lucide-react';
import type { AgentState } from '../lib/types';

interface Props {
  agentState: AgentState | null;
  isLoading: boolean;
}

const phaseConfig = {
  collecting: {
    icon: Search,
    label: 'Gathering Information',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
  },
  analyzing: {
    icon: Brain,
    label: 'Analyzing Symptoms',
    color: 'text-teal-600',
    bg: 'bg-teal-50',
    border: 'border-teal-200',
    dot: 'bg-teal-500',
  },
  complete: {
    icon: CheckCircle,
    label: 'Analysis Complete',
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-200',
    dot: 'bg-green-500',
  },
};

export default function AgentStatusBar({ agentState, isLoading }: Props) {
  if (!agentState && !isLoading) return null;

  const phase = agentState?.phase ?? 'collecting';
  const config = phaseConfig[phase];
  const Icon = config.icon;

  return (
    <div className={`rounded-xl border px-4 py-3 ${config.bg} ${config.border} space-y-2.5`}>
      {/* Phase indicator */}
      <div className="flex items-center justify-between">
        <div className={`flex items-center gap-2 text-xs font-medium ${config.color}`}>
          <div className={`w-2 h-2 rounded-full ${config.dot} ${isLoading ? 'animate-pulse' : ''}`} />
          <Icon size={13} />
          <span>Agent: {isLoading ? 'Processing...' : config.label}</span>
        </div>
        {agentState && (
          <span className="text-xs text-gray-400">Turn {agentState.turnCount}</span>
        )}
      </div>

      {/* Detected symptoms */}
      {agentState && agentState.symptoms.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {agentState.symptoms.slice(0, 6).map(sym => (
            <span key={sym} className="inline-flex items-center gap-1 bg-white rounded-full px-2.5 py-0.5 text-xs text-gray-600 border border-gray-200 shadow-sm">
              <Tag size={9} className="text-teal-500" />
              {sym}
            </span>
          ))}
          {agentState.symptoms.length > 6 && (
            <span className="text-xs text-gray-400 self-center">+{agentState.symptoms.length - 6} more</span>
          )}
        </div>
      )}

      {/* Retrieved conditions */}
      {agentState && agentState.retrievedConditions.length > 0 && (
        <div className="text-xs text-gray-500">
          <span className="font-medium">Knowledge retrieved:</span>{' '}
          {agentState.retrievedConditions.join(', ')}
        </div>
      )}
    </div>
  );
}
