export function formatRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffSec < 60) {
    return 'Just now';
  } else if (diffMin < 60) {
    return `${diffMin}m ago`;
  } else if (diffHr < 24) {
    return `${diffHr}h ago`;
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}

export function formatDate(dateString: string): string {
  try {
    const [year, month, day] = dateString.split('-');
    if (year && month && day) {
      const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function getCampusPlaceholderImage(category?: string, title?: string): string {
  const cat = (category || 'Item').replace(/[^a-zA-Z0-9 &]/g, '');
  const label = (title || cat).replace(/[^a-zA-Z0-9 &]/g, '').slice(0, 26);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400" fill="none">
    <rect width="600" height="400" fill="#F8FAFC"/>
    <rect x="20" y="20" width="560" height="360" rx="16" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="2"/>
    <circle cx="300" cy="150" r="48" fill="#EFF6FF"/>
    <path d="M300 126l-20 12v18c0 13 8.5 25 20 28 11.5-3 20-15 20-28v-18l-20-12z" fill="#0055A5"/>
    <path d="M295 142h10v16h-10z" fill="#E5A823"/>
    <text x="300" y="235" text-anchor="middle" fill="#0F172A" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="700" font-size="18">${cat.toUpperCase()}</text>
    <text x="300" y="265" text-anchor="middle" fill="#64748B" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="500" font-size="13">${label}</text>
    <rect x="220" y="295" width="160" height="24" rx="12" fill="#EFF6FF"/>
    <text x="300" y="311" text-anchor="middle" fill="#0055A5" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="700" font-size="10">SJSU REGISTRY ITEM</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
