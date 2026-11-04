export function modelSettings() {
 return { key: process.env.OPENAI_API_KEY, model: process.env.OPENAI_MODEL || "gpt-4.1-mini" };
}
export function interviewModelSettings() {
 const deepseekKey = process.env.DEEPSEEK_API_KEY;
 if (deepseekKey) {
  return {
   provider: "deepseek" as const,
   key: deepseekKey,
   model: process.env.DEEPSEEK_MODEL || "deepseek-flash",
   endpoint: "https://api.deepseek.com/responses",
  };
 }
 return { provider: "openai" as const, ...modelSettings(), endpoint: "https://api.openai.com/v1/responses" };
}
export const noStore = { "Cache-Control": "no-store" };
export function sameOrigin(request: Request) { const o = request.headers.get("origin"); return !o || new URL(o).host === new URL(request.url).host; }
