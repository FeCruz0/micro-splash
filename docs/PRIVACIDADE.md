# Política de Privacidade & Proteção de Dados — Micro Splash 🛡️🐋

Este documento estabelece o compromisso do **Micro Splash** com a proteção de dados pessoais, a privacidade e a conformidade legal, atendendo aos princípios da **Lei Geral de Proteção de Dados Pessoais do Brasil (LGPD — Lei nº 13.709/2018)** e do **Regulamento Geral sobre a Proteção de Dados da União Europeia (GDPR — Regulamento 2016/679)**.

O _Micro Splash_ é um projeto de caráter estritamente educativo, de código aberto, concebido para uso universal em navegadores web, feiras de ciências, laboratórios de informática de redes escolares públicas municipais/estaduais e totens interativos em museus e centros de conservação marinha.

---

## 📋 Sumário

1. [Princípios Fundamentais](#1-princípios-fundamentais)
2. [Quais Dados São Armazenados](#2-quais-dados-são-armazenados)
3. [Armazenamento Local (Offline-First)](#3-armazenamento-local-offline-first)
4. [Tabela Completa de Chaves do LocalStorage](#4-tabela-completa-de-chaves-do-localstorage)
5. [Placar de Líderes (Ranking Global & Local)](#5-placar-de-líderes-ranking-global--local)
6. [Direito ao Esquecimento & Botão "Apagar Dados"](#6-direito-ao-esquecimento--botão-apagar-dados)
7. [Uso em Redes Escolares e Totens Públicos](#7-uso-em-redes-escolares-e-totens-públicos)
8. [Contato & Dúvidas](#8-contato--dúvidas)

---

## 1. Princípios Fundamentais

- **Coleta Mínima (Privacy by Default):** Coletamos apenas o estritamente necessário para o funcionamento das mecânicas do jogo (recorde, configurações de acessibilidade e fatos desbloqueados).
- **Sem Rastreamento de Terceiros:** O jogo **NÃO** utiliza cookies de rastreamento, Google Analytics, pixels do Meta, scripts de publicidade ou qualquer serviço de telemetria invasiva.
- **Transparência Total:** Todo o código é aberto e auditável no repositório oficial do projeto.
- **Segurança para Menores:** Em conformidade com o Artigo 14 da LGPD (tratamento de dados de crianças e adolescentes), o jogo não solicita e-mail, nome completo, CPF, localização geográfica ou telefone.

---

## 2. Quais Dados São Armazenados

O _Micro Splash_ armazena exclusivamente preferências técnicas e progresso no dispositivo do próprio usuário. Nenhum dado pessoal identificável (PII) é coletado ou exigido.

---

## 3. Armazenamento Local (Offline-First)

Todos os dados salvos pelo jogo permanecem confinados no navegador do usuário utilizando a API padrão de `localStorage`. Isso assegura que o jogo funcione **100% offline** e que as informações não saiam do dispositivo, a menos que o usuário opte expressamente por participar do placar global.

---

## 4. Tabela Completa de Chaves do LocalStorage

Todas as chaves criadas pelo Micro Splash utilizam o prefixo identificador `micro_splash_`:

| Chave                           | Finalidade                                                                                      | Tipo de Dado                  |
| :------------------------------ | :---------------------------------------------------------------------------------------------- | :---------------------------- |
| `micro_splash_highscore`        | Maior pontuação obtida na migração.                                                             | Número inteiro                |
| `micro_splash_cumulative_stats` | Métricas ecológicas somadas (lixos coletados, redes desfeitas, km nadados).                     | Objeto JSON                   |
| `micro_splash_unlocked_facts`   | Lista de identificadores de fatos ecológicos desbloqueados no Diário de Bordo.                  | Array JSON de strings         |
| `micro_splash_color_mode`       | Paleta de acessibilidade selecionada (`normal`, `protanopia`, `deuteranopia`, `high_contrast`). | String                        |
| `micro_splash_reduced_motion`   | Preferência de atenuação de movimento (`auto`, `reduced`, `full`).                              | String                        |
| `micro_splash_font_scale`       | Escala do tamanho das fontes da interface (`small`, `normal`, `large`).                         | String                        |
| `micro_splash_soundtrack_mode`  | Modo de trilha sonora ativo (16-bit chiptune, ambiente contemplativo, foco).                    | String                        |
| `micro_splash_volume`           | Nível do volume sonoro geral (0% a 100%).                                                       | Número decimal                |
| `micro_splash_sfx_enabled`      | Estado de ativação dos efeitos sonoros procedurais.                                             | Booleano (`"true"`/`"false"`) |
| `micro_splash_haptics`          | Estado de ativação da vibração tátil em dispositivos móveis.                                    | Booleano (`"true"`/`"false"`) |
| `micro_splash_touch_controls`   | Modo de exibição dos controles touch na tela (`auto`, `on`, `off`).                             | String                        |
| `micro_splash_resolution`       | Preset de resolução do canvas (`1080p`, `720p`, `540p`, `450p`).                                | String                        |
| `micro_splash_display_mode`     | Modo de proporção de tela (`stretch` ou `letterbox`).                                           | String                        |
| `micro_splash_onboarding_seen`  | Indica se o onboarding em 3 slides já foi visualizado no dispositivo.                           | Booleano (`"true"`)           |
| `micro_splash_tts_enabled`      | Ativação da narração em voz acessível dos fatos ecológicos.                                     | Booleano (`"true"`/`"false"`) |

---

## 5. Placar de Líderes (Ranking Global & Local)

- **Pseudonimização:** Ao alcançar uma pontuação notável, o jogador pode opcionalmente salvar até **3 caracteres de iniciais** (ex: `"ABC"`).
- **Modo Offline:** Em totens de museus sem conexão à internet ou salas de aula desconectadas, o ranking opera em modo local restrito àquele navegador.
- **Sincronização Opcional:** Quando há conexão, apenas o score numérico, a data e as iniciais de 3 letras são transmitidos para o Cloudflare KV. Nenhum endereço IP é indexado ou armazenado na listagem pública do ranking.

---

## 6. Direito ao Esquecimento & Botão "Apagar Dados"

Em pleno cumprimento do **Artigo 18 da LGPD** (Direito de eliminação dos dados pessoais tratados), o _Micro Splash_ disponibiliza uma ferramenta de exclusão imediata e irrestrita:

1. Acesse o menu **Opções ⚙️** na tela inicial do jogo.
2. Clique no botão vermelho **"🗑️ Apagar Dados (LGPD)"**.
3. Uma tela de confirmação é exibida: _"Deseja apagar todos os recordes, conquistas e configurações salvas? Esta ação é irreversível."_.
4. Ao clicar em **"Sim, Apagar Tudo"**, todas as chaves do `localStorage` iniciadas com `micro_splash_` são expurgadas imediatamente da memória do dispositivo e o jogo é reinicializado ao seu estado de fábrica.

---

## 7. Uso em Redes Escolares e Totens Públicos

O _Micro Splash_ é certificado para ambientes institucionais:

- **Totens de Museus:** O botão de apagar dados permite que monitores de museu redefinam o quiosque entre grupos escolares com facilidade.
- **Laboratórios de Informática:** Professores podem utilizar o jogo com segurança jurídica absoluta, sabendo que os estudantes não são expostos a coleta de dados comerciais.

---

## 8. Contato & Dúvidas

Em caso de dúvidas sobre este documento ou solicitações relativas a dados, consulte a página oficial do projeto no GitHub:

- **Repositório:** [https://github.com/FeCruz0/micro-splash](https://github.com/FeCruz0/micro-splash)
- **Mantenedor Principal:** Felipe Cruz
