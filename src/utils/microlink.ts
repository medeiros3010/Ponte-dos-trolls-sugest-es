// Cache and fetch preview images via microlink.io
const CACHE_PREFIX = 'ml_og_img_v1_';

export async function fetchLinkPreviewImage(url: string): Promise<string | null> {
  if (!url || !url.startsWith('http')) return null;

  try {
    const cacheKey = `${CACHE_PREFIX}${url}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      return cached;
    }

    const response = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) return null;

    const json = await response.json();
    if (json.status === 'success' && json.data) {
      const img = json.data.image?.url || json.data.screenshot?.url || json.data.logo?.url;
      if (img) {
        localStorage.setItem(cacheKey, img);
        return img;
      }
    }
  } catch (err) {
    // Fail quietly, return null to show fallback
  }

  return null;
}
