import { X, Database, Brain, Server, MessageSquare, Search } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export default function ArchitectureView({ onClose }: Props) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Project Architecture</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6 text-sm">
          {/* Diagram */}
          <div className="bg-gray-50 rounded-xl p-5 font-mono text-xs text-gray-700 leading-relaxed">
            <pre className="whitespace-pre">{`
  ┌─────────────────────────────────────────────────┐
  │              HEALTH SYMPTOM GUIDE               │
  │           Agentic AI Architecture               │
  └─────────────────────────────────────────────────┘

  ┌──────────────┐    HTTP/JSON    ┌──────────────────┐
  │   React UI   │ ─────────────► │  Edge Function   │
  │  (Vite/TSX)  │ ◄───────────── │  (Deno Runtime)  │
  └──────────────┘                └────────┬─────────┘
                                           │
               ┌───────────────────────────┼──────────────┐
               │                           │              │
               ▼                           ▼              ▼
  ┌─────────────────┐     ┌────────────────────┐  ┌──────────────┐
  │   Supabase DB   │     │   Agent Reasoning  │  │  OpenAI LLM  │
  │  (PostgreSQL)   │     │   (LangChain-like) │  │ (GPT-4o-mini)│
  │                 │     │                    │  └──────────────┘
  │ • conversations │     │  1. Intent detect  │
  │ • messages      │     │  2. Follow-up Qs   │
  │ • symptom_      │     │  3. RAG retrieval  │
  │   knowledge     │     │  4. LLM call       │
  │   (RAG corpus)  │     │  5. Response gen   │
  └─────────────────┘     └────────────────────┘

  DATA FLOW:
  User Input → Symptom Extraction → RAG Retrieval
       → Agent State Machine → LLM Prompt → Response
       → Persist to DB → Stream to UI
`}</pre>
          </div>

          {/* Component breakdown */}
          <div className="grid grid-cols-1 gap-4">
            {[
              {
                icon: MessageSquare,
                color: 'text-teal-600',
                bg: 'bg-teal-50',
                title: 'React Frontend',
                items: ['Chat interface with markdown rendering', 'Quick symptom selector', 'Agent status visualization', 'Conversation memory display'],
              },
              {
                icon: Brain,
                color: 'text-blue-600',
                bg: 'bg-blue-50',
                title: 'Agentic AI Layer (Edge Function)',
                items: ['Intent & symptom extraction', 'Multi-turn follow-up questions', 'Agent state machine (collecting → analyzing)', 'LLM prompt construction'],
              },
              {
                icon: Search,
                color: 'text-amber-600',
                bg: 'bg-amber-50',
                title: 'RAG (Retrieval-Augmented Generation)',
                items: ['15 condition knowledge base', 'Keyword-based relevance scoring', 'Top-3 condition retrieval', 'Context injection into prompts'],
              },
              {
                icon: Database,
                color: 'text-slate-600',
                bg: 'bg-slate-50',
                title: 'Supabase Database',
                items: ['Conversation history (context memory)', 'Message persistence', 'Symptom knowledge corpus', 'Row Level Security enabled'],
              },
              {
                icon: Server,
                color: 'text-green-600',
                bg: 'bg-green-50',
                title: 'LLM Integration',
                items: ['OpenAI GPT-4o-mini (primary)', 'Rule-based fallback (no API key needed)', 'Structured health guidance prompts', 'Safety disclaimers enforced'],
              },
            ].map(({ icon: Icon, color, bg, title, items }) => (
              <div key={title} className={`rounded-xl p-4 ${bg}`}>
                <div className={`flex items-center gap-2 font-medium mb-2 ${color}`}>
                  <Icon size={15} />
                  <span>{title}</span>
                </div>
                <ul className="space-y-1 text-gray-600">
                  {items.map(item => (
                    <li key={item} className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${color.replace('text-', 'bg-')}`} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Folder structure */}
          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Folder Structure</h3>
            <div className="bg-gray-900 text-green-400 rounded-xl p-4 font-mono text-xs leading-relaxed">
              <pre>{`health-symptom-guide/
├── src/
│   ├── components/
│   │   ├── ChatMessage.tsx      # Message rendering + markdown
│   │   ├── AgentStatusBar.tsx   # Live agent state display
│   │   ├── QuickSymptoms.tsx    # One-click symptom buttons
│   │   └── ArchitectureView.tsx # This diagram
│   ├── lib/
│   │   ├── supabase.ts          # DB client + Edge Function URL
│   │   ├── types.ts             # TypeScript interfaces
│   │   └── session.ts           # Anonymous session management
│   └── App.tsx                  # Main chat application
├── supabase/
│   ├── functions/
│   │   └── health-agent/
│   │       └── index.ts         # Agentic AI edge function
│   └── migrations/
│       └── create_health_guide_schema.sql
└── package.json`}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
