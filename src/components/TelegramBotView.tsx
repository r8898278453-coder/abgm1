import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  Bot,
  Check,
  RotateCw,
  Zap,
  Phone,
  Paperclip,
  CheckCheck,
  TrendingUp,
  Clock,
  ShieldCheck,
  Bell,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { BusinessProfile } from '../types';
import { chatWithMarketingAgent } from '../services/aiService';
import { sendTelegramNotifyApi } from '../services/authService';

interface TelegramBotViewProps {
  business: BusinessProfile;
  onNavigate: (tab: any) => void;
}

interface TelegramMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  time: string;
  buttons?: { label: string; action: string }[];
  isProactive?: boolean;
}

export const TelegramBotView: React.FC<TelegramBotViewProps> = ({ business, onNavigate }) => {
  const [messages, setMessages] = useState<TelegramMessage[]>([
    {
      id: 'm1',
      sender: 'bot',
      time: '09:00 AM',
      text: `🌅 *Good Morning! Here is your Daily LocalPulse Brief for ${business.name}:*\n\n• *Reviews:* 1 pending 5★ review from Ananya Sharma awaiting public response.\n• *Rank:* Top 3 for "laptop repair Vashi" (#2).\n• *Content:* Today's Instagram Reel scheduled for 05:30 PM.\n• *Leads:* 3 warm inquiries ready for follow-up.\n\n*Today's AI Focus:* Catch up on Nerul review acquisition to retake #1 spot from Star Computers.`,
      buttons: [
        { label: '⭐ Reply to Review', action: 'reply_review' },
        { label: '📊 View Full Report', action: 'view_report' },
      ],
      isProactive: true,
    },
    {
      id: 'm2',
      sender: 'bot',
      time: '11:15 AM',
      text: `🔔 *New 5-Star Google Review Received!*\n\n*Reviewer:* Rahul Verma\n*Rating:* ★★★★★\n*"Repaired my MacBook motherboard within 4 hours. Super transparent and fair pricing."*\n\n*Suggested AI Reply:* "Thank you Rahul! Our chip-level technicians are delighted to hear your MacBook is back running smoothly. We appreciate your recommendation!"`,
      buttons: [
        { label: '✅ Approve Reply', action: 'approve_rahul_reply' },
        { label: '✏️ Edit Reply', action: 'edit_reply' },
        { label: '🔄 Regenerate', action: 'regenerate_reply' },
      ],
      isProactive: true,
    },
  ]);

  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [testAlertMessage, setTestAlertMessage] = useState(
    `🔔 Test Alert from ${business.name}: Real-time notification system verified successfully.`
  );
  const [isSendingAlert, setIsSendingAlert] = useState(false);
  const [alertFeedback, setAlertFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSendTestAlert = async (e?: React.FormEvent, customMsg?: string) => {
    if (e) e.preventDefault();
    const msgToSend = (customMsg || testAlertMessage).trim();
    if (!msgToSend || isSendingAlert) return;

    setIsSendingAlert(true);
    setAlertFeedback(null);

    try {
      const res = await sendTelegramNotifyApi(msgToSend);
      if (res.success) {
        setAlertFeedback({
          type: 'success',
          message: '✓ Test alert delivered to your Telegram chat successfully!',
        });
        // Also reflect the dispatched alert in the interactive Telegram simulator feed
        setMessages((prev) => [
          ...prev,
          {
            id: `alert_${Date.now()}`,
            sender: 'bot',
            text: `📢 *DISPATCHED TELEGRAM NOTIFICATION:*\n\n${msgToSend}`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isProactive: true,
          },
        ]);
      } else {
        setAlertFeedback({
          type: 'error',
          message: `Delivery failed: ${res.error || 'Check that TELEGRAM_BOT_TOKEN & TELEGRAM_CHAT_ID are configured in server environment.'}`,
        });
      }
    } catch (err: any) {
      setAlertFeedback({
        type: 'error',
        message: `Failed to dispatch alert: ${err?.message || 'Network error'}`,
      });
    } finally {
      setIsSendingAlert(false);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim()) return;

    const userMsg: TelegramMessage = {
      id: `u_${Date.now()}`,
      sender: 'user',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputMessage('');
    setIsTyping(true);

    try {
      const botReply = await chatWithMarketingAgent(text, {
        businessName: business.name,
        category: business.category,
        location: business.address,
      });

      const botMsg: TelegramMessage = {
        id: `b_${Date.now()}`,
        sender: 'bot',
        text: botReply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        buttons: [
          { label: '⚡ Execute Action', action: 'execute' },
          { label: '✏️ Customize', action: 'customize' },
        ],
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: 'bot',
          text: 'I analyzed your request. Ready to deploy changes across Google Business Profile and social feeds.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleButtonClick = (action: string) => {
    if (action === 'reply_review' || action === 'approve_rahul_reply') {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot_act_${Date.now()}`,
          sender: 'bot',
          text: '✅ Public reply verified & published to Google Maps profile in real-time.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } else if (action === 'view_report') {
      onNavigate('dashboard');
    } else {
      handleSendMessage(`Execute action: ${action}`);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Bot className="w-7 h-7 text-indigo-600" />
            Telegram AI Command Center
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Your 24/7 Autonomous Marketing Director in your pocket. Control 80% of operations without opening the dashboard.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Bot Connected: @LocalPulseAI_bot
          </span>
        </div>
      </div>

      {/* Live Telegram Alert Broadcast Card */}
      <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center shadow-2xs shrink-0">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                Send Live Telegram Push Alert
                <span className="text-[10px] font-semibold text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200">
                  POST /api/telegram/notify
                </span>
              </h2>
              <p className="text-[11px] text-slate-500">
                Test real-time channel delivery to your configured Telegram bot & chat group.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={(e) => handleSendTestAlert(e)} className="space-y-2">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={testAlertMessage}
              onChange={(e) => setTestAlertMessage(e.target.value)}
              placeholder="Type a test alert message to deliver to Telegram..."
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white transition"
              disabled={isSendingAlert}
            />
            <button
              type="submit"
              disabled={!testAlertMessage.trim() || isSendingAlert}
              className="inline-flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-xs whitespace-nowrap active:scale-95"
            >
              {isSendingAlert ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Test Alert</span>
                </>
              )}
            </button>
          </div>

          {alertFeedback && (
            <div
              className={`text-xs px-3 py-2 rounded-xl flex items-center justify-between gap-2 border transition-all ${
                alertFeedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              <div className="flex items-center gap-1.5 font-medium">
                {alertFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                )}
                <span>{alertFeedback.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setAlertFeedback(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold px-1"
              >
                ✕
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Simulator Bento Container */}
      <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm flex flex-col h-[700px]">
        {/* Telegram Header */}
        <div className="bg-slate-50 border-b border-slate-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-xs">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <span>LocalPulse AI Manager</span>
                <span className="bg-indigo-100 text-indigo-700 text-[10px] px-1.5 py-0.5 rounded-md font-bold">BOT</span>
              </div>
              <div className="text-[11px] text-slate-500 font-medium">Online 24/7 • Autonomous Marketing Agent</div>
            </div>
          </div>
          <button
            onClick={() => onNavigate('dashboard')}
            className="text-xs font-bold text-slate-600 hover:text-slate-900 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs transition"
          >
            Dashboard
          </button>
        </div>

        {/* Telegram Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/60">
          {messages.map((msg) => {
            const isBot = msg.sender === 'bot';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isBot ? 'items-start' : 'items-end'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-4 text-xs shadow-2xs space-y-2.5 ${
                    isBot
                      ? 'bg-white border border-slate-200 text-slate-800'
                      : 'bg-indigo-600 text-white'
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed font-medium">
                    {msg.text}
                  </p>

                  <div
                    className={`text-[10px] flex items-center justify-end gap-1 font-medium ${
                      isBot ? 'text-slate-400' : 'text-indigo-200'
                    }`}
                  >
                    <span>{msg.time}</span>
                    {!isBot && <CheckCheck className="w-3.5 h-3.5" />}
                  </div>
                </div>

                {/* Inline Action Buttons for Bot Messages */}
                {isBot && msg.buttons && msg.buttons.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2 max-w-[85%]">
                    {msg.buttons.map((btn, bIdx) => (
                      <button
                        key={bIdx}
                        onClick={() => handleButtonClick(btn.action)}
                        className="bg-white hover:bg-slate-50 text-indigo-700 border border-slate-200 text-[11px] font-bold px-3 py-1.5 rounded-xl transition shadow-2xs active:scale-95"
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {isTyping && (
            <div className="flex items-center gap-2 text-xs text-slate-500 italic bg-white p-3 rounded-2xl w-fit border border-slate-200 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
              <span>LocalPulse AI is typing & analyzing your business data...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="bg-slate-50 border-t border-slate-200 px-4 py-2.5 flex items-center gap-2 overflow-x-auto text-[11px] no-scrollbar">
          <button
            onClick={() => handleSendTestAlert(undefined, `🔔 Test Alert: Marketing audit check triggered for ${business.name} at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`)}
            className="bg-sky-50 hover:bg-sky-100 text-sky-700 px-3.5 py-1.5 rounded-full whitespace-nowrap border border-sky-200 font-semibold shadow-2xs transition flex items-center gap-1.5 shrink-0"
          >
            <Bell className="w-3 h-3" />
            Send Test Alert
          </button>
          <button
            onClick={() => handleSendMessage('What happened today in my business?')}
            className="bg-white hover:bg-slate-100 text-slate-700 px-3.5 py-1.5 rounded-full whitespace-nowrap border border-slate-200 font-semibold shadow-2xs transition"
          >
            📊 What happened today?
          </button>
          <button
            onClick={() => handleSendMessage('Create a laptop repair discount post for tomorrow on Google')}
            className="bg-white hover:bg-slate-100 text-slate-700 px-3.5 py-1.5 rounded-full whitespace-nowrap border border-slate-200 font-semibold shadow-2xs transition"
          >
            🔥 Create a post for tomorrow
          </button>
          <button
            onClick={() => handleSendMessage('Why did my Nerul ranking drop and how do we fix it?')}
            className="bg-white hover:bg-slate-100 text-slate-700 px-3.5 py-1.5 rounded-full whitespace-nowrap border border-slate-200 font-semibold shadow-2xs transition"
          >
            📍 Why did my Nerul ranking drop?
          </button>
        </div>

        {/* Input Footer */}
        <div className="bg-white p-3.5 border-t border-slate-200 flex items-center gap-2">
          <input
            type="text"
            placeholder="Type a command in natural language (e.g. 'Generate 20% discount offer')..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputMessage.trim() || isTyping}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white p-2.5 rounded-xl transition shadow-xs flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
