import { ClaudeExtractor } from './claude';

const fakeClient = (input: unknown) => {
  const create = jest.fn().mockResolvedValue({
    content: [{ type: 'tool_use', id: 't1', name: 'save_bookings', input }],
  });
  return { client: { messages: { create } } as never, create };
};

const good = {
  type: 'hotel',
  title: 'Hotel Roma Centro',
  provider: 'Booking.com',
  startAt: '2026-11-12T15:00',
  endAt: '2026-11-15T11:00',
  location: 'Via Cavour 23, Rome',
  ref: '4417892113',
  priceCents: 41200,
  currency: 'EUR',
  guests: 2,
  freeCancellationUntil: '2026-11-05',
  checkInOpens: null,
  uncertainFields: ['location'],
};

describe('ClaudeExtractor', () => {
  it('forces the save_bookings tool and maps uncertain fields to "check"', async () => {
    const { client, create } = fakeClient({ bookings: [good] });
    const [b] = await new ClaudeExtractor(client, 'claude-haiku-5-5').extract({
      text: 'Your booking at Hotel Roma Centro … '.repeat(3),
    });
    expect(create.mock.calls[0][0]).toMatchObject({
      model: 'claude-haiku-5-5',
      tool_choice: { type: 'tool', name: 'save_bookings' },
    });
    expect(b).toMatchObject({ title: 'Hotel Roma Centro', priceCents: 41200 });
    expect(b.confidence).toMatchObject({
      location: 'check',
      checkInOpens: 'check',
      title: 'high',
    });
  });

  it('drops bookings that do not match the schema', async () => {
    const { client } = fakeClient({
      bookings: [good, { ...good, startAt: '12 Nov' }, { nonsense: true }],
    });
    expect(
      await new ClaudeExtractor(client, 'm').extract({ text: 'x'.repeat(50) }),
    ).toHaveLength(1);
  });

  it('sends a scanned PDF as a document when there is no text', async () => {
    const { client, create } = fakeClient({ bookings: [] });
    await new ClaudeExtractor(client, 'm').extract({
      text: '',
      file: { data: Buffer.from('%PDF-1.4'), mimeType: 'application/pdf' },
    });
    expect(create.mock.calls[0][0].messages[0].content[0]).toMatchObject({
      type: 'document',
      source: { media_type: 'application/pdf' },
    });
  });
});
