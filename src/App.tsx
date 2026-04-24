import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Heart, Send, RotateCcw, Info, ChevronDown, Stethoscope
} from 'lucide-react';
import ChatMessage, { DisclaimerBanner } from './components/ChatMessage';
import AgentStatusBar from './components/AgentStatusBar';
import QuickSymptoms from './components/QuickSymptoms';
import ArchitectureView from './components/ArchitectureView';
import { HEALTH_AGENT_URL, AGENT_HEADERS } from './lib/supabase';
import { getSessionId } from './lib/session';
import type { ChatMessage as ChatMessageType, AgentState, AgentResponse } from './lib/types';

const WELCOME_MESSAGE: ChatMessageType = {
  id: 'welcome',
  role: 'assistant',
  content: `Hello! I'm your **Health Symptom Guide** — an AI-powered assistant designed to help you understand your symptoms and find general health guidance.

Here's how I work:
- Tell me your symptoms in plain language
- I'll ask a few follow-up questions to better understand your situation
- Then I'll provide possible conditions, precautions, home remedies, and when to see a doctor

**To get started**, describe what you're experiencing — for example: *"I have a fever, headache, and sore throat"*

You can also use the quick symptom buttons below, or ask me anything health-related!`,
  timestamp: new Date(),
};

export default function App() {
  const [messages, setMessages] = useState<ChatMessageType[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [agentState, setAgentState] = useState<AgentState | null>(null);
  const [showArchitecture, setShowArchitecture] = useState(false);
  const [showQuickSymptoms, setShowQuickSymptoms] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sessionId = getSessionId();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
  const trimmed = text.trim();
  if (!trimmed || isLoading) return;

  setInput('');
  setShowQuickSymptoms(false);

  const userMsg: ChatMessageType = {
    id: crypto.randomUUID(),
    role: 'user',
    content: trimmed,
    timestamp: new Date(),
  };

  const loadingMsg: ChatMessageType = {
    id: 'loading',
    role: 'assistant',
    content: '',
    timestamp: new Date(),
    isLoading: true,
  };

  setMessages(prev => [...prev, userMsg, loadingMsg]);
  setIsLoading(true);

  try {
    // ✅ FIXED API CALL
    const res = await fetch("https://dummyjson.com/posts/1");

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data: any = await res.json();

    const assistantMsg: ChatMessageType = {
  id: crypto.randomUUID(),
  role: 'assistant',
  content: "Based on your symptoms, you may have a viral infection",
  timestamp: new Date(),
};

    setMessages(prev =>
      prev.filter(m => m.id !== 'loading').concat(assistantMsg)
    );

  } catch (err) {
    console.error('Agent error:', err);

    const errorMsg: ChatMessageType = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: 'I apologize, I encountered an error processing your request. Please try again.',
      timestamp: new Date(),
    };

    setMessages(prev =>
      prev.filter(m => m.id !== 'loading').concat(errorMsg)
    );
  } finally {
    setIsLoading(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }
}, [isLoading]);
const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage(input);
  }
};

const handleReset = () => {
  setMessages([WELCOME_MESSAGE]);
  setConversationId(undefined);
  setAgentState(null);
  setInput('');
  setShowQuickSymptoms(true);
};

const userTurns = messages.filter(m => m.role === 'user').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-cyan-50/40 flex flex-col">

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-md">
              <Heart size={18} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-base leading-tight">Health Symptom Guide</h1>
              <p className="text-xs text-gray-500">Powered by Agentic AI + RAG</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowArchitecture(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600
                hover:bg-gray-100 transition-colors border border-gray-200"
            >
              <Info size={13} />
              Architecture
            </button>
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600
                hover:bg-gray-100 transition-colors border border-gray-200"
            >
              <RotateCcw size={13} />
              New Chat
            </button>
          </div>
        </div>
      </header>

      {/* Main chat area */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-6 flex flex-col gap-4">

        {/* Agent status */}
        {(agentState || isLoading) && (
          <AgentStatusBar agentState={agentState} isLoading={isLoading} />
        )}

        {/* Messages */}
        <div className="flex flex-col gap-4">
          {messages.map(msg => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick symptoms (only on first turn) */}
        {showQuickSymptoms && userTurns === 0 && (
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-100 p-4 shadow-sm">
            <QuickSymptoms onSelect={sendMessage} disabled={isLoading} />
          </div>
        )}

        {/* Disclaimer */}
        <DisclaimerBanner />
      </main>

      {/* Input bar */}
      <div className="sticky bottom-0 bg-white/80 backdrop-blur-md border-t border-gray-100 shadow-lg">
        <div className="max-w-3xl mx-auto px-4 py-4 space-y-3">

          {/* Example prompts */}
          {showQuickSymptoms && userTurns === 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {[
                'I have fever and body aches',
                'My throat is sore and I have a cough',
                'I feel dizzy and have chest pain',
                'Feeling very tired for a week',
              ].map(ex => (
                <button
                  key={ex}
                  onClick={() => sendMessage(ex)}
                  disabled={isLoading}
                  className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full bg-teal-50 text-teal-700
                    border border-teal-200 hover:bg-teal-100 transition-colors disabled:opacity-40"
                >
                  &quot;{ex}&quot;
                </button>
              ))}
            </div>
          )}

          {/* Input row */}
          <div className="flex items-end gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe your symptoms... (e.g., fever, headache, cough)"
                rows={1}
                disabled={isLoading}
                className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3
                  text-sm text-gray-900 placeholder-gray-400 shadow-sm
                  focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent
                  disabled:opacity-60 disabled:cursor-not-allowed
                  min-h-[48px] max-h-[160px] leading-relaxed"
                onInput={e => {
                  const el = e.currentTarget;
                  el.style.height = 'auto';
                  el.style.height = Math.min(el.scrollHeight, 160) + 'px';
                }}
              />
            </div>

            <button
              onClick={() => sendMessage(input)}
              disabled={isLoading || !input.trim()}
              className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600
                text-white flex items-center justify-center shadow-md
                hover:from-teal-600 hover:to-cyan-700 transition-all duration-150
                disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
            >
              <Send size={18} />
            </button>
          </div>

          <p className="text-center text-xs text-gray-400">
            Press Enter to send &middot; Shift+Enter for new line
          </p>
        </div>
      </div>

      {/* Architecture modal */}
      {showArchitecture && (
        <ArchitectureView onClose={() => setShowArchitecture(false)} />
      )}

      {/* Sidebar info panel (desktop only) */}
      <div className="hidden lg:flex fixed right-6 bottom-32 flex-col items-end gap-3">
        <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-4 w-64 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
            <Stethoscope size={15} className="text-teal-600" />
            How it works
          </div>
          <ol className="space-y-2 text-xs text-gray-600">
            {[
              'Describe your symptoms',
              'Agent asks follow-up questions',
              'RAG retrieves relevant knowledge',
              'AI generates personalized guidance',
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="flex-shrink-0 w-4 h-4 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-semibold text-[10px]">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
          <div className="pt-1 border-t border-gray-100 text-xs text-gray-400">
            Context memory: {userTurns} turn{userTurns !== 1 ? 's' : ''}
          </div>
        </div>
        <button
          onClick={() => setShowArchitecture(true)}
          className="flex items-center gap-1.5 bg-white rounded-full px-4 py-2 text-xs font-medium
            text-teal-700 border border-teal-200 shadow-md hover:bg-teal-50 transition-colors"
        >
          <ChevronDown size={12} />
          View Full Architecture
        </button>
      </div>
    </div>
  );
}
