/**
 * Simple Event Bus for bridging Voice Assistant actions to the rest of the application.
 */

export type VoiceActionType =
    | 'voice-analysis-complete'
    | 'voice-upload-trigger'
    | 'voice-optimize-trigger'
    | 'voice-resume-updated';

export interface VoiceEvent {
    type: VoiceActionType;
    data?: any;
}

export const voiceEvents = {
    dispatch(type: VoiceActionType, data?: any) {
        const event = new CustomEvent('voice-action', {
            detail: { type, data }
        });
        window.dispatchEvent(event);
    },

    subscribe(callback: (event: VoiceEvent) => void) {
        const handler = (e: any) => {
            callback(e.detail as VoiceEvent);
        };
        window.addEventListener('voice-action', handler);
        return () => window.removeEventListener('voice-action', handler);
    }
};
