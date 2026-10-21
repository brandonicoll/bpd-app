// Free vs Pro access rules. Lift tracking, history, trends and the outside
// activity log are free; engine recommendations and their details are Pro.

export const PRIVACY_POLICY_URL = 'https://brandonicoll.github.io/BPF-App-Privacy-Policy/';
export const TERMS_OF_USE_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

// Sneak peek for free users: the first half of the recommendations show their
// title (details locked), the rest are blurred. Urgent recs are always in the
// visible half — a pain/safety warning should never be fully hidden.
export function splitRecsForFreeTier(urgentRecs, normalRecs) {
  const all = [...urgentRecs, ...normalRecs];
  const visibleCount = Math.max(urgentRecs.length, Math.ceil(all.length / 2));
  return {
    visible: all.slice(0, visibleCount),
    blurred: all.slice(visibleCount),
  };
}
