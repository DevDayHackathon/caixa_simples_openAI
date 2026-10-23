import { readDemoSession } from '@/features/agent/session';
export const runtime='nodejs';
export async function GET(request:Request){
 const request_id=crypto.randomUUID();
 if(!readDemoSession(request))return Response.json({error:{code:'UNAUTHORIZED',message:'Sessão inválida.'},request_id},{status:401});
 const configured=!!(process.env.OPENAI_API_KEY&&process.env.OPENAI_MODEL&&process.env.SUPABASE_URL&&process.env.SUPABASE_SERVICE_ROLE_KEY);
 return Response.json({data:{configured,voice:configured&&!!(process.env.OPENAI_TRANSCRIBE_MODEL&&process.env.OPENAI_TTS_MODEL)},request_id},{headers:{'cache-control':'no-store'}});
}
