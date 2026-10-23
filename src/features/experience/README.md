# Experiência e voz de Jecky

Branch `feat/jecky-experiencia-voz`, base `eaa8068e400dab48f929224e9ac77c2c033e2a41`.

Node 24; `npm ci`, `npm run dev`, abrir http://localhost:3000. Verificação: `npm run check`; Chromium via `npm run test:e2e:install` se necessário. Sem credenciais para os mocks.

A composição está em `workspace.tsx`. FinancePort e AgentPort são injetáveis. O painel apenas formata valores recebidos; não projeta saldo. A comparação F1 estática é o único override financeiro da página: rec-1 para 01/11/2026. Importar, alterar previsão e decidir com persistência dependem dos adaptadores de Daniel/Bruno em T21. Os mocks não confirmam mutações. O turno simulado declara que nenhuma IA foi chamada.

Decisões usam mensagens explícitas em AgentPort.turn, com ID/alvo/versão da proposta. Contratos v1 não oferecem uma operação estruturada de decisão. A integração deve validar essas intenções no agente; a UI não muda estado local para accepted/dismissed por conta própria.

## Áudio

`Voice` captura em turnos com MediaRecorder, interrompe em 60 s ou 3 MiB, descarta excedentes e libera tracks/timers ao sair. Transcrição preenche o editor; não envia ao agente. A gravação é binária multipart (`audio`, `duration_seconds`), sem armazenamento permanente. O endpoint valida formato, bytes e duração declarada pelo capturador; não realiza análise forense da duração de um arquivo arbitrário. Síntese aceita `{text}` até 1.200 caracteres, retorna áudio MP3 até 3 MiB; resposta inteira continua no texto.

`createAudioHandlers(services)` é a composição server-side testada por requisições HTTP em memória. `services.authorize` deve validar a sessão demo assinada e origem; `services.allow` deve adquirir quota persistida compartilhada de áudio por sessão no banco. Não substituir por memória do processo ou autorização pública.

As rotas `/api/audio/transcribe` e `/api/audio/speak` retornam **503 AUDIO_UNAVAILABLE** até T21 conectar essas duas dependências. A base T1 não tem implementações compartilhadas de sessão e rate limit. Foi preservada a fronteira das áreas: nenhuma sessão, migração ou contrato alheio foi inventado. Configurar apenas uma chave não habilita uma rota pública com cobrança.

O adaptador `createOpenAIAudioProvider()` usa apenas no servidor `OPENAI_API_KEY`, `OPENAI_TRANSCRIBE_MODEL`, `OPENAI_TTS_MODEL`. Sem modelo default ou segredo NEXT_PUBLIC. Não foi feita chamada real à API. Na integração server-side, combinar esse adaptador com `authorize` e `allow` e injetá-los no handler. Falhas externas são sanitizadas, sem mensagem bruta do provedor.

Referências consultadas em 23/10/2026: [transcrição](https://developers.openai.com/api/docs/guides/speech-to-text) e [síntese](https://developers.openai.com/api/reference/typescript/resources/audio/subresources/speech/methods/create). Limites do aplicativo são os da spec e menores que os do provedor. Nenhum serviço adicional ou deploy.
