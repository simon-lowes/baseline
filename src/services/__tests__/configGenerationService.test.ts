import { getLocalAmbiguityFallback } from '../configGenerationService';

describe('getLocalAmbiguityFallback', () => {
  test('exact match returns interpretations for flying', () => {
    const res = getLocalAmbiguityFallback('Flying');
    expect(res.isAmbiguous).toBe(true);
    expect(res.interpretations.length).toBeGreaterThanOrEqual(1);
    expect(res.interpretations.some(i => i.value === 'air-travel')).toBe(true);
  });

  test('typo returns suggested correction for flyinh', () => {
    const res = getLocalAmbiguityFallback('Flyinh');
    expect(res.isAmbiguous).toBe(true);
    expect(res.suggestedCorrection).toBeDefined();
    expect(res.suggestedCorrection).toBe('flying');
  });

  test('non-ambiguous unknown word returns not ambiguous', () => {
    const res = getLocalAmbiguityFallback('qwertyuiop');
    expect(res.isAmbiguous).toBe(false);
  });

  test('alias "Flight" returns ambiguity suggestions', () => {
    const res = getLocalAmbiguityFallback('Flight');
    expect(res.isAmbiguous).toBe(true);
    expect(res.interpretations.some(i => i.value === 'air-travel')).toBe(true);
  });
});