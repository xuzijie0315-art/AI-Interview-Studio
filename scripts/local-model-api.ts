import type { Plugin } from "vite";
import { GET, POST } from "../app/api/interview/route";
import { POST as transcribe } from "../app/api/transcribe/route";

// Local development uses Node's fetch so the user's existing proxy is honored.
// Production uses the same handlers in the Cloudflare Worker routes.
export function localModelApi(): Plugin {
 return { name:"local-model-api",apply:"serve",enforce:"pre",configureServer(server) {
  server.middlewares.use(async(req,res,next)=>{
   const urlPath=(req.url||"").split("?")[0];
   if(!["/api/interview","/api/transcribe"].includes(urlPath))return next();
   try{
    if(req.method==="GET"&&urlPath==="/api/interview"){const r=GET();res.statusCode=r.status;r.headers.forEach((v,k)=>res.setHeader(k,v));res.end(await r.text());return;}
    if(req.method!=="POST"){res.statusCode=405;res.end();return;}
    const chunks:Buffer[]=[];let size=0;const limit=urlPath==="/api/transcribe"?13000000:100000;
    for await(const chunk of req){const buffer=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk);size+=buffer.length;if(size>limit){res.statusCode=413;res.end(JSON.stringify({error:"输入内容过长。"}));return;}chunks.push(buffer);}
    const h=new Headers();for(const [key,value]of Object.entries(req.headers)){if(value!==undefined)h.set(key,Array.isArray(value)?value.join(", "):value);}
    const request=new Request(`http://${req.headers.host}${req.url}`,{method:"POST",headers:h,body:Buffer.concat(chunks) as unknown as BodyInit});
    const result=await(urlPath==="/api/transcribe"?transcribe(request):POST(request));res.statusCode=result.status;result.headers.forEach((v,k)=>res.setHeader(k,v));res.end(await result.text());
   }catch{res.statusCode=500;res.setHeader("Content-Type","application/json");res.end(JSON.stringify({error:"本地接口暂时不可用，请重试。"}));}
  });
 }};
}
