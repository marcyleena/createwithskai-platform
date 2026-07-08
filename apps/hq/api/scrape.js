// Vercel serverless function -- ported from the original Netlify function
// (netlify/functions/scrape.js) with the exact same request/response
// contract so IntelTab's `fetch('/api/scrape', ...)` call needs no changes.
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { apifyKey, handles, period } = req.body || {};
  console.log('[scrape] handles:', (handles || []).map(h => `${h.handle}(${h.platform || 'instagram'})`), 'period:', period);

  if (!apifyKey || !handles || !handles.length) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  // Try an actor with the given input body, returning { ok, items, actor, errorBody }
  async function tryActor(actorSlug, inputBody) {
    const url = `https://api.apify.com/v2/acts/${actorSlug}/run-sync-get-dataset-items?token=${apifyKey}&timeout=60`;
    console.log(`[scrape] trying actor=${actorSlug}`);
    console.log('[scrape] request body:', JSON.stringify(inputBody));

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inputBody),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[scrape] actor=${actorSlug} status=${response.status} errorBody=${errorBody}`);
      return { ok: false, status: response.status, errorBody };
    }

    const items = await response.json();
    console.log(`[scrape] actor=${actorSlug} success, items=${items.length}`);
    return { ok: true, items, actor: actorSlug };
  }

  const results = [];

  for (const account of handles) {
    const platform = (account.platform || 'instagram').toLowerCase();
    console.log(`[scrape] processing @${account.handle} platform=${platform}`);

    try {
      let result;

      if (platform === 'tiktok') {
        // TikTok branch
        result = await tryActor('clockworks~tiktok-scraper', {
          profiles: [account.handle],
          resultsPerPage: 12,
        });

        if (!result.ok) {
          throw new Error(`TikTok scraper error ${result.status}: ${result.errorBody}`);
        }

        const items = result.items || [];

        if (items.length > 0) {
          console.log(`[scrape] TikTok first item for @${account.handle}:`, JSON.stringify(items[0], null, 2));
        } else {
          console.log(`[scrape] TikTok returned 0 items for @${account.handle}`);
        }

        if (items[0]?.error) {
          throw new Error(items[0].errorDescription || 'No TikTok data returned');
        }

        const posts = items.slice(0, 6).map(item => {
          const likes    = item.diggCount    ?? item.likes         ?? 0;
          const comments = item.commentCount ?? item.commentsCount ?? 0;
          const views    = item.playCount    ?? item.viewCount     ?? 0;
          const text     = item.text         ?? item.caption       ?? '';

          console.log(`[scrape] TikTok mapped id=${item.id} likes=${likes} comments=${comments} views=${views} textLen=${text.length}`);

          return {
            id:       item.id,
            type:     'Video',
            hook:     text ? text.split('\n')[0].substring(0, 100) : '(no caption)',
            likes,
            comments,
            views,
          };
        });

        results.push({ handle: account.handle, niche: account.niche, platform: 'tiktok', posts });

      } else {
        // Instagram branch (default)
        result = await tryActor('apify~instagram-scraper', {
          directUrls: [`https://www.instagram.com/${account.handle}/`],
          resultsType: 'posts',
          resultsLimit: 12,
        });

        if (!result.ok) {
          throw new Error(`Instagram scraper error ${result.status}: ${result.errorBody}`);
        }

        const items = result.items || [];

        if (items.length > 0) {
          console.log(`[scrape] Instagram first item for @${account.handle}:`, JSON.stringify(items[0], null, 2));
        } else {
          console.log(`[scrape] Instagram returned 0 items for @${account.handle}`);
        }

        if (items[0]?.error) {
          throw new Error(items[0].errorDescription || 'No Instagram data returned');
        }

        const posts = items.slice(0, 6).map(item => {
          const likes    = item.likesCount    ?? item.likes        ?? item.diggCount      ?? 0;
          const comments = item.commentsCount ?? item.comments     ?? item.commentsNumber ?? 0;
          const views    = item.videoViewCount ?? item.videoPlayCount ?? item.viewCount   ?? item.playsCount ?? 0;
          const caption  = item.caption       ?? item.text         ?? item.description   ?? item.alt ?? '';
          const rawType  = item.type          ?? item.mediaType    ?? item.productType   ?? '';
          const type     = /video/i.test(rawType) ? 'Reel'
                         : /sidecar|carousel|album/i.test(rawType) ? 'Carousel'
                         : 'Static';

          console.log(`[scrape] Instagram mapped id=${item.id || item.shortCode} type="${rawType}"->"${type}" likes=${likes} comments=${comments} captionLen=${caption.length}`);

          return {
            id:       item.id || item.shortCode,
            type,
            hook:     caption ? caption.split('\n')[0].substring(0, 100) : '(no caption)',
            likes,
            comments,
            views,
          };
        });

        results.push({ handle: account.handle, niche: account.niche, platform: 'instagram', posts });
      }

    } catch (e) {
      console.error(`[scrape] error for @${account.handle}:`, e.message);
      results.push({ handle: account.handle, niche: account.niche, platform, posts: [], error: e.message });
    }
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.status(200).json({ results });
}
