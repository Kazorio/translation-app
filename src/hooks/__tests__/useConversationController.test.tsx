import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi, type Mock } from 'vitest';
import { useConversationController } from '@/hooks/useConversationController';

vi.mock('@/services/speechCaptureService', () => ({
  captureUtterance: vi.fn(({ seededText }: { seededText: string }) =>
    Promise.resolve({
      transcript: seededText,
      durationMs: 1200,
    }),
  ),
}));

vi.mock('@/services/translationService', () => ({
  translateText: vi.fn(({ text }: { text: string }) =>
    Promise.resolve({
      translatedText: `${text}-translated`,
    }),
  ),
}));

vi.mock('@/services/voiceService', () => ({
  renderVoiceFeedback: vi.fn(() => Promise.resolve()),
}));

describe('useConversationController', () => {
  it('adds a conversation entry after successful utterance', async () => {
    const { result } = renderHook(() => useConversationController());

    await act(async () => {
      await result.current.triggerUtterance('self', 'Hallo');
    });

    expect(result.current.entries).toHaveLength(1);
    expect(result.current.entries[0]).toMatchObject({
      originalText: 'Hallo',
      translatedText: 'Hallo-translated',
    });
    expect(result.current.status).toBe('idle');
  });

  it('exposes errors from capture stage', async () => {
    const captureModule = await import('@/services/speechCaptureService');
    (captureModule.captureUtterance as Mock).mockRejectedValueOnce(
      new Error('Mock Error'),
    );

    const { result } = renderHook(() => useConversationController());

    await act(async () => {
      await result.current.triggerUtterance('self', 'Test');
    });

    expect(result.current.errorMessage).toBe('Mock Error');
  });
});
