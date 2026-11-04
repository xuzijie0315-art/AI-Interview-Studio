import { modelSettings, noStore as headers, sameOrigin } from "../../../lib/model-settings";
export async function POST(request: Request) {
 if (!sameOrigin(request)) return Response.json({ error: "请求来源无效。" }, { status: 403, headers });
 const key = modelSettings().key;
 if (!key) return Response.json({ error: "语音转写需要先接入模型。可使用浏览器语音或文字完成题库演练。" }, { status: 503, headers });
 if (Number(request.headers.get("content-length") || "0") > 13000000) return Response.json({ error: "录音过大，请缩短回答。" }, { status: 413, headers });
 try {
  const form = await request.formData(); const file = form.get("audio");
  if (!(file instanceof File) || file.size === 0 || file.size > 12000000 || !/^(audio\/|video\/webm)/.test(file.type)) return Response.json({ error: "录音格式或大小不符合要求。" }, { status: 400, headers });
  const upload = new FormData(); upload.append("file", file, file.name); const transcriptionModel = process.env.OPENAI_TRANSCRIPTION_MODEL || "gpt-transcribe"; upload.append("model", transcriptionModel); if (transcriptionModel === "whisper-1") upload.append("language", form.get("language") === "en-US" ? "en" : "zh");
  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", { method: "POST", signal: AbortSignal.timeout(55000), headers: { Authorization: `Bearer ${key}` }, body: upload });
  if (!response.ok) return Response.json({ error: "语音转写失败，请检查模型连接后重试；也可以输入回答。" }, { status: 502, headers });
  const data = await response.json() as { text?: string };
  if (!data.text?.trim()) return Response.json({ error: "没有识别到清晰的回答，请重新录音或输入文字。" }, { status: 422, headers });
  return Response.json({ text: data.text.slice(0,8000) }, { headers });
 } catch { return Response.json({ error: "语音转写超时或录音无法读取，请重试。" }, { status: 502, headers }); }
}
