// Utilidades de transcripción de llamadas

import type { CallTranscriptTurn } from './types';

/** Acumulador de turnos de transcripción durante una llamada en vivo. */
export class TranscriptAccumulator {
  private turns: CallTranscriptTurn[] = [];
  private startedAt: number;

  constructor(startedAt: number = Date.now()) {
    this.startedAt = startedAt;
  }

  addTurn(role: 'agent' | 'customer', text: string): void {
    const trimmed = (text || '').trim();
    if (!trimmed) return;
    this.turns.push({ role, text: trimmed, atMs: Date.now() - this.startedAt });
  }

  getTurns(): CallTranscriptTurn[] {
    return [...this.turns];
  }

  isEmpty(): boolean {
    return this.turns.length === 0;
  }

  /** Texto plano de la conversación para generar resúmenes. */
  toPlainText(): string {
    return this.turns
      .map((t) => `${t.role === 'agent' ? 'Agente' : 'Cliente'}: ${t.text}`)
      .join('\n');
  }
}

/** Convierte un transcript a texto plano legible. */
export function transcriptToPlainText(turns: CallTranscriptTurn[]): string {
  return (turns || [])
    .map((t) => `${t.role === 'agent' ? 'Agente' : 'Cliente'}: ${t.text}`)
    .join('\n');
}
