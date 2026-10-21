import { splitRecsForFreeTier } from '../../../src/services/proAccess';

const rec = id => ({ id });

describe('splitRecsForFreeTier', () => {
  it('shows the first half (rounded up) and blurs the rest', () => {
    const { visible, blurred } = splitRecsForFreeTier([], [rec('a'), rec('b'), rec('c')]);
    expect(visible.map(r => r.id)).toEqual(['a', 'b']);
    expect(blurred.map(r => r.id)).toEqual(['c']);
  });

  it('always keeps urgent recs visible, even when they are more than half', () => {
    const { visible, blurred } = splitRecsForFreeTier([rec('u1'), rec('u2'), rec('u3')], [rec('n1')]);
    expect(visible.map(r => r.id)).toEqual(['u1', 'u2', 'u3']);
    expect(blurred.map(r => r.id)).toEqual(['n1']);
  });

  it('shows a single recommendation rather than blurring it', () => {
    const { visible, blurred } = splitRecsForFreeTier([], [rec('a')]);
    expect(visible).toHaveLength(1);
    expect(blurred).toHaveLength(0);
  });

  it('handles no recommendations', () => {
    expect(splitRecsForFreeTier([], [])).toEqual({ visible: [], blurred: [] });
  });
});
