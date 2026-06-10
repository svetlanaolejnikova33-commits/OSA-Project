import { isModeluxStorageImageUrl } from "../../../lib/registry/modeluxImageProxy";

export const dynamic = "force-dynamic";

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
  Referer: "https://modelux.ru/",
};

export async function GET(request) {
  try {
    const src = new URL(request.url).searchParams.get("src");
    if (!isModeluxStorageImageUrl(src)) {
      return Response.json({ ok: false, error: "Only modelux.ru/storage image URLs are allowed." }, { status: 400 });
    }

    const upstream = await fetch(src, {
      headers: FETCH_HEADERS,
      redirect: "follow",
      signal: AbortSignal.timeout(25000),
    });

    if (!upstream.ok) {
      return Response.json(
        { ok: false, error: `Upstream image fetch failed with status ${upstream.status}.` },
        { status: 502 },
      );
    }

    const bytes = await upstream.arrayBuffer();
    const contentType = upstream.headers.get("content-type") || "image/jpeg";

    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("[registry/modelux-image]", error);
    const message = error instanceof Error ? error.message : "Modelux image proxy failed.";
    return Response.json({ ok: false, error: message }, { status: 502 });
  }
}
