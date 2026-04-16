import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router';
import { v4 as uuidv4 } from 'uuid';
import { chatApi } from '../../services/chatApi';
import { useAudioRecorder } from './useAudioRecorder';
import { voiceEvents } from '../lib/voiceEvents';

export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking';

export const useVoiceConversation = (userId?: string) => {
  const [state, setState] = useState<VoiceState>('idle');
  const [messages, setMessages] = useState<any[]>([]);
  const [sessionId] = useState(() => uuidv4());

  const processingRef = useRef(false);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const speakFallback = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return;

    // Safety: Cancel any existing speech to prevent overlapping
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    // Select a premium English voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v =>
      (v.name.includes('Google') || v.name.includes('Premium')) && v.lang.startsWith('en')
    ) || voices.find(v => v.lang.startsWith('en'));

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => setState('speaking');
    utterance.onend = () => setState('idle');
    utterance.onerror = () => setState('idle');

    window.speechSynthesis.speak(utterance);
  }, []);

  const playAudio = useCallback((base64Audio: string) => {
    return new Promise<void>((resolve) => {
      if (!audioPlayerRef.current) {
        audioPlayerRef.current = new Audio();
      }

      const audio = audioPlayerRef.current;
      audio.src = `data:audio/wav;base64,${base64Audio}`;

      audio.onended = () => {
        setState('idle');
        resolve();
      };

      setState('speaking');
      audio.play().catch(err => {
        console.error('Groq audio playback failed, falling back to Web Speech', err);
        // Fallback is handled by the caller if this promise fails or if base64 is null
        resolve();
      });
    });
  }, []);

  const navigate = useNavigate();

  const handleVoiceResponse = useCallback(async (blob: Blob) => {
    // Guard: Prevent double-processing
    if (processingRef.current) return;
    processingRef.current = true;

    setState('processing');
    try {
      const response = await chatApi.sendVoiceMessage(blob, sessionId);

      setMessages(prev => [...prev,
      { role: 'user', content: response.transcript || " (No speech detected) " },
      { role: 'assistant', content: response.reply, action: response.action }
      ]);

      // NEW: Bridge Voice Actions to Global App Events
      if (response.action) {
        const { type, data } = response.action;

        if (type === 'analysis_result') {
          voiceEvents.dispatch('voice-analysis-complete', data);
        } else if (type === 'request_upload') {
          voiceEvents.dispatch('voice-upload-trigger');
        } else if (type === 'optimization_result') {
          // Automatic navigation for optimization flow
          navigate('/optimize', {
            state: {
              resumeText: data.text,
              analysisResults: data.structured
            }
          });
        }
      }

      if (response.audio_base64) {
        await playAudio(response.audio_base64);
      } else {
        // Fallback to browser TTS if Groq TTS failed/was null
        speakFallback(response.reply);
      }
    } catch (err) {
      console.error('Voice chat failed', err);
      speakFallback("I'm sorry, I'm having trouble connecting right now.");
    } finally {
      processingRef.current = false;
    }
  }, [sessionId, playAudio, speakFallback, navigate]);

  // Pass handleVoiceResponse to useAudioRecorder for direct callback trigger
  const { isRecording, startRecording, stopRecording, clearAudio } = useAudioRecorder(handleVoiceResponse);

  const toggleListening = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      // Clear any ongoing speech
      if (state === 'speaking') {
        if (audioPlayerRef.current) audioPlayerRef.current.pause();
        window.speechSynthesis.cancel();
      }

      clearAudio();
      startRecording();
      setState('listening');
    }
  }, [isRecording, startRecording, stopRecording, clearAudio, state]);

  return {
    state,
    messages,
    isRecording,
    toggleListening,
    sessionId
  };
};
