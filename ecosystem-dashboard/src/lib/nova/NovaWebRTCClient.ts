/**
 * NovaWebRTCClient — browser/TypeScript port of NativeNovaWebRTCClient.swift
 *
 * Connects to Nova's SmallWebRTC `/connect` endpoint via the dashboard
 * server-side proxy `/api/nova/webrtc-connect` (HTTPS-safe SDP exchange),
 * opens the `rtvi-ai` data channel, and emits parsed RTVI events.
 *
 * Mirrors the iOS pattern exactly: same RTVI envelope, same event vocabulary,
 * same `send-text` payload, and same `audio_mode` semantics.
 */
export type NovaEvent =
  | { kind: 'connected' }
  | { kind: 'disconnected'; reason?: string }
  | { kind: 'botReady' }
  | { kind: 'botLlmStarted' }
  | { kind: 'botLlmText'; text: string }
  | { kind: 'botLlmStopped' }
  | { kind: 'botTtsStarted' }
  | { kind: 'botTtsText'; text: string }
  | { kind: 'botTtsStopped' }
  | { kind: 'botStartedSpeaking' }
  | { kind: 'botStoppedSpeaking' }
  | { kind: 'userTranscript'; text: string; isFinal: boolean }
  | { kind: 'userStartedSpeaking' }
  | { kind: 'userStoppedSpeaking' }
  | { kind: 'botTranscript'; text: string }
  | { kind: 'functionCall'; name: string; args: string }
  | { kind: 'card'; cardKind: string; tool?: string; data: any }
  | { kind: 'hypothesis'; text: string; confidence: number; tools: string[]; turnId?: string }
  | { kind: 'validating'; tools: string[]; turnId?: string }
  | { kind: 'validationStep'; tool: string; status: string; phase?: string; latencyMs?: number; resultPreview?: string; turnId?: string }
  | { kind: 'validated'; text: string; speechText?: string; result: string; confidence?: number; suppressSpeech: boolean; cardData?: any; turnId?: string }
  | { kind: 'grounded'; text: string; speechText: string; source: string; confidence?: number; turnId?: string }
  | { kind: 'turnStatus'; phase: string; message: string; tool?: string; turnId?: string }
  | { kind: 'turnComplete' }
  | { kind: 'thinkingUpdate'; text: string }
  | { kind: 'progressUpdate'; text: string }
  | { kind: 'heartbeat'; text: string }
  | { kind: 'phase'; value: string }
  | { kind: 'error'; message: string };

export interface NovaConnectOptions {
  userId: string;
  conversationId: string;
  audioMode?: string;            // 'tesla' | 'native' | 'pipecat'
  signalingUrl?: string;          // default: '/api/nova/webrtc-connect'
  iceServers?: RTCIceServer[];
}

export class NovaWebRTCClient {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private sessionId: string | null = null;
  private opts: Required<NovaConnectOptions>;
  private onEvent: (e: NovaEvent) => void = () => {};

  constructor(opts: NovaConnectOptions) {
    this.opts = {
      audioMode: 'tesla',
      signalingUrl: '/api/nova/webrtc-connect',
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      ...opts,
    } as Required<NovaConnectOptions>;
  }

  isConnected(): boolean {
    return this.dc?.readyState === 'open';
  }

  async connect(onEvent: (e: NovaEvent) => void): Promise<void> {
    this.onEvent = onEvent;

    this.pc = new RTCPeerConnection({ iceServers: this.opts.iceServers });
    this.dc = this.pc.createDataChannel('rtvi-ai', { ordered: true });
    this.wireDataChannel(this.dc);

    this.pc.oniceconnectionstatechange = () => {
      const s = this.pc?.iceConnectionState;
      if (s === 'connected' || s === 'completed') this.onEvent({ kind: 'connected' });
      else if (s === 'failed' || s === 'disconnected') this.onEvent({ kind: 'disconnected', reason: `ice ${s}` });
    };

    this.pc.ondatachannel = (ev) => this.wireDataChannel(ev.channel);

    const offer = await this.pc.createOffer({ offerToReceiveAudio: false, offerToReceiveVideo: false });
    await this.pc.setLocalDescription(offer);
    await this.waitForIceGathering(3000);

    const local = this.pc.localDescription!;
    const body: any = {
      sdp: local.sdp,
      type: local.type,
      request_data: {
        user_id: this.opts.userId,
        conversation_id: this.opts.conversationId,
        audio_mode: this.opts.audioMode,
      },
    };
    if (this.sessionId) body.pc_id = this.sessionId;

    const res = await fetch(this.opts.signalingUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Nova /connect proxy returned ${res.status}: ${await res.text()}`);
    const answer = await res.json();
    this.sessionId = answer.sessionId || answer.pc_id || null;

    await this.pc.setRemoteDescription({ sdp: answer.sdp, type: answer.type });
  }

  private async waitForIceGathering(timeoutMs: number): Promise<void> {
    if (!this.pc) return;
    if (this.pc.iceGatheringState === 'complete') return;
    await new Promise<void>((resolve) => {
      const t = setTimeout(resolve, timeoutMs);
      const check = () => {
        if (this.pc?.iceGatheringState === 'complete') {
          clearTimeout(t);
          this.pc.removeEventListener('icegatheringstatechange', check);
          resolve();
        }
      };
      this.pc!.addEventListener('icegatheringstatechange', check);
    });
  }

  private wireDataChannel(dc: RTCDataChannel) {
    this.dc = dc;
    dc.onopen = () => this.onEvent({ kind: 'botReady' });
    dc.onclose = () => this.onEvent({ kind: 'disconnected', reason: 'data channel closed' });
    dc.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        this.handleRTVI(msg);
      } catch {
        /* ignore non-JSON frames */
      }
    };
  }

  // ── RTVI envelope: { label: 'rtvi-ai', id, type, data } ────────────────────
  private handleRTVI(msg: any) {
    const type: string = msg?.type;
    const data: any = msg?.data ?? {};
    if (!type) return;

    switch (type) {
      case 'bot-ready':                 return this.onEvent({ kind: 'botReady' });
      case 'bot-llm-started':           return this.onEvent({ kind: 'botLlmStarted' });
      case 'bot-llm-text':              return this.onEvent({ kind: 'botLlmText', text: data.text ?? '' });
      case 'bot-llm-stopped':           return this.onEvent({ kind: 'botLlmStopped' });
      case 'bot-tts-started':           return this.onEvent({ kind: 'botTtsStarted' });
      case 'bot-tts-text':              return this.onEvent({ kind: 'botTtsText', text: data.text ?? '' });
      case 'bot-tts-stopped':           return this.onEvent({ kind: 'botTtsStopped' });
      case 'bot-started-speaking':      return this.onEvent({ kind: 'botStartedSpeaking' });
      case 'bot-stopped-speaking':      return this.onEvent({ kind: 'botStoppedSpeaking' });
      case 'bot-transcription':         return this.onEvent({ kind: 'botTranscript', text: data.text ?? '' });
      case 'user-transcription':        return this.onEvent({ kind: 'userTranscript', text: data.text ?? '', isFinal: !!data.final });
      case 'user-started-speaking':     return this.onEvent({ kind: 'userStartedSpeaking' });
      case 'user-stopped-speaking':     return this.onEvent({ kind: 'userStoppedSpeaking' });

      case 'llm-function-call-started':
      case 'llm-function-call-in-progress': {
        const name = data.function_name || data.functionName || data.name || data.tool_name;
        if (name) this.onEvent({ kind: 'functionCall', name, args: data.arguments || data.args || '' });
        return;
      }

      case 'server-message': {
        const t = data?.type;
        switch (t) {
          case 'turn_status':
            return this.onEvent({ kind: 'turnStatus', phase: data.phase, message: data.message, tool: data.tool, turnId: data.turn_id });
          case 'hypothesis':
            return this.onEvent({ kind: 'hypothesis', text: data.text || '', confidence: data.confidence ?? 0.7, tools: data.tools || [], turnId: data.turn_id });
          case 'validating':
            return this.onEvent({ kind: 'validating', tools: data.tools || [], turnId: data.turn_id });
          case 'validationStep':
            return this.onEvent({
              kind: 'validationStep',
              tool: data.tool,
              status: data.status,
              phase: data.phase,
              latencyMs: data.latency_ms,
              resultPreview: data.result_preview ?? (typeof data.result === 'string' ? data.result : undefined),
              turnId: data.turn_id,
            });
          case 'validated':
            return this.onEvent({
              kind: 'validated',
              text: data.text || '',
              speechText: data.speech_text || data.speechText,
              result: data.result || 'confirmed',
              confidence: data.confidence,
              suppressSpeech: !!data.suppress_speech || !!data.suppressSpeech,
              cardData: data.card,
              turnId: data.turn_id,
            });
          case 'grounded':
            return this.onEvent({
              kind: 'grounded',
              text: data.text || '',
              speechText: data.speech_text || data.speechText || data.text || '',
              source: data.source || 'cache',
              confidence: data.confidence,
              turnId: data.turn_id,
            });
          case 'card':
            return this.onEvent({ kind: 'card', cardKind: data.kind || 'generic', tool: data.tool, data: data.data || data });
          case 'turn_complete':
            return this.onEvent({ kind: 'turnComplete' });
          case 'thinking_update':
            return this.onEvent({ kind: 'thinkingUpdate', text: data.text || '' });
          case 'progress_update':
            return this.onEvent({ kind: 'progressUpdate', text: data.text || '' });
          case 'heartbeat':
            return this.onEvent({ kind: 'heartbeat', text: data.text || '' });
          case 'phase':
            return this.onEvent({ kind: 'phase', value: data.value || '' });
        }
        return;
      }

      case 'error':
        return this.onEvent({ kind: 'error', message: data.message || 'Unknown error' });
    }
  }

  // ── Outbound: send text via RTVI envelope (matches iOS exactly) ────────────
  sendText(text: string, extras?: { userLocation?: any; continuity?: any }) {
    const payload: any = {
      content: text,
      is_final: true,
      source: 'tesla_dashboard_text',
    };
    if (extras?.userLocation) payload.userLocation = extras.userLocation;
    if (extras?.continuity) payload.continuity = extras.continuity;
    this.send('send-text', payload);
  }

  sendSpeakingState(who: 'user' | 'bot', active: boolean) {
    this.send('client-speaking-state', { who, active, timestamp: Date.now() / 1000 });
  }

  private send(type: string, data: any) {
    if (this.dc?.readyState !== 'open') return;
    const envelope = {
      label: 'rtvi-ai',
      id: typeof crypto !== 'undefined' && (crypto as any).randomUUID ? (crypto as any).randomUUID() : String(Date.now()),
      type,
      data,
    };
    this.dc.send(JSON.stringify(envelope));
  }

  async disconnect(): Promise<void> {
    try {
      if (this.sessionId) {
        // Best-effort server-side cleanup (mirrors iOS notifyServerDisconnect)
        fetch(this.opts.signalingUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'disconnect', pc_id: this.sessionId }),
        }).catch(() => {});
      }
    } finally {
      try { this.dc?.close(); } catch {}
      try { this.pc?.close(); } catch {}
      this.dc = null;
      this.pc = null;
      this.onEvent({ kind: 'disconnected', reason: 'explicit' });
    }
  }
}
