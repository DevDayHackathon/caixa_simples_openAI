import OpenAI from 'openai';
// Only the server-side composition may create this adapter. No credentials in props.
export function createOpenAIAudioProvider(){
 const {OPENAI_API_KEY,OPENAI_TRANSCRIBE_MODEL,OPENAI_TTS_MODEL}=process.env;
 if(!OPENAI_API_KEY||!OPENAI_TRANSCRIBE_MODEL||!OPENAI_TTS_MODEL)throw Error('Audio provider not configured');
 const client=new OpenAI({apiKey:OPENAI_API_KEY,maxRetries:0,timeout:25000});
 return {
  async transcribe(file:File){const result=await client.audio.transcriptions.create({file,model:OPENAI_TRANSCRIBE_MODEL});return result.text;},
  async speak(text:string){return client.audio.speech.create({model:OPENAI_TTS_MODEL,input:text,voice:'alloy',response_format:'mp3'});},
 };
}
