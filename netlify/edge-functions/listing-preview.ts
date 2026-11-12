const SUPABASE_URL = "https://pfomxbhofdoorqfdekfd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_EuvfaKH4mhw4qOk9APGYnA_Aw4H_RvR";
const CLOUDINARY_CLOUD = "vr7rj2dt";

const CRAWLER_RE = /(whatsapp|facebookexternalhit|twitterbot|linkedinbot|telegrambot|slackbot|discordbot|skypeuripreview)/i;

export default async (request: Request, context: any) => {
  const url = new URL(request.url);
  const listingId = url.searchParams.get("listing");
  const ua = request.headers.get("user-agent") || "";

  if (!listingId || !CRAWLER_RE.test(ua)) {
    return context.next();
  }

  let listing: any = null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/listings?select=id,title,description,price,listing_photos(image_url,display_order)&id=eq.${listingId}&status=eq.active`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
    );
    const rows = await res.json();
    listing = rows?.[0];
  } catch { return context.next(); }

  if (!listing) return context.next();

  const photos = (listing.listing_photos || []).sort((a: any, b: any) => a.display_order - b.display_order);
  const rawImage = photos[0]?.image_url || "";
  const title = listing.title || "CampusFlip listing";
  const price = listing.price ? `MK ${Number(listing.price).toLocaleString()}` : "";
  const desc = `${price ? price + " · " : ""}${(listing.description || "").slice(0, 110)}`;

  const ogImage = buildOgImage(rawImage, title);

  const html = `<!doctype html>
<html><head><meta charset="utf-8">
<title>${esc(title)} · CampusFlip</title>
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(desc)}" />
<meta property="og:image" content="${esc(ogImage)}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:type" content="product" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:image" content="${esc(ogImage)}" />
</head><body></body></html>`;

  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
};

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function buildOgImage(rawImage: string, title: string) {
  if (!rawImage) return "https://campusflip2.netlify.app/og-image.png";
  const m = rawImage.match(/\/upload\/(?:v\d+\/)?(.+)$/);
  if (!m) return rawImage;
  const publicId = m[1];
  const t = encodeURIComponent(encodeURIComponent(title.slice(0, 55)));
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD}/image/upload/c_fill,w_1200,h_630,g_auto/l_text:Arial_52_bold:${t}/fl_layer_apply,g_south_west,x_60,y_80/${publicId}`;
}