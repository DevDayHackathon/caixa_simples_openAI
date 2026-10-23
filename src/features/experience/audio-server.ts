import { readDemoSession, isSameOrigin } from '@/features/agent/session';
import { checkAgentRateLimit } from '@/features/tasks/server';
import { createAudioHandlers } from './audio-handlers';
import { createOpenAIAudioProvider } from './audio-provider';

export function liveAudioRoute(kind:'transcribe'|'speak',request:Request){
 if(!process.env.OPENAI_API_KEY||!process.env.OPENAI_TRANSCRIBE_MODEL||!process.env.OPENAI_TTS_MODEL)return createAudioHandlers()[kind](request);
 const handlers=createAudioHandlers({
  async authorize(req){return !!readDemoSession(req)&&isSameOrigin(req);},
  async allow(req){const session=readDemoSession(req);return !!session&&await checkAgentRateLimit(session.sessionId,'audio');},
  transcribe:file=>createOpenAIAudioProvider().transcribe(file),
  speak:text=>createOpenAIAudioProvider().speak(text),
 });
 return handlers[kind](request);
}
