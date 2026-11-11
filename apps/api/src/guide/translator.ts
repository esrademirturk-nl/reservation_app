import type Anthropic from '@anthropic-ai/sdk';

export const LANGUAGE_NAMES = {
  en: 'English',
  tr: 'Turkish',
  nl: 'Dutch',
} as const;
export type Language = keyof typeof LANGUAGE_NAMES;

/** Translates an audio-guide text. Optional: without it, the app falls back to English. */
export interface NarrationTranslator {
  translate(text: string, to: Language, placeName: string): Promise<string>;
}
export const NARRATION_TRANSLATOR = Symbol('NARRATION_TRANSLATOR');

export class ClaudeTranslator implements NarrationTranslator {
  constructor(
    private readonly client: Pick<Anthropic, 'messages'>,
    private readonly model: string,
  ) {}

  async translate(text: string, to: Language, placeName: string) {
    const res = await this.client.messages.create({
      model: this.model,
      max_tokens: 2048,
      system:
        'You translate audio-guide scripts for travellers. Keep the meaning, facts and numbers exactly; keep it natural to read aloud; keep proper names. Reply with the translation only.',
      messages: [
        {
          role: 'user',
          content: `Translate this audio guide for "${placeName}" into ${LANGUAGE_NAMES[to]}:\n\n${text}`,
        },
      ],
    });
    const out = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();
    if (!out) throw new Error('Empty translation');
    return out;
  }
}
