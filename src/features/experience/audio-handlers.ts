// Server composition only: never import this module from a client component.
export const MAX_AUDIO_BYTES=3*1024*1024;
export interface AudioServices {
 authorize(request:Request):Promise<boolean>;
 allow(request:Request):Promise<boolean>;
 transcribe(file:File):Promise<string>;
 speak(text:string):Promise<Response>;
}
export async function boundedBytes(response:Response,max:number){
 const reader=response.body?.getReader();if(!reader)throw Error('Empty body');const chunks:Uint8Array[]=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>max){await reader.cancel();throw Error('Body limit');}chunks.push(value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return bytes;
}
export function createAudioHandlers(services?:AudioServices){
 function error(status:number,code:string,message:string,request_id:string){return Response.json({error:{code,message},request_id},{status,headers:{'cache-control':'no-store'}});}
 async function handle(request:Request,kind:'transcribe'|'speak'){
  const request_id=crypto.randomUUID();
  if(!services)return error(503,'AUDIO_UNAVAILABLE','Áudio aguarda integração de sessão e limite persistido. Continue por texto.',request_id);
  try{
   if(!await services.authorize(request))return error(401,'UNAUTHORIZED','Sessão inválida. Continue por texto.',request_id);
   if(!await services.allow(request))return error(429,'RATE_LIMIT','Limite de áudio atingido. Tente mais tarde ou use texto.',request_id);
   const type=request.headers.get('content-type')??'';
   if(kind==='transcribe'){
    if(!type.startsWith('multipart/form-data'))return error(422,'INVALID_AUDIO','Envie áudio multipart.',request_id);
    let bytes:Uint8Array;try{bytes=await boundedBytes(new Response(request.body),MAX_AUDIO_BYTES+65536);}catch{return error(422,'INVALID_AUDIO','Áudio excede o limite de transporte.',request_id);}
    const form=await new Request(request.url,{method:'POST',headers:{'content-type':type},body:bytes as BodyInit}).formData();const file=form.get('audio');const duration=Number(form.get('duration_seconds'));
    const mime=file instanceof File?file.type.split(';')[0]:'';
    if(!(file instanceof File)||file.size===0||file.size>MAX_AUDIO_BYTES||!Number.isFinite(duration)||duration<=0||duration>60||!['audio/webm','audio/ogg','audio/mp4','audio/mpeg','audio/wav','audio/x-wav'].includes(mime))return error(422,'INVALID_AUDIO','Áudio deve ter formato aceito, até 60 s e 3 MiB.',request_id);
    const text=await services.transcribe(file);if(!text.trim()||text.length>4000)throw Error('Invalid transcript');
    return Response.json({data:{text},request_id},{headers:{'cache-control':'no-store'}});
   }
   if(!type.startsWith('application/json'))return error(422,'INVALID_TEXT','Envie texto JSON.',request_id);
   let input:unknown;try{input=JSON.parse(new TextDecoder().decode(await boundedBytes(new Response(request.body),10000)));}catch{return error(422,'INVALID_TEXT','Texto inválido.',request_id);}
   const text=typeof input==='object'&&input!==null&&'text' in input?input.text:undefined;
   if(typeof text!=='string'||!text.trim()||text.length>1200)return error(422,'INVALID_TEXT','Síntese aceita até 1.200 caracteres. A resposta completa permanece em texto.',request_id);
   const response=await services.speak(text);if(!response.ok)throw Error('Provider failure');
   const bytes=await boundedBytes(response,MAX_AUDIO_BYTES);if(!bytes.length)throw Error('Empty speech');
   return new Response(bytes as BodyInit,{headers:{'content-type':'audio/mpeg','cache-control':'no-store','x-request-id':request_id}});
  }catch{return error(503,'AUDIO_UNAVAILABLE','Não foi possível processar o áudio. Continue por texto.',request_id);}
 }
 return {transcribe:(request:Request)=>handle(request,'transcribe'),speak:(request:Request)=>handle(request,'speak')};
}
