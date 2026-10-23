import {createAudioHandlers} from '@/features/experience/audio-handlers';
export const runtime='nodejs';
export const maxDuration=60;
export const POST=createAudioHandlers().speak;
