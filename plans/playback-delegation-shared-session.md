# Playback compartilhado com usuários delegados

## Contrato

O playback continua pertencendo ao proprietário. Uma delegação concede controle
do dispositivo controlador atual, mas não transfere a propriedade do estado nem
torna o usuário delegado controlador de progresso.

Uma `PlaybackSession` representa o snapshot persistido do playback próprio ou
do playback de um proprietário compartilhado com o usuário atual. Ela contém
proprietário, playlist/faixa, status, posição, versão, dispositivo controlador,
estado de conexão e se é compartilhada.

`GET /playback/sessions` retorna apenas snapshots ativos (`video_id` não vazio):
o playback próprio e os playbacks de proprietários que delegaram o dispositivo
controlador ao usuário. O retorno inclui `session_id`, `owner_id`,
`owner_name`, `playlist_id`, `track`, status, posição, versão,
`controller_device_id` e `controller_device_name`.

`/ws/playback` aceita `owner_id` opcional. Sem ele, a assinatura é do próprio
usuário. Com ele, somente o proprietário ou um usuário delegado ao dispositivo
controlador atual pode assinar. O servidor envia o snapshot inicial e publica
atualizações na sala do proprietário. Comandos seguem em
`PUT /playlists/{playlist_id}/playback`.

## Regras

- `play`, `pause`, `seek` e `skip` podem ser enviados pelo delegado usando o
  playlist/track do snapshot, seu próprio `device_id`, sua `session_id` e a
  `expected_version` compartilhada.
- `checkpoint` e `ended` continuam restritos ao proprietário, ao dispositivo
  controlador original e à sessão controladora.
- Revogar a delegação remove a sessão da descoberta e encerra sua conexão em
  tempo real.
- Uma sessão compartilhada é selecionada automaticamente quando for a única
  sessão disponível; múltiplas sessões exibem seletor.
- Selecionar uma sessão compartilhada pausa o playback próprio, preservando sua
  posição, e não o retoma automaticamente.
- O backend permanece a autoridade final; delegação de um dispositivo não
  autoriza o uso de dispositivos pertencentes a terceiros.

## Critérios de aceite

Proprietário e delegados autorizados recebem snapshots idênticos na sala do
proprietário; usuários sem delegação não recebem snapshot. Comandos válidos de
delegados atualizam todos os assinantes. Revogação encerra o acesso. Sessões de
proprietários diferentes permanecem isoladas. O playback próprio e as restrições
de progresso existentes permanecem compatíveis.

| Ação | Proprietário | Delegado do controlador | Outro usuário |
| --- | --- | --- | --- |
| Descobrir sessão | sim | sim | não |
| Assinar WebSocket | sim | sim | não |
| Play/pause/seek/skip | sim | sim | não |
| Checkpoint/ended | sim, controlador | não | não |
| Usar dispositivo de terceiro | não | não | não |
