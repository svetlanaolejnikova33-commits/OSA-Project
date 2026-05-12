import { NextResponse } from "next/server";
import OpenAI from "openai";
import { toFile } from "openai/uploads";
import { buildControlledRegenerationPrompt } from "../../lib/generationPackageUtils";

const MODEL = "gpt-image-1";

function normalizeInboundMime(mimeRaw) {
  const m = String(mimeRaw || "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  if (m === "image/jpg") return "image/jpeg";
  if (m === "image/png" || m === "image/jpeg" || m === "image/webp") return m;
  return "image/png";
}

function extForMime(mime) {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/webp") return "webp";
  return "png";
}

function splitDataUrl(raw) {
  const s = typeof raw === "string" ? raw.trim() : "";
  const m = /^data:([^;,]+);\s*base64,\s*(.*)$/is.exec(s);
  if (m) {
    return { mimeGuess: m[1].trim(), payload: m[2].replace(/\s/g, "") };
  }
  return { mimeGuess: null, payload: s.replace(/\s/g, "") };
}

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function providerUnavailableMessage(error) {
  const msg = asString(error?.message);
  const lower = msg.toLowerCase();
  if (
    lower.includes("not supported") ||
    lower.includes("does not support") ||
    lower.includes("unknown parameter") ||
    lower.includes("invalid model") ||
    lower.includes("image edit")
  ) {
    return "Controlled regeneration provider is not available yet.";
  }
  return msg || "Controlled regeneration provider is not available yet.";
}

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body", mode: "image_to_image" },
      { status: 400 }
    );
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body", mode: "image_to_image" },
      { status: 400 }
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !String(apiKey).trim()) {
    return NextResponse.json(
      {
        ok: false,
        error: "OPENAI_API_KEY is not configured on the server",
        mode: "image_to_image",
      },
      { status: 503 }
    );
  }

  const projectKey = asString(body.projectKey);
  const mode = asString(body.mode);
  const generationPackage =
    body.generationPackage && typeof body.generationPackage === "object" ? body.generationPackage : null;
  const semanticDraft = body.semanticDraft && typeof body.semanticDraft === "object" ? body.semanticDraft : null;
  const rawB64 = asString(body.sourceImageBase64);

  if (!projectKey) {
    return NextResponse.json(
      { ok: false, error: "Missing or empty projectKey", mode: "image_to_image" },
      { status: 400 }
    );
  }
  if (mode !== "image_to_image") {
    return NextResponse.json(
      { ok: false, error: "mode must be \"image_to_image\"", mode: "image_to_image" },
      { status: 400 }
    );
  }
  if (!generationPackage) {
    return NextResponse.json(
      { ok: false, error: "Missing generationPackage", mode: "image_to_image" },
      { status: 400 }
    );
  }
  if (!asString(generationPackage.promptRu) && !asString(generationPackage.promptEn)) {
    return NextResponse.json(
      { ok: false, error: "generationPackage must include promptRu or promptEn", mode: "image_to_image" },
      { status: 400 }
    );
  }
  if (!rawB64) {
    return NextResponse.json(
      { ok: false, error: "Missing or empty sourceImageBase64", mode: "image_to_image" },
      { status: 400 }
    );
  }

  const { mimeGuess, payload } = splitDataUrl(rawB64);
  if (!payload) {
    return NextResponse.json(
      { ok: false, error: "Invalid sourceImageBase64 payload", mode: "image_to_image" },
      { status: 400 }
    );
  }

  let buffer;
  try {
    buffer = Buffer.from(payload, "base64");
  } catch {
    return NextResponse.json(
      { ok: false, error: "Could not decode sourceImageBase64", mode: "image_to_image" },
      { status: 400 }
    );
  }
  if (!buffer.length) {
    return NextResponse.json(
      { ok: false, error: "Decoded image is empty", mode: "image_to_image" },
      { status: 400 }
    );
  }

  const mime = normalizeInboundMime(mimeGuess);
  const ext = extForMime(mime);
  let uploadable;
  try {
    uploadable = await toFile(buffer, `source.${ext}`, { type: mime });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to prepare image file for upload",
        mode: "image_to_image",
      },
      { status: 400 }
    );
  }

  const finalPrompt = buildControlledRegenerationPrompt(generationPackage, semanticDraft);
  const generationPackageId = asString(generationPackage.id);
  const parentImageId = asString(generationPackage.sourceImageId) || asString(body.parentImageId);

  try {
    const openai = new OpenAI({ apiKey: apiKey.trim() });
    const result = await openai.images.edit({
      model: MODEL,
      image: uploadable,
      prompt: finalPrompt,
      stream: false,
      input_fidelity: "high",
    });

    const b64_json = result?.data?.[0]?.b64_json;
    if (!b64_json || !String(b64_json).trim()) {
      return NextResponse.json(
        {
          ok: false,
          error: "OpenAI returned no image data",
          mode: "image_to_image",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      imageBase64: String(b64_json).trim(),
      model: MODEL,
      generationPackageId,
      parentImageId,
      metadata: {
        iterationType: "controlled_regeneration",
        preserveRules: Array.isArray(generationPackage.preserveRules) ? generationPackage.preserveRules : [],
        changeTargets: Array.isArray(generationPackage.changeTargets) ? generationPackage.changeTargets : [],
        goalRu: asString(generationPackage.goalRu),
        promptUsed: finalPrompt,
      },
    });
  } catch (e) {
    const providerMessage = providerUnavailableMessage(e);
    const status = providerMessage === "Controlled regeneration provider is not available yet." ? 503 : 502;
    return NextResponse.json(
      {
        ok: false,
        error: providerMessage,
        mode: "image_to_image",
      },
      { status }
    );
  }
}
