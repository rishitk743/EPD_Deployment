/// <reference types="vite/client" />
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface ChatAction {
  type: string;
  data?: any;
}

export interface ChatResponse {
  reply: string;
  transcript?: string;
  audio_base64?: string;
  action?: ChatAction;
}

export const chatApi = {
  async sendVoiceMessage(audioBlob: Blob, sessionId: string): Promise<ChatResponse> {
    const formData = new FormData();

    // Determine extension from mime type
    const mimeType = audioBlob.type;
    let extension = 'webm';
    if (mimeType.includes('ogg')) extension = 'ogg';
    if (mimeType.includes('mp4')) extension = 'mp4';
    if (mimeType.includes('wav')) extension = 'wav';

    formData.append('audio', audioBlob, `recording.${extension}`);
    formData.append('session_id', sessionId);

    const response = await fetch(`${API_BASE_URL}/chat/voice`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Voice chat failed: ${response.statusText}`);
    }

    return response.json();
  },

  async sendTextMessage(message: string, sessionId: string, userId?: string): Promise<ChatResponse> {
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        session_id: sessionId,
        user_id: userId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Chat failed: ${response.statusText}`);
    }

    return response.json();
  },

  async uploadResumeInChat(file: File, sessionId: string): Promise<ChatResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('session_id', sessionId);

    const response = await fetch(`${API_BASE_URL}/chat/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Chat upload failed: ${response.statusText}`);
    }

    return response.json();
  },
};
