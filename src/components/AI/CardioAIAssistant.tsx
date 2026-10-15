import React, { useState, useRef, useEffect } from 'react';
import { SimulationState } from '../../types/cardiac';
import { 
  Bot, 
  Send, 
  RotateCcw, 
  Sparkles, 
  User, 
  AlertCircle, 
  Sliders, 
  BookOpen, 
  HelpCircle,
  ShieldCheck,
  ChevronRight,
  Copy,
  Check
} from 'lucide-react';

interface CardioAIAssistantProps {
  simulationState: SimulationState;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  isError?: boolean;
}

export const CardioAIAssistant: React.FC<CardioAIAssistantProps> = ({
  simulationState,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: `Hello! I am **CardioAI Assistant**, your interactive cardiovascular physiology mentor. 

I'm monitoring your 3D dashboard parameters in real time (currently **${simulationState.heartRate} BPM**, **${simulationState.systolicBP}/${simulationState.diastolicBP} mmHg**, and **${simulationState.cardiacOutput.toFixed(2)} L/min** Cardiac Output).

Feel free to ask me anything about heart anatomy, blood circulation circuits, ECG waveforms, or how adjusting your simulation sliders alters cardiac hemodynamics!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [detailLevel, setDetailLevel] = useState<'concise' | 'detailed'>('concise');
  const [showContextDrawer, setShowContextDrawer] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const suggestedQuestions = [
    'What is cardiac output?',
    'Explain the path of blood through the heart.',
    'Why does stroke volume affect cardiac output?',
    'Explain the current simulation values.',
    'What is the difference between systolic and diastolic pressure?',
    'What causes the P, QRS, and T waves on the ECG?',
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (questionText?: string) => {
    const textToSend = (questionText || input).trim();
    if (!textToSend || isLoading) return;

    const userMessage: ChatMessage = {
      id: 'user-' + Date.now(),
      role: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Build conversation history for API
      const historyPayload = messages
        .filter((m) => !m.isError)
        .map((m) => ({
          role: m.role,
          text: m.text,
        }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          history: historyPayload,
          detailLevel: detailLevel,
          context: {
            heartRate: simulationState.heartRate,
            strokeVolume: simulationState.strokeVolume,
            systolicBP: simulationState.systolicBP,
            diastolicBP: simulationState.diastolicBP,
            bloodVolume: simulationState.bloodVolume,
            cardiacOutput: simulationState.cardiacOutput,
            pulsePressure: simulationState.pulsePressure,
            meanArterialPressure: simulationState.meanArterialPressure,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Server responded with an error');
      }

      const botMessage: ChatMessage = {
        id: 'bot-' + Date.now(),
        role: 'model',
        text: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err: any) {
      console.error('Chat error:', err);
      const errorMessage: ChatMessage = {
        id: 'err-' + Date.now(),
        role: 'model',
        text: `Error connecting to CardioAI: ${err.message || 'Unable to contact server'}. Please ensure your GEMINI_API_KEY is configured in the environment.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 'welcome-reset',
        role: 'model',
        text: `Conversation cleared. I am ready to answer your questions with current simulation state (**${simulationState.heartRate} BPM**, **${simulationState.cardiacOutput.toFixed(2)} L/min**).`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="bg-[#101D2D] border border-[#37D6F5]/20 rounded-2xl shadow-xl flex flex-col h-[650px] overflow-hidden">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-slate-700/60 bg-[#0B1726]/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#37D6F5]/20 to-[#FF5C70]/20 border border-[#37D6F5]/40 flex items-center justify-center shadow-md">
            <Bot className="w-5 h-5 text-[#37D6F5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-tech font-bold text-white tracking-wide">
                CardioAI Assistant
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-[#37D6F5] border border-cyan-500/20">
                GEMINI 3.8 FLASH
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Cardiovascular physiology tutor grounded in live telemetry
            </p>
          </div>
        </div>

        {/* Controls: Detail Level, Context Inspector, Clear */}
        <div className="flex items-center gap-2">
          {/* Detail mode toggle */}
          <div className="flex items-center bg-[#07111F] p-1 rounded-xl border border-slate-800 text-xs font-mono">
            <button
              onClick={() => setDetailLevel('concise')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                detailLevel === 'concise'
                  ? 'bg-[#37D6F5] text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Concise
            </button>
            <button
              onClick={() => setDetailLevel('detailed')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                detailLevel === 'detailed'
                  ? 'bg-[#37D6F5] text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Detailed
            </button>
          </div>

          {/* Context Inspector Button */}
          <button
            onClick={() => setShowContextDrawer(!showContextDrawer)}
            className={`p-2 rounded-xl border text-xs font-mono transition cursor-pointer flex items-center gap-1 ${
              showContextDrawer
                ? 'bg-[#37D6F5]/20 text-[#37D6F5] border-[#37D6F5]/40'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
            title="Inspect Telemetry Injected into AI"
          >
            <Sliders className="w-4 h-4" />
            <span className="hidden sm:inline">Telemetry Context</span>
          </button>

          {/* Clear Chat */}
          <button
            onClick={handleClearChat}
            className="p-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            title="Clear Chat History"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Live Context Telemetry Drawer (collapsible) */}
      {showContextDrawer && (
        <div className="bg-[#07111F] border-b border-[#37D6F5]/20 p-3 text-xs font-mono grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-300">
          <div className="p-1.5 bg-[#101D2D] rounded border border-slate-800">
            <span className="text-slate-500 block text-[10px]">HEART RATE:</span>
            <span className="text-[#FF5C70] font-bold">{simulationState.heartRate} BPM</span>
          </div>
          <div className="p-1.5 bg-[#101D2D] rounded border border-slate-800">
            <span className="text-slate-500 block text-[10px]">STROKE VOL:</span>
            <span className="text-[#37D6F5] font-bold">{simulationState.strokeVolume} mL</span>
          </div>
          <div className="p-1.5 bg-[#101D2D] rounded border border-slate-800">
            <span className="text-slate-500 block text-[10px]">BLOOD PRESSURE:</span>
            <span className="text-white font-bold">{simulationState.systolicBP}/{simulationState.diastolicBP} mmHg</span>
          </div>
          <div className="p-1.5 bg-[#101D2D] rounded border border-slate-800">
            <span className="text-slate-500 block text-[10px]">CARDIAC OUTPUT:</span>
            <span className="text-emerald-400 font-bold">{simulationState.cardiacOutput.toFixed(2)} L/min</span>
          </div>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs ${
                  isUser
                    ? 'bg-[#37D6F5]/20 text-[#37D6F5] border border-[#37D6F5]/40'
                    : msg.isError
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                    : 'bg-[#FF5C70]/20 text-[#FF5C70] border border-[#FF5C70]/40'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`max-w-[85%] rounded-2xl p-3.5 shadow-md relative group ${
                  isUser
                    ? 'bg-[#1A2E44] text-slate-100 border border-cyan-500/30 rounded-tr-none'
                    : msg.isError
                    ? 'bg-rose-950/30 text-rose-200 border border-rose-800/60 rounded-tl-none'
                    : 'bg-[#0B1726] text-slate-200 border border-slate-800 rounded-tl-none'
                }`}
              >
                <div className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                  {msg.text}
                </div>

                <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-700/40 text-[10px] font-mono text-slate-400">
                  <span>{msg.timestamp}</span>
                  <button
                    onClick={() => handleCopy(msg.id, msg.text)}
                    className="opacity-0 group-hover:opacity-100 transition p-1 hover:text-white cursor-pointer"
                    title="Copy message"
                  >
                    {copiedId === msg.id ? <Check className="w-3 h-3 text-[#10B981]" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-[#FF5C70]/20 border border-[#FF5C70]/40 flex items-center justify-center text-[#FF5C70]">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-[#0B1726] border border-slate-800 rounded-2xl rounded-tl-none p-3.5 text-xs text-slate-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#37D6F5] animate-ping" />
              <span>CardioAI is analyzing current hemodynamics...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompt Buttons */}
      <div className="px-4 py-2 border-t border-slate-800/80 bg-[#07111F]/70 overflow-x-auto">
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-[11px] font-mono text-slate-500 shrink-0 flex items-center gap-1">
            <HelpCircle className="w-3 h-3 text-[#37D6F5]" /> Ask:
          </span>
          {suggestedQuestions.map((q) => (
            <button
              key={q}
              onClick={() => handleSend(q)}
              disabled={isLoading}
              className="shrink-0 px-2.5 py-1 rounded-lg text-slate-300 bg-[#101D2D] hover:bg-[#1B2C42] hover:text-[#37D6F5] border border-slate-800 text-[11px] font-medium transition cursor-pointer disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Input Form */}
      <div className="p-3 border-t border-slate-800 bg-[#0B1726]">
        <div className="flex items-end gap-2 bg-[#07111F] border border-slate-700/80 rounded-xl p-2 focus-within:border-[#37D6F5] transition">
          <textarea
            ref={textareaRef}
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask CardioAI anything about heart physiology, ECG waves, or current parameters..."
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 resize-none outline-none font-sans"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="p-2.5 bg-[#37D6F5] hover:bg-[#20b8d6] disabled:opacity-40 text-slate-950 font-bold rounded-lg transition cursor-pointer shrink-0"
            title="Send Message (Enter)"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        {/* Safety Disclaimer Footer */}
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 px-1 mt-2">
          <span>Press Enter to send, Shift+Enter for newline</span>
          <span className="flex items-center gap-1 text-slate-400">
            <ShieldCheck className="w-3 h-3 text-[#10B981]" />
            Educational Mentor · Not for Clinical Diagnosis
          </span>
        </div>
      </div>
    </div>
  );
};
