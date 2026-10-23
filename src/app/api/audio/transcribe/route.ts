import {createAudioHandlers} from '@/features/experience/audio-handlers';
export const runtime='nodejs';
export const maxDuration=60;
// T21 wires the signed demo session and persistent limiter before enabling providers.
export const POST=createAudioHandlers().transcribe;
