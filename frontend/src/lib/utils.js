export function parsePrice(s, fallback = 0) {
  return parseFloat((s || '').replace(/[^\d.]/g, '')) || fallback;
}

export function summarizeVotes(votes = []) {
  const summary = { yes: 0, no: 0, maybe: 0 };
  for (const v of votes) summary[v.vote] = (summary[v.vote] || 0) + 1;
  return summary;
}

export function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `hace ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.floor(h / 24)}d`;
}
