import {liveAudioRoute} from '@/features/experience/audio-server';
export const runtime='nodejs';
export const maxDuration=60;
export const POST=(request:Request)=>liveAudioRoute('transcribe',request);
