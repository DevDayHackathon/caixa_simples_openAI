import { afterEach, expect, it, vi } from 'vitest';
import { issueFinanceSession,FINANCE_COOKIE } from '@/features/finance/session';
const provider=vi.hoisted(()=>({transcribe:vi.fn(async()=> 'texto editável'),speak:vi.fn(async()=>new Response(new Uint8Array([1,2,3]),{headers:{'content-type':'audio/mpeg'}}))}));
const quota=vi.hoisted(()=>vi.fn(async()=>true));
vi.mock('@/features/experience/audio-provider',()=>({createOpenAIAudioProvider:()=>provider}));
vi.mock('@/features/tasks/server',()=>({checkAgentRateLimit:quota}));
import { POST as transcribe } from '@/app/api/audio/transcribe/route';
import { POST as speak } from '@/app/api/audio/speak/route';
import { GET as status } from '@/app/api/agent/status/route';
const secret='audio-shared-session-secret-with-32-chars',origin='https://demo.test';
function setup(){for(const key of ['OPENAI_API_KEY','OPENAI_MODEL','OPENAI_TRANSCRIBE_MODEL','OPENAI_TTS_MODEL','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY'])vi.stubEnv(key,'test-placeholder');vi.stubEnv('SESSION_SECRET',secret);vi.stubEnv('APP_ORIGIN',origin);return {[`cookie`]:`${FINANCE_COOKIE}=${issueFinanceSession(secret)}`,origin};}
afterEach(()=>{vi.unstubAllEnvs();vi.clearAllMocks();quota.mockResolvedValue(true);});
it('FINAL-04 uses the shared financial cookie and persisted quota before transcribing',async()=>{
 const headers=setup(),form=new FormData();form.set('audio',new File(['audio'],'speech.webm',{type:'audio/webm'}));form.set('duration_seconds','1');
 const response=await transcribe(new Request(origin+'/api/audio/transcribe',{method:'POST',headers,body:form}));
 expect(response.status).toBe(200);expect((await response.json()).data.text).toBe('texto editável');expect(quota).toHaveBeenCalledWith(expect.any(String),'audio');expect(provider.transcribe).toHaveBeenCalledTimes(1);
});
it('FINAL-04 synthesizes only authorized quota-approved text and sanitizes failures',async()=>{
 const headers={...setup(),'content-type':'application/json'},req=()=>new Request(origin+'/api/audio/speak',{method:'POST',headers,body:JSON.stringify({text:'Resposta'})});
 const response=await speak(req());expect(response.status).toBe(200);expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([1,2,3]);
 provider.speak.mockRejectedValueOnce(new Error('secret-provider-key'));const failure=await speak(req());expect(failure.status).toBe(503);expect(await failure.text()).not.toContain('secret-provider-key');
});
it('FINAL-04 rejects no session, wrong origin and exhausted quota without provider calls',async()=>{
 const headers=setup(),req=(h:Record<string,string>)=>new Request(origin+'/api/audio/speak',{method:'POST',headers:{...h,'content-type':'application/json'},body:'{"text":"oi"}'});
 expect((await speak(req({origin}))).status).toBe(401);expect((await speak(req({...headers,origin:'https://evil.test'}))).status).toBe(401);
 quota.mockResolvedValue(false);expect((await speak(req(headers))).status).toBe(429);expect(provider.speak).not.toHaveBeenCalled();
});
it('FINAL-04 exposes only configuration booleans to an authenticated session',async()=>{
 const headers=setup();const response=await status(new Request(origin+'/api/agent/status',{headers}));expect((await response.json()).data).toEqual({configured:true,voice:true});
 expect((await status(new Request(origin+'/api/agent/status'))).status).toBe(401);
});
