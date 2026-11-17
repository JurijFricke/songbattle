import { describe, expect, it, vi } from 'vitest';
import { fetchSongsAPI } from './api';

describe('frontend API client', () => {
  it('validates the typed battle response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        sessionId: '00000000-0000-4000-8000-000000000000',
        songs: [],
        requestedCount: 16,
        effectiveCount: 16,
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    ));

    const result = await fetchSongsAPI(16, { type: 'random' });
    expect(result.sessionId).toBe('00000000-0000-4000-8000-000000000000');
    expect(result.effectiveCount).toBe(16);
  });
});
