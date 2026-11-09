import { ClaudeTranslator } from './translator';

describe('ClaudeTranslator', () => {
  it('asks for a translation into the language by name and returns the text', async () => {
    const create = jest.fn().mockResolvedValue({
      content: [{ type: 'text', text: ' Dit is het Colosseum. ' }],
    });
    const t = new ClaudeTranslator(
      { messages: { create } } as never,
      'claude-haiku-5-5',
    );
    await expect(
      t.translate('This is the Colosseum.', 'nl', 'Colosseum'),
    ).resolves.toBe('Dit is het Colosseum.');
    expect(create.mock.calls[0][0].messages[0].content).toContain('into Dutch');
  });

  it('fails on an empty answer so the app can fall back to English', async () => {
    const create = jest.fn().mockResolvedValue({ content: [] });
    const t = new ClaudeTranslator({ messages: { create } } as never, 'm');
    await expect(t.translate('x', 'tr', 'X')).rejects.toThrow();
  });
});
