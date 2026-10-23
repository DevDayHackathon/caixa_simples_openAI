export const AUDIO_LIMIT=3*1024*1024;
export interface RecorderLike {
 state:string;mimeType:string;
 ondataavailable:((event:{data:Blob})=>void)|null;
 onstop:(()=>void)|null;onerror:(()=>void)|null;
 start(timeslice:number):void;stop():void;
}
export function captureRecording(recorder:RecorderLike,stream:Pick<MediaStream,'getTracks'>,onFinish:(blob:Blob,seconds:number)=>void,onError:(message:string)=>void){
 const chunks:Blob[]=[];let size=0,failed=false,closed=false;const started=Date.now();
 const timer=setTimeout(stop,60000);
 function release(){clearTimeout(timer);stream.getTracks().forEach(track=>track.stop());}
 function fail(message:string){failed=true;onError(message);stop();}
 function stop(){if(recorder.state!=='inactive')recorder.stop();release();}
 recorder.ondataavailable=({data})=>{if(closed||failed)return;if(size+data.size>AUDIO_LIMIT){fail('Gravação chegou ao limite de 3 MiB. Continue por texto.');return;}size+=data.size;chunks.push(data);if(size===AUDIO_LIMIT)stop();};
 recorder.onstop=()=>{release();if(closed)return;closed=true;const seconds=Math.min(60,(Date.now()-started)/1000);if(!failed&&size>0&&seconds>0)onFinish(new Blob(chunks,{type:recorder.mimeType}),seconds);else if(!failed)onError('Gravação vazia. Continue por texto.');};
 recorder.onerror=()=>fail('Falha ao gravar. Continue por texto.');
 try{recorder.start(250);}catch{fail('Não foi possível iniciar a gravação. Continue por texto.');}
 return {stop,cancel(){failed=true;closed=true;stop();}};
}
