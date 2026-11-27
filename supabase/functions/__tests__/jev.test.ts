import { describe, it, expect } from 'vitest';
import { decideIconReject, decideNoteChips, buildNoteChipQuestions, suggestNoteChips, iconFailsQa } from '../_shared/jev';

describe('jev decisions', () => {
  it('rejects icons with text or people above threshold', () => {
    expect(decideIconReject({ has_text: { noul: 0.9 }, has_people: { noul: 0.1 } })).toBe(true);
    expect(decideIconReject({ has_text: { noul: 0.2 }, has_people: { noul: 0.95 } })).toBe(true);
    expect(decideIconReject({ has_text: { noul: 0.2 }, has_people: { noul: 0.1 } })).toBe(false);
    expect(decideIconReject(null)).toBe(false);
  });

  it('suggests only confident, unselected, undismissed chips', () => {
    const triggers = ['stress', 'driving', 'sleep'];
    const locations = [{ value: 'neck', label: 'Neck' }, { value: 'back', label: 'Lower back' }];
    expect(Object.keys(buildNoteChipQuestions(triggers, locations))).toHaveLength(5);
    const answers = {
      trigger_0: { noul: 0.95 }, trigger_1: { noul: 0.9 }, trigger_2: { noul: 0.3 },
      location_0: { noul: 0.92 }, location_1: { noul: 0.85 },
    };
    expect(decideNoteChips(answers, triggers, locations, { triggers: ['stress'], locations: [], dismissed: ['back'] }))
      .toEqual({ triggers: ['driving'], locations: ['neck'] });
    expect(decideNoteChips(null, triggers, locations, { triggers: [], locations: [] })).toEqual({ triggers: [], locations: [] });
  });

  it('is off without TYPESAFE_API_KEY and never calls fetch', async () => {
    let called = false;
    const f = (async () => { called = true; return new Response('{}'); }) as unknown as typeof fetch;
    expect(await suggestNoteChips('neck hurts after drive', ['driving'], [], { triggers: [], locations: [] }, f))
      .toEqual({ triggers: [], locations: [] });
    expect(await iconFailsQa({ data: 'x', mimeType: 'image/png' }, f)).toBe(false);
    expect(called).toBe(false);
  });
});
