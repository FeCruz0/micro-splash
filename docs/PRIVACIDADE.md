# Política de Privacidade & Proteção de Dados — Micro Splash 🛡️🐋

Este documento descreve os dados persistidos e as comunicações de rede implementadas no **Micro Splash**. Ele é informativo e não constitui certificação nem aconselhamento jurídico. Cada implantação deve revisar suas configurações, provedores externos e obrigações legais aplicáveis.

O _Micro Splash_ é um projeto de caráter estritamente educativo, de código aberto, concebido para uso universal em navegadores web, feiras de ciências, laboratórios de informática de redes escolares públicas municipais/estaduais e totens interativos em museus e centros de conservação marinha.

---

## 📋 Sumário

1. [Princípios e comunicações](#1-princípios-e-comunicações)
2. [Dados persistidos localmente](#2-dados-persistidos-localmente)
3. [Funcionamento offline](#3-funcionamento-offline)
4. [Chaves locais](#4-chaves-locais)
5. [Placar online](#5-placar-online)
6. [Analytics configurável](#6-analytics-configurável)
7. [Limpar dados locais](#7-limpar-dados-locais)
8. [Contato](#8-contato)

---

## 1. Princípios e comunicações

- O jogo persiste preferências e progresso no armazenamento do navegador.
- A API do placar pode receber uma entrada quando o usuário escolhe enviar uma pontuação. Analytics Plausible é opcional e depende de configuração de build.
- O projeto não solicita e-mail, nome completo, CPF ou telefone como parte do fluxo normal do jogo. Iniciais enviadas ao placar são exibidas publicamente.
- O uso de provedores de rede pode envolver dados técnicos processados por esses provedores. Consulte as políticas do serviço de hospedagem, do endpoint Plausible configurado e do endpoint do placar usado na implantação.

---

## 2. Dados persistidos localmente

O jogo salva configurações de acessibilidade, idioma, áudio e tela; recordes, estatísticas e progresso educativo; estado de onboarding e preferências do modo quiosque/companheira. A implementação usa `localStorage` e, para detectar controles touch durante a sessão, `sessionStorage`.

---

## 3. Funcionamento offline

O jogo foi projetado para que a partida principal funcione sem chamadas obrigatórias ao placar ou ao analytics. O service worker pode armazenar recursos para uso offline depois que forem carregados; disponibilidade offline depende de instalação/cache e da política do navegador. Consultar ou enviar pontuações ao placar requer rede.

---

## 4. Chaves locais

As principais chaves persistidas pela aplicação usam o prefixo `micro_splash_`. Algumas são compostas dinamicamente:

| Chave(s)                                                                                                  | Conteúdo                                                  |
| :-------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------- |
| `micro_splash_highscore`, `micro_splash_top10`, `micro_splash_weekly_top10_*`                             | Recordes e rankings locais.                               |
| `micro_splash_cumulative_stats`, `micro_splash_educational_telemetry`                                     | Estatísticas e progresso educativo.                       |
| `micro_splash_unlocked_facts`                                                                             | IDs de fatos desbloqueados no Codex.                      |
| `micro_splash_color_mode`, `micro_splash_reduced_motion`, `micro_splash_font_scale`                       | Preferências de acessibilidade.                           |
| `micro_splash_audio_settings`                                                                             | Volume, música, efeitos e modo de trilha num objeto JSON. |
| `micro_splash_haptics_enabled`, `micro_splash_touch_controls`                                             | Preferências de controles.                                |
| `micro_splash_resolution`, `micro_splash_resolution_<largura>x<altura>`                                   | Preset de resolução global e por dimensão de tela.        |
| `micro_splash_display_mode`, `micro_splash_letterbox_color`                                               | Preferências de apresentação.                             |
| `micro_splash_locale`                                                                                     | Idioma selecionado.                                       |
| `micro_splash_online_cache_*`                                                                             | Cache local das respostas do placar online.               |
| `micro_splash_kiosk_timeout`, `micro_splash_companion_whale_enabled`, `micro_splash_companion_whale_seen` | Preferências de quiosque e baleia-companheira.            |
| `micro_splash_onboarding_done`, `micro_splash_tts`                                                        | Estado do onboarding e configuração de narração.          |

Durante a sessão, `sessionStorage` também pode conter `micro_splash_touch_active` para detectar interação touch; essa chave não é removida pelo botão de limpeza do `localStorage`.

---

## 5. Placar online

- O usuário pode consultar o placar online e optar por enviar uma pontuação. O envio transmite iniciais (até 3 caracteres), score, distância, modo, data e, quando aplicável, chave semanal para o endpoint configurado.
- O Worker armazena as entradas do placar no Cloudflare KV e mantém as melhores 10 entradas por lista. As iniciais e pontuações podem ser vistas por outras pessoas.
- O cache do placar é gravado localmente. Limpar o armazenamento deste navegador não apaga entradas já enviadas ao serviço remoto; para solicitar remoção, use o contato do repositório.

---

## 6. Analytics configurável

- O serviço Plausible está desativado quando `VITE_PLAUSIBLE_DOMAIN` não está definido. O host pode ser configurado por `VITE_PLAUSIBLE_API_HOST` (o padrão no código é `https://plausible.io`).
- Se habilitado, o jogo envia eventos de início/conclusão/abandono de migração, quiz e salto. O payload pode incluir URL da página, modo, trilha sonora, pontuação, distância, biome, ID da questão e métricas do evento.
- A inicialização respeita a configuração Do Not Track do navegador. A implantação que habilitar analytics deve informar isso aos usuários e revisar a política do provedor configurado.

---

## 7. Limpar dados locais

Em **Opções → Apagar Dados**, a confirmação **"Sim, Apagar Tudo"** chama a rotina que remove do `localStorage` todas as chaves com prefixo `micro_splash_` e redefine preferências de acessibilidade. A página é recarregada. Isso não apaga dados do `sessionStorage`, logs do provedor de rede nem pontuações previamente enviadas ao placar remoto.

---

## 8. Uso em redes escolares e contato

Para uso institucional, revise as variáveis de ambiente de analytics, o endpoint de ranking e as políticas dos provedores antes de disponibilizar o jogo. Em caso de dúvida ou solicitação sobre dados enviados ao placar, consulte o repositório:

- **Repositório:** [https://github.com/FeCruz0/micro-splash](https://github.com/FeCruz0/micro-splash)
- **Mantenedor Principal:** Felipe Cruz
