export const config = { runtime: 'edge' };

// Server-to-server requests aren't subject to browser CORS at all — so this
// is a genuine fix, not a workaround. It streams the upstream response body
// directly (works for both .m3u8 text manifests and binary .ts segments)
// and adds permissive CORS headers to what we send back to the browser.
export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const target = searchParams.get('url');

  if (!target || !/^https:\/\//i.test(target)) {
    return new Response('Missing or invalid url parameter', { status: 400 });
  }

  try {
    const upstream = await fetch(target, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        'Accept': '*/*',
      },
      redirect: 'follow',
    });

    const headers = new Headers();
    const passthrough = ['content-type', 'content-length', 'cache-control', 'accept-ranges', 'content-range'];
    for (const h of passthrough) {
      const v = upstream.headers.get(h);
      if (v) headers.set(h, v);
    }
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    headers.set('Access-Control-Allow-Headers', '*');

    return new Response(upstream.body, {
      status: upstream.status,
      headers,
    });
  } catch (e) {
    return new Response('Proxy fetch failed: ' + (e && e.message ? e.message : 'unknown error'), { status: 502 });
  }
}
