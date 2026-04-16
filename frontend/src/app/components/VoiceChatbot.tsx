import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, X, Send, User, Bot, AlertCircle, FileUp, Loader2, File } from 'lucide-react';
import { useVoiceConversation, VoiceState } from '../hooks/useVoiceConversation';
import { chatApi } from '../../services/chatApi';
import { voiceEvents } from '../lib/voiceEvents';
import { cn } from '../lib/utils';
import { Button } from './Button';

export function VoiceChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const { state, messages, toggleListening, isRecording, sessionId } = useVoiceConversation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const getStateColor = (s: VoiceState) => {
    switch (s) {
      case 'listening': return 'bg-red-500';
      case 'processing': return 'bg-yellow-500';
      case 'speaking': return 'bg-teal-500';
      default: return 'bg-teal-600';
    }
  };

  const getStateText = (s: VoiceState) => {
    switch (s) {
      case 'listening': return 'Listening...';
      case 'processing': return 'Thinking...';
      case 'speaking': return 'Speaking...';
      default: return 'Tap to start talking';
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const resp = await chatApi.uploadResumeInChat(file, sessionId);
      if (resp.action?.type === 'upload_success') {
        voiceEvents.dispatch('voice-resume-updated', {
          text: resp.action.data.text,
          filename: resp.action.data.filename
        });
      }
    } catch (err) {
      console.error('File upload via voice failed', err);
    } finally {
      setIsUploading(false);
    }
  };

  // Listen for the AI suggesting an upload
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.action?.type === 'request_upload') {
      fileInputRef.current?.click();
    }
  }, [messages]);

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 w-16 h-16 bg-[#14B8A6] text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-40"
        aria-label="Open Voice Assistant"
      >
        <Mic className="w-8 h-8" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="voice-assistant-title"
          >
            <div className="bg-white w-full max-w-2xl h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden relative">
              {/* Header */}
              <div className="bg-[#14B8A6] p-4 flex items-center justify-between text-white">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Mic className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 id="voice-assistant-title" className="font-semibold">Voice Assistant</h2>
                    <p className="text-xs opacity-80">RAG-Powered AI Expert</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  aria-label="Close Assistant"
                >
                  <X />
                </button>
              </div>

              {/* Chat Content */}
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50"
              >
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-60">
                    <Bot className="w-16 h-16 text-teal-600" />
                    <div>
                      <h3 className="text-lg font-medium">Hello there!</h3>
                      <p className="text-sm max-w-xs">I'm your AI resume expert. You can speak to me about uploading, analyzing, or optimizing your resume.</p>
                    </div>
                  </div>
                ) : (
                  messages.map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={cn(
                        "flex gap-3 max-w-[85%]",
                        msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                        msg.role === 'user' ? "bg-teal-100" : "bg-blue-100"
                      )}>
                        {msg.role === 'user' ? <User size={16} className="text-teal-700" /> : <Bot size={16} className="text-blue-700" />}
                      </div>
                      <div className={cn(
                        "p-3 rounded-2xl text-sm shadow-sm",
                        msg.role === 'user'
                          ? "bg-teal-600 text-white rounded-tr-none"
                          : "bg-white text-gray-800 rounded-tl-none border border-gray-100"
                      )}>
                        {msg.content}

                        {/* Inline Actions if any */}
                        {msg.action && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            {msg.action.type === 'analysis_result' && (
                              <div className="space-y-1">
                                <span className="text-xs font-bold text-teal-600">ATS SCORE: {msg.action.data.ats_score}%</span>
                              </div>
                            )}
                            {msg.action.type === 'download_ready' && (
                              <Button size="sm" className="w-full mt-1">Download DOCX</Button>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>

              {/* Voice Interaction Area */}
              <div className="p-8 border-t bg-white flex flex-col items-center gap-4">
                <div className="relative">
                  {/* Pulsating Rings for Different States */}
                  {state !== 'idle' && (
                    <motion.div
                      animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className={cn("absolute inset-0 rounded-full blur-xl", getStateColor(state))}
                    />
                  )}

                  <button
                    onClick={toggleListening}
                    disabled={state === 'processing'}
                    className={cn(
                      "relative w-24 h-24 rounded-full flex items-center justify-center text-white shadow-xl transition-all active:scale-95 disabled:opacity-50",
                      getStateColor(state)
                    )}
                    aria-label={isRecording ? "Stop Listening" : "Start Speaking"}
                  >
                    {state === 'processing' ? (
                      <Loader2 className="w-10 h-10 animate-spin" />
                    ) : (
                      <Mic className={cn("w-10 h-10", isRecording && "animate-pulse")} />
                    )}
                  </button>
                </div>

                <div className="text-center">
                  <p className="font-medium text-gray-800">{getStateText(state)}</p>
                  <p className="text-xs text-gray-500 mt-1">Try saying: "How is my resume score?"</p>
                </div>
              </div>
              {/* Hidden File Input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                accept=".pdf,.docx"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
