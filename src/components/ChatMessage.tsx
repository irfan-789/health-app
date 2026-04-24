import { User, Bot, AlertCircle } from 'lucide-react';
import type { ChatMessage as ChatMessageType } from '../lib/types';

interface Props {
  message: ChatMessageType;
}

function formatContent(content: string): React.ReactNode {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  let inList = false;
  let key = 0;

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={key++} className="my-2 space-y-1 pl-1">
          {listItems.map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-teal-500 flex-shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );
      listItems = [];
      inList = false;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      elements.push(<div key={key++} className="h-2" />);
      continue;
    }

    // Heading: ## or ---
    if (trimmed.startsWith('## ')) {
      flushList();
      elements.push(
        <h3 key={key++} className="font-semibold text-gray-800 mt-3 mb-1 text-sm uppercase tracking-wide">
          {trimmed.slice(3)}
        </h3>
      );
      continue;
    }

    if (trimmed === '---') {
      flushList();
      elements.push(<hr key={key++} className="my-3 border-gray-200" />);
      continue;
    }

    // Bullet list
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      inList = true;
      listItems.push(renderInline(trimmed.slice(2)));
      continue;
    }

    // Numbered list
    if (/^\d+\.\s/.test(trimmed)) {
      inList = true;
      listItems.push(renderInline(trimmed.replace(/^\d+\.\s/, '')));
      continue;
    }

    flushList();

    // Bold line (disclaimer etc.)
    if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
      elements.push(
        <p key={key++} className="font-semibold text-amber-700 bg-amber-50 rounded-lg px-3 py-2 text-sm mt-2">
          {trimmed.slice(2, -2)}
        </p>
      );
      continue;
    }

    elements.push(
      <p key={key++} className="leading-relaxed">
        {renderInline(trimmed)}
      </p>
    );
  }

  flushList();
  return <>{elements}</>;
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

export default function ChatMessage({ message }: Props) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} group`}>
      {/* Avatar */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm
        ${isUser
          ? 'bg-gradient-to-br from-teal-500 to-cyan-600'
          : 'bg-gradient-to-br from-slate-700 to-slate-800'
        }`}>
        {isUser
          ? <User size={16} className="text-white" />
          : <Bot size={16} className="text-white" />
        }
      </div>

      {/* Bubble */}
      <div className={`max-w-[78%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div className={`rounded-2xl px-4 py-3 text-sm shadow-sm
          ${isUser
            ? 'bg-gradient-to-br from-teal-500 to-cyan-600 text-white rounded-tr-sm'
            : 'bg-white border border-gray-100 text-gray-700 rounded-tl-sm'
          }`}>

          {message.isLoading ? (
            <div className="flex items-center gap-1.5 py-1">
              <span className="w-2 h-2 bg-teal-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-2 h-2 bg-teal-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" />
            </div>
          ) : (
            <div className={isUser ? 'text-white' : ''}>
              {formatContent(message.content)}
            </div>
          )}
        </div>

        <span className="text-xs text-gray-400 px-1">
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}

export function DisclaimerBanner() {
  return (
    <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800">
      <AlertCircle size={14} className="flex-shrink-0 mt-0.5 text-amber-600" />
      <p>
        <strong>Medical Disclaimer:</strong> This tool provides general health information only and is not a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare professional.
      </p>
    </div>
  );
}
