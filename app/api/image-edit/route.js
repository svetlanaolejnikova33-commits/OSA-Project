import { NextResponse } from "next/server";
import OpenAI from "openai";
import { toFile } from "openai/uploads";

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

/**
 * Strip optional data URL prefix; return { mimeGuess, payload } base64 chars only.
 */
function splitDataUrl(raw) {
  const s = typeof raw === "string" ? raw.trim() : "";
  const m = /^data:([^;,]+);\s*base64,\s*(.*)$/is.exec(s);
  if (m) {
    return { mimeGuess: m[1].trim(), payload: m[2].replace(/\s/g, "") };
  }
  return { mimeGuess: null, payload: s.replace(/\s/g, "") };
}

function buildInteriorEditPrompt(editInstruction) {
  return [
    "Edit the provided interior image while preserving the original room geometry, camera angle, composition, lighting logic, perspective, and main furniture placement.",
    "Apply only the requested changes.",
    "Do not redesign the whole room.",
    "Do not change unrelated objects.",
    "Keep the result photorealistic and suitable for interior design presentation.",
    "",
    "Requested changes:",
    editInstruction.trim(),
    "",
    "No text, no watermark, no logos.",
  ].join("\n");
}

/**
 * Image-to-image edit via OpenAI. Always JSON; never exposes API key.
 */
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

  const projectKey = typeof body.projectKey === "string" ? body.projectKey.trim() : "";
  const sourceVisualId = body.sourceVisualId != null ? String(body.sourceVisualId).trim() : "";
  const sourceImageId = body.sourceImageId != null ? String(body.sourceImageId).trim() : "";
  const editInstruction = typeof body.editInstruction === "string" ? body.editInstruction.trim() : "";
  const editMode = typeof body.editMode === "string" ? body.editMode.trim() : "";
  const rawB64 =
    typeof body.sourceImageBase64 === "string" ? body.sourceImageBase64.trim() : "";

  if (!projectKey) {
    return NextResponse.json(
      { ok: false, error: "Missing or empty projectKey", mode: "image_to_image" },
      { status: 400 }
    );
  }
  if (!sourceVisualId) {
    return NextResponse.json(
      { ok: false, error: "Missing or empty sourceVisualId", mode: "image_to_image" },
      { status: 400 }
    );
  }
  if (!sourceImageId) {
    return NextResponse.json(
      { ok: false, error: "Missing or empty sourceImageId", mode: "image_to_image" },
      { status: 400 }
    );
  }
  if (!editInstruction) {
    return NextResponse.json(
      { ok: false, error: "Missing or empty editInstruction", mode: "image_to_image" },
      { status: 400 }
    );
  }
  if (editMode !== "image_to_image") {
    return NextResponse.json(
      { ok: false, error: "editMode must be \"image_to_image\"", mode: "image_to_image" },
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
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to prepare image file for upload",
        mode: "image_to_image",
      },
      { status: 400 }
    );
  }

  // TODO:
  // connect alternative image editing providers here if needed (fallback / A/B).
  // input: source buffer + editInstruction (+ optional masks)
  // output: resultImageBase64

  try {
    const openai = new OpenAI({ apiKey: apiKey.trim() });
    const result = await openai.images.edit({
      model: MODEL,
      image: uploadable,
      prompt: buildInteriorEditPrompt(editInstruction),
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
      sourceVisualId,
      editMode: "image_to_image",
    });
  } catch (e) {
    const msg =
      e && typeof e.message === "string" && e.message.trim()
        ? e.message.trim()
        : "OpenAI image edit request failed";
    return NextResponse.json(
      {
        ok: false,
        error: msg,
        mode: "image_to_image",
      },
      { status: 502 }
    );
  }
}
