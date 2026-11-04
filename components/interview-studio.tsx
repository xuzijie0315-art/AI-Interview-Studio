"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, AudioLines, BookOpen, Check, ChevronDown, ChevronRight, Clock3, Download, FileText, History, LoaderCircle, Mic, MicOff, Pause, Play, Plus, Send, Settings2, ShieldCheck, Sparkles, Square, Target, Volume2, VolumeX, X } from "lucide-react";
import { createExamplePlan, createExampleQuestion, createExampleReport, defaultProfile, profileSchema, prepSchema, reportSchema, turnSchema, type InterviewQuestion, type PrepPlan, type Profile, type Report, type TutorMessage, type Turn } from "@/lib/interview";

type View = "prepare" | "interview" | "report" | "history";
type Engine = "ai" | "demo";
type ModelCapabilities = { available: boolean; speechMode: "browser" | "server" };
type RecordItem = { id: string; date: string; profile: Profile; turns: Turn[]; report: Report; engine: Engine };
type Recognition = { lang: string; continuous: boolean; interimResults: boolean; start(): void; stop(): void; abort(): void; onresult: ((e: { results: ArrayLike<{ isFinal: boolean; [n: number]: { transcript: string } }> }) => void) | null; onerror: ((e: { error: string }) => void) | null; onend: (() => void) | null };
type SpeechWindow = Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
const storageKey = "linchang.practice.v1";

export default function InterviewStudio() {
 const [view, setView] = useState<View>("prepare"), [profile, setProfile] = useState<Profile>(defaultProfile), [editing, setEditing] = useState<Profile>(defaultProfile), [setup, setSetup] = useState(false);
 const [plan, setPlan] = useState<PrepPlan>(() => createExamplePlan(defaultProfile)), [planEngine, setPlanEngine] = useState<Engine>("demo"), [selected, setSelected] = useState("js"), [mastered, setMastered] = useState<string[]>([]);
 const [capabilities, setCapabilities] = useState<ModelCapabilities | null>(null);
 const [forceDemo, setForceDemo] = useState(false), [busy, setBusy] = useState(""), [notice, setNotice] = useState(""), [messages, setMessages] = useState<TutorMessage[]>([]), [tutorInput, setTutorInput] = useState("");
 const configured = capabilities?.available ?? null;
 const available = forceDemo ? false : configured;
 const serverSpeech = capabilities?.speechMode === "server";
 const [question, setQuestion] = useState<InterviewQuestion | null>(null), [turns, setTurns] = useState<Turn[]>([]), [draft, setDraft] = useState(""), [engine, setEngine] = useState<Engine>("demo"), [active, setActive] = useState(false), [paused, setPaused] = useState(false), [remaining, setRemaining] = useState(90), [recording, setRecording] = useState(false), [speaking, setSpeaking] = useState(false), [autoRead, setAutoRead] = useState(true), [endDialog, setEndDialog] = useState(false);
 const [report, setReport] = useState<Report | null>(null), [records, setRecords] = useState<RecordItem[]>([]), [loaded, setLoaded] = useState(false), [lastFailed, setLastFailed] = useState(false);
 const activeRef = useRef(false), generationRef = useRef(0), sendingRef = useRef(false), remainingRef = useRef(90), turnsRef = useRef<Turn[]>([]), draftRef = useRef("");
 const recorderRef = useRef<MediaRecorder | null>(null), streamRef = useRef<MediaStream | null>(null), recognitionRef = useRef<Recognition | null>(null), discardRef = useRef(false), autoSubmitRef = useRef(false);
 const submitRef = useRef<(text: string, skipped?: boolean) => void>(() => {}), finishRef = useRef<(t: Turn[]) => void>(() => {}), chatEndRef = useRef<HTMLDivElement>(null);
 const item = plan.topics.find(t => t.id === selected) ?? plan.topics[0];
 useEffect(() => { activeRef.current = active; }, [active]);
 useEffect(() => { remainingRef.current = remaining; }, [remaining]);
 useEffect(() => { turnsRef.current = turns; }, [turns]);
 useEffect(() => { draftRef.current = draft; }, [draft]);
 useEffect(() => {
  fetch("/api/interview")
   .then(r => r.json())
   .then(response => {
    const data = response as Partial<ModelCapabilities>;
    setCapabilities({
     available: data.available === true,
     speechMode: data.speechMode === "browser" ? "browser" : "server",
    });
   })
   .catch(() => setCapabilities({ available: false, speechMode: "browser" }));
  try { const saved = JSON.parse(localStorage.getItem(storageKey) || "null"); if (saved) {
   const p = profileSchema.safeParse(saved.profile); if (p.success) { setProfile(p.data); setEditing(p.data); const next = createExamplePlan(p.data); setPlan(next); setSelected(next.topics[0].id); }
   if (Array.isArray(saved.records)) setRecords(saved.records.filter((r: RecordItem) => typeof r.id === "string" && typeof r.date === "string" && profileSchema.safeParse(r.profile).success && reportSchema.safeParse(r.report).success && Array.isArray(r.turns) && r.turns.length <= 10 && r.turns.every(t => turnSchema.safeParse(t).success) && ["ai","demo"].includes(r.engine)).slice(0,10));
  } } catch { /* Corrupted local storage starts clean. */ } setLoaded(true);
  return () => { discardRef.current = true; generationRef.current++; recognitionRef.current?.abort(); if (recorderRef.current?.state === "recording") recorderRef.current.stop(); streamRef.current?.getTracks().forEach(t => t.stop()); window.speechSynthesis?.cancel(); };
 }, []);
 useEffect(() => { if (loaded) try { localStorage.setItem(storageKey, JSON.stringify({ profile, records })); } catch { setNotice("浏览器存储空间不足，本次记录可能无法保存。请导出复盘。 "); } }, [profile, records, loaded]);
 useEffect(() => { if (messages.length || busy === "tutor") chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [messages, busy]);
 useEffect(() => { if (!notice) return; const t = setTimeout(() => setNotice(""), 9000); return () => clearTimeout(t); }, [notice]);
 useEffect(() => {
  if (!active || !question || paused || busy || recording && !activeRef.current) return;
  const timer = setInterval(() => setRemaining(s => Math.max(0,s-1)), 1000); return () => clearInterval(timer);
 }, [active, question, paused, busy, recording]);
 useEffect(() => {
  if (!active || !question || paused || busy || remaining > 0 || sendingRef.current) return;
  if (recording) { autoSubmitRef.current = true; if (recorderRef.current?.state === "recording") recorderRef.current.stop(); else recognitionRef.current?.stop(); }
  else submitRef.current(draftRef.current, !draftRef.current.trim());
 }, [remaining, active, question, paused, busy, recording]);

 function stopVoice(discard = true) { discardRef.current = discard; recognitionRef.current?.abort(); recognitionRef.current = null; if (recorderRef.current?.state === "recording") recorderRef.current.stop(); streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null; setRecording(false); window.speechSynthesis?.cancel(); setSpeaking(false); }
 function speak(text: string) {
  if (!("speechSynthesis" in window)) { setNotice("当前浏览器不支持朗读，请阅读屏幕中的问题。 "); return; }
  window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = profile.language; u.rate = profile.tone === "pressure" ? 1.02 : .95;
  const voice = window.speechSynthesis.getVoices().find(v => v.lang.toLowerCase().startsWith(profile.language === "zh-CN" ? "zh" : "en")); if (voice) u.voice = voice;
  u.onstart = () => setSpeaking(true); u.onend = () => setSpeaking(false); u.onerror = () => { setSpeaking(false); }; window.speechSynthesis.speak(u);
 }
 async function model<T>(action: string, extra: Record<string, unknown> = {}): Promise<T> {
  const r = await fetch("/api/interview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, profile, turns: turnsRef.current, ...extra }), signal: AbortSignal.timeout(65000) });
  const data = await r.json() as {error?:string;data?:T}; if (!r.ok) throw new Error(data.error || "请求未完成，请重试。"); if (!data.data) throw new Error("回复为空，请重试。"); return data.data;
 }
 function fail(e: unknown) { setNotice(e instanceof Error ? e.message : "请求未完成，请重试。"); }
 async function generatePlan() {
  if (busy) return; if (!profile.role.trim()) { setSetup(true); return; } setBusy("plan");
  try { const result = available ? await model<PrepPlan>("prepare", { turns: [] }) : createExamplePlan(profile); const checked = prepSchema.parse(result); setPlan(checked); setPlanEngine(available ? "ai" : "demo"); setSelected(checked.topics[0].id); setMastered([]); setMessages([]); if (!available) setNotice("当前展示本地题库准备清单；接入模型后可依据你的具体经历生成。 "); } catch(e) { fail(e); } finally { setBusy(""); }
 }
 async function askTutor(text = tutorInput) {
  const content = text.trim();
  if (!available || !content || busy) return;

  const next: TutorMessage[] = [...messages, { role: "user", content }];
  setMessages(next);
  setTutorInput("");
  setBusy("tutor");
  try {
   const result = await model<{ answer: string; nextQuestion: string }>("tutor", { topic: item.title, messages: next.slice(-20), turns: [] });
   const reply = result.answer + (result.nextQuestion ? `\n\n自测一下：${result.nextQuestion}` : "");
   setMessages([...next, { role: "assistant", content: reply }]);
  } catch (e) {
   fail(e);
   setTutorInput(content);
   setMessages(messages);
  } finally {
   setBusy("");
  }
 }
 async function nextQuestion(completed: Turn[], selectedEngine: Engine, generation = generationRef.current) {
  setBusy("question"); setLastFailed(false); setQuestion(null);
  try { const next = selectedEngine === "ai" ? await model<InterviewQuestion>("question", { turns: completed }) : createExampleQuestion(profile,completed,plan); if (generation !== generationRef.current) return; setQuestion(next); setDraft(""); draftRef.current = ""; remainingRef.current = profile.answerSeconds; setRemaining(profile.answerSeconds); if (autoRead) speak(next.question); }
  catch(e) { if (generation === generationRef.current) { fail(e); setLastFailed(true); } }
  finally { if (generation === generationRef.current) { setBusy(""); sendingRef.current = false; } }
 }
 async function startInterview() {
  if (busy || !profile.role.trim()) return; stopVoice(); generationRef.current++; turnsRef.current = []; setTurns([]); setReport(null); setPaused(false); setDraft(""); setView("interview"); setActive(true); activeRef.current=true; const mode = available ? "ai" : "demo"; setEngine(mode); await nextQuestion([],mode);
 }
 async function finish(completed: Turn[]) {
  const generation = generationRef.current; stopVoice(); setActive(false); activeRef.current=false; setBusy("report"); setView("report"); setReport(null); setLastFailed(false); sendingRef.current=true;
  try { const next = engine === "ai" ? await model<Report>("report", { turns: completed }) : createExampleReport(completed); if (generation !== generationRef.current) return; setReport(next); const saved = { id: crypto.randomUUID(), date: new Date().toISOString(), profile, turns: completed, report: next, engine }; setRecords(r => [saved,...r].slice(0,10)); }
  catch(e) { if (generation === generationRef.current) { fail(e); setLastFailed(true); } }
  finally { if (generation === generationRef.current) { setBusy(""); sendingRef.current=false; } }
 }
 finishRef.current=finish;
 async function submitAnswer(text: string, skipped = false) {
  if (!question || sendingRef.current || busy || !activeRef.current) return; if (!text.trim() && !skipped) { setNotice("请先回答，或选择跳过此题。 "); return; }
  sendingRef.current=true; stopVoice(); const next = [...turnsRef.current,{ id: crypto.randomUUID(), question: question.question, answer: skipped ? "" : text.trim().slice(0,8000), elapsedSeconds: profile.answerSeconds - remainingRef.current, skipped }]; turnsRef.current=next; setTurns(next); setDraft(""); setQuestion(null);
  if (next.length >= profile.turns) await finish(next); else await nextQuestion(next,engine);
 }
 submitRef.current=submitAnswer;
 async function toggleRecording() {
  if (recording) { if (recorderRef.current?.state === "recording") recorderRef.current.stop(); else recognitionRef.current?.stop(); return; }
  if (!question || busy || paused) return; window.speechSynthesis?.cancel(); setSpeaking(false); discardRef.current=false; autoSubmitRef.current=false;
  const generation=generationRef.current;
  if (engine === "demo" || !serverSpeech) {
   const R=(window as SpeechWindow).SpeechRecognition || (window as SpeechWindow).webkitSpeechRecognition;
   if (!R) { setNotice("当前浏览器不支持语音识别，可以直接输入回答。"); return; }
   const recognition=new R(); recognitionRef.current=recognition; recognition.lang=profile.language; recognition.continuous=true; recognition.interimResults=true; const base=draft.trim();
   recognition.onresult=e=>{ if (discardRef.current || generation !== generationRef.current) return; const text=Array.from(e.results).map(r=>r[0].transcript).join(""); const value=(base?base+" ":"")+text; draftRef.current=value; setDraft(value); };
   recognition.onerror=e=>{ if (e.error !== "aborted") setNotice("浏览器语音未能完成转写。请检查麦克风权限与网络，或输入回答。 "); setRecording(false); };
   recognition.onend=()=>{ setRecording(false); if (autoSubmitRef.current && !discardRef.current && generation===generationRef.current) submitRef.current(draftRef.current,!draftRef.current.trim()); };
   try { recognition.start(); setRecording(true); } catch { setNotice("无法启动浏览器语音，请重试或输入回答。 "); } return;
  }
  try {
   if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) { setNotice("当前浏览器无法录音，请使用支持录音的浏览器并通过 HTTPS 或 localhost 打开。 "); return; }
   const stream=await navigator.mediaDevices.getUserMedia({audio:true}); if (generation!==generationRef.current || !activeRef.current) { stream.getTracks().forEach(t=>t.stop()); return; } streamRef.current=stream;
   const mime=["audio/webm;codecs=opus","audio/mp4","audio/ogg;codecs=opus"].find(x=>MediaRecorder.isTypeSupported(x)); const recorder=new MediaRecorder(stream,mime?{mimeType:mime}:undefined); recorderRef.current=recorder; const chunks:Blob[]=[];
   recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
   recorder.onstop=async()=>{ stream.getTracks().forEach(t=>t.stop()); setRecording(false); if(discardRef.current || generation!==generationRef.current)return; setBusy("transcribe"); const data=new FormData(); const type=recorder.mimeType; data.append("audio",new Blob(chunks,{type}),type.includes("mp4")?"answer.m4a":type.includes("ogg")?"answer.ogg":"answer.webm"); data.append("language",profile.language);
    try { const r=await fetch("/api/transcribe",{method:"POST",body:data,signal:AbortSignal.timeout(65000)}); const result=await r.json() as {text:string;error?:string}; if(!r.ok)throw new Error(result.error); if(generation!==generationRef.current)return; draftRef.current=result.text; setDraft(result.text); setBusy(""); if(autoSubmitRef.current) { sendingRef.current=false; setTimeout(()=>submitRef.current(result.text),0); } else setNotice("转写完成。可以修改识别文字，再提交回答。 "); }
    catch(e){if(generation===generationRef.current){fail(e);setPaused(true);autoSubmitRef.current=false;}}
    finally{if(generation===generationRef.current)setBusy("");}
   }; recorder.start(1000); setRecording(true);
  } catch { setNotice("麦克风没有开启，请检查浏览器权限和设备占用；你仍可输入回答。 "); }
 }
 function navigate(next: View) { if (active || busy) { setNotice("请先结束当前面试或等待请求完成，再切换页面。 "); return; } setView(next); }
 function saveProfile() { const checked=profileSchema.safeParse(editing); if(!checked.success){setNotice("请填写目标岗位，并检查内容长度。 ");return;}setProfile(checked.data);const next=createExamplePlan(checked.data);setPlan(next);setPlanEngine("demo");setSelected(next.topics[0].id);setMastered([]);setMessages([]);setSetup(false); }
 function exportReport() { if(!report)return; const content=`# 临场 · 面试复盘\n\n岗位：${profile.role}\n模式：${engine==="ai"?"AI 面试":"本地题库示例"}\n\n${report.summary}\n\n## 练习建议\n${report.practiceTasks.map(x=>`- ${x}`).join("\n")}\n\n## 逐题记录\n${turns.map((t,i)=>`### ${i+1}. ${t.question}\n\n${t.skipped?"本题跳过":t.answer}\n`).join("\n")}\n\n## 具体改进\n${report.improvements.map(i=>`${i.quote?`原回答：${i.quote}\n`:""}${i.issue}\n建议：${i.action}`).join("\n\n")}`;const a=document.createElement("a");const url=URL.createObjectURL(new Blob([content],{type:"text/markdown;charset=utf-8"}));a.href=url;a.download=`临场-面试复盘-${new Date().toLocaleDateString("sv-SE")}.md`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000); }
 const sourceBadge=<><span className={`source-badge ${available?"connected":""}`}><i/>{available===null?"检查配置中":available?"模型凭据已配置":"本地题库模式"}</span>{configured&&<button className="mode-toggle" disabled={active||Boolean(busy)} onClick={()=>setForceDemo(v=>!v)}>{forceDemo?"使用模型":"切换题库"}</button>}</>;

 return <div className={`studio ${view==="interview"&&active?"immersive":""}`}>
  <aside className="sidebar"><a className="brand" href="/" onClick={e=>{e.preventDefault();navigate("prepare");}}><span className="brand-mark"><AudioLines size={21}/></span><span>临场<small>INTERVIEW STUDIO</small></span></a><div className="workspace-label">我的面试工作台</div><nav aria-label="主导航"><button className={view==="prepare"?"selected":""} onClick={()=>navigate("prepare")}><BookOpen size={18}/>文字准备室<span>01</span></button><button className={view==="interview"?"selected":""} onClick={()=>navigate("interview")}><AudioLines size={18}/>语音面试室<span>02</span></button><button className={view==="history"||view==="report"?"selected":""} onClick={()=>navigate("history")}><History size={18}/>练习记录<span>{records.length.toString().padStart(2,"0")}</span></button></nav><div className="sidebar-note"><span className="tiny-orbit">✳</span><p>准备时，慢慢弄懂。<br/>临场时，清楚表达。<br/>准备好了，才不烧心</p><span>每一次练习，都有下一步。</span></div><div className="sidebar-bottom"><ShieldCheck size={15}/><span>练习记录保存在本浏览器</span></div></aside>
  <div className="workspace"><header className="topbar"><div className="breadcrumb">我的工作台<ChevronRight size={14}/><strong>{view==="prepare"?"文字准备室":view==="interview"?"语音面试室":view==="report"?"本次复盘":"练习记录"}</strong></div><div className="top-actions">{sourceBadge}<button className="icon-btn" title="岗位与面试设置" aria-label="岗位与面试设置" disabled={active||Boolean(busy)} onClick={()=>{setEditing(profile);setSetup(true);}}><Settings2 size={18}/></button><span className="user-mark">我</span></div></header>
   {notice&&<div role="status" className="toast"><span>{notice}</span><button aria-label="关闭提示" onClick={()=>setNotice("")}><X size={16}/></button></div>}
   <main>
   {view==="prepare"&&<>
    <section className="page-intro"><div><span className="eyebrow">PREPARE WITH PURPOSE</span><h1>先把知识讲明白，<br/><span>再把自己讲清楚。</span></h1><p>从岗位出发，找到该学什么，也知道该怎么练。</p></div><div className="intro-stamp"><BookOpen size={30}/><span>文字准备室</span><small>理解 · 自测 · 补齐</small></div></section>
    <section className="target-card"><div className="target-icon"><Target size={24}/></div><div className="target-copy"><small>当前准备目标</small><h2>{profile.role}<span>{profile.level}</span></h2><p>{profile.job?"已添加岗位描述":"添加岗位描述，让准备更贴近这一次机会"}{profile.resume?" · 已添加个人经历":""}</p></div><button className="btn light" onClick={()=>{setEditing(profile);setSetup(true);}}><Settings2 size={15}/>调整目标</button><button className="btn primary" disabled={Boolean(busy)} onClick={generatePlan}>{busy==="plan"?<LoaderCircle className="spin" size={16}/>:<Sparkles size={16}/>}生成准备清单</button></section>
    <div className="section-heading"><div><span className="eyebrow">YOUR KNOWLEDGE MAP</span><h2>这次面试，需要准备什么</h2></div><span className="subtle">{planEngine==="ai"?"根据你的资料生成":"本地题库示例"} · 已自评掌握 {mastered.length}/{plan.topics.length}</span></div>
    <div className="learning-grid">
     <section className="module-panel">
      <div className="module-list">{plan.topics.map((t, i) => <button key={t.id} className={`module-item ${item.id === t.id ? "active" : ""}`} disabled={busy === "tutor"} onClick={() => { setSelected(t.id); setMessages([]); }}>
       <span className={`module-num ${mastered.includes(t.id) ? "done" : ""}`}>{mastered.includes(t.id) ? <Check size={16}/> : String(i + 1).padStart(2, "0")}</span>
       <span><strong>{t.title}</strong><small>{t.priority}能力 · {t.points.length} 个知识点</small></span>
       <ChevronRight size={16}/>
      </button>)}</div>
      <div className="module-footer"><span>掌握度由你自己确认</span><div className="progress"><i style={{ width: `${mastered.length / plan.topics.length * 100}%` }}/></div></div>
     </section>
     <section className="knowledge-detail">
      <div className="detail-top">
       <span className="tag">{item.priority}准备</span>
       <label className="mastery"><input type="checkbox" checked={mastered.includes(item.id)} onChange={() => setMastered(m => m.includes(item.id) ? m.filter(x => x !== item.id) : [...m, item.id])}/>我能独立解释</label>
      </div>
      <h2>{item.title}</h2>
      <p className="detail-summary">{item.summary}</p>
      <div className="knowledge-points">{item.points.map((point, index) => <div key={index}><Check size={16}/><span>{point}</span></div>)}</div>
      <div className="knowledge-practice">
       <section className="self-test">
        <span className="eyebrow">CHECK YOUR UNDERSTANDING</span>
        <h3>先做自测</h3>
        <ol>{item.questions.map((question, index) => {
         const prompt = <><span className="question-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><span>{question}</span></>;
         return <li key={index}>{available
          ? <button type="button" className="question-row" disabled={Boolean(busy)} onClick={() => askTutor(`请讲解这道题，并告诉我需要补充什么知识：${question}`)}>{prompt}<ArrowUpRight size={15}/></button>
          : <div className="question-row">{prompt}</div>}
         </li>;
        })}</ol>
       </section>
       <section className="knowledge-exercise">
        <span className="eyebrow">PUT IT INTO PRACTICE</span>
        <h3>动手练一次</h3>
        <p>{item.exercise}</p>
       </section>
      </div>
      <section className="module-tutor" aria-label="知识陪练">
       <div className="tutor-heading">
        <div className="small-mark"><Sparkles size={17}/></div>
        <div><h3>知识陪练</h3><p>{available ? "可以点自测题请 AI 讲解，也可以提交自己的答案。" : "想听逐题讲解或点评答案？"}</p></div>
        {available ? <span className="tag">AI 讲解</span> : configured && <button className="btn light" type="button" disabled={Boolean(busy)} onClick={() => setForceDemo(false)}>切到 AI 讲解</button>}
       </div>
       {available && <>
        {!messages.length && <div className="quick-prompts">
         {["从基础讲起", "给一个实际例子", "出一道自测题"].map(prompt => <button key={prompt} type="button" disabled={Boolean(busy)} onClick={() => askTutor(`关于${item.title}，${prompt}。`)}>{prompt}<Plus size={12}/></button>)}
        </div>}
        {(messages.length > 0 || busy === "tutor") && <div className="tutor-conversation" aria-live="polite">
         {messages.map((m, i) => <div key={i} className={`tutor-message ${m.role}`}><small>{m.role === "user" ? "你" : "AI 知识教练"}</small><p>{m.content}</p></div>)}
         {busy === "tutor" && <div className="thinking"><LoaderCircle className="spin" size={15}/>正在整理讲解…</div>}
         <div ref={chatEndRef}/>
        </div>}
        <form className="tutor-input" onSubmit={e => { e.preventDefault(); askTutor(); }}>
         <input aria-label="向知识教练提问" maxLength={6000} value={tutorInput} onChange={e => setTutorInput(e.target.value)} placeholder="例如：这个概念在项目里怎么用？"/>
         <button aria-label="发送问题" disabled={Boolean(busy) || !tutorInput.trim()}><ArrowRight size={19}/></button>
        </form>
        <small className="source-note">AI 讲解请结合资料核对，重要知识点建议实际验证。</small>
       </>}
      </section>
     </section>
    </div>
   </>}
   {view==="interview"&&!active&&<>
    <section className="page-intro"><div><span className="eyebrow">PRACTICE UNDER PRESSURE</span><h1>给自己一次，<br/><span>正式面试的预演。</span></h1><p>开口回答，接受追问。在练习中熟悉临场节奏。</p></div><div className="intro-stamp"><AudioLines size={32}/><span>语音面试室</span><small>倾听 · 回答 · 追问</small></div></section>
    <section className="interview-lobby"><div className="lobby-visual"><span className="room-label"><i/>INTERVIEW ROOM 01</span><div className="avatar-orbit"><div className="interviewer-avatar"><span>林</span><small>INTERVIEWER</small></div><span className="orbit-dot"/></div><div className="waveform">{Array.from({length:31},(_,i)=><i key={i} style={{height:`${10+Math.sin(i*1.6)**2*23}px`}}/>)}</div><p>把这里当作真正的面试现场。</p></div><div className="lobby-content"><span className="eyebrow">BEFORE YOU BEGIN</span><h2>本场面试</h2><dl><div><dt>目标岗位</dt><dd>{profile.role}</dd></div><div><dt>语言 / 风格</dt><dd>{profile.language==="zh-CN"?"中文":"English"} · {profile.tone==="pressure"?"严谨追问":"专业平稳"}</dd></div><div><dt>练习节奏</dt><dd>{profile.turns} 轮 · 每题 {profile.answerSeconds} 秒</dd></div></dl><div className="room-rules"><p><Check size={14}/>面试中只提问，结束后再给建议</p><p><Check size={14}/>问题出现即计时，可手动暂停</p><p><Check size={14}/>语音转写后，可修改再提交</p></div><label className="mastery"><input type="checkbox" checked={autoRead} onChange={e=>setAutoRead(e.target.checked)}/>自动朗读面试官的问题</label><button className="btn primary start-btn" disabled={Boolean(busy)} onClick={startInterview}><Mic size={18}/>{available?"开始语音面试":"开始题库语音演练"}<ArrowRight size={17}/></button><button className="text-button" onClick={()=>{setEditing(profile);setSetup(true);}}>调整面试设置<Settings2 size={13}/></button><p className="privacy-note">麦克风仅在点击语音按钮后开启。
     {available && serverSpeech
      ? "音频会发送给转写服务。应用将复盘保存在当前浏览器。"
      : "语音由浏览器语音服务识别，是否可用取决于浏览器及网络。"}
     {available && !serverSpeech && "提交的回答文字会发送给模型。"}
    </p></div></section>
   </>}
   {view==="interview"&&active&&<section className="live-room"><div className="live-top"><span className="live-label"><i/>{engine==="ai"?"正式模拟":"题库演练 · 非 AI 推理"}</span><span>{profile.role} / {profile.tone==="pressure"?"严谨追问":"专业平稳"}</span><button className="room-exit" disabled={Boolean(busy)} onClick={()=>setEndDialog(true)}>结束面试<X size={14}/></button></div><div className="live-body"><aside className="interviewer-pane"><div className="avatar-orbit small"><div className={`interviewer-avatar ${speaking?"is-speaking":""}`}><span>林</span><small>INTERVIEWER</small></div></div><h3>林 · 模拟面试官</h3><p>{speaking?"正在提问…":busy==="question"?"正在准备下一题…":recording?"正在听你的回答":"等待你的回答"}</p><div className={`waveform ${recording||speaking?"animated":""}`}>{Array.from({length:25},(_,i)=><i key={i} style={{height:`${7+Math.sin(i*1.8)**2*28}px`,animationDelay:`${i*35}ms`}}/>)}</div><div className="interview-stats"><span>本场进度<strong>{Math.min(turns.length+1,profile.turns)}<small> / {profile.turns}</small></strong></span><span>作答时间<strong className={remaining<=15?"urgent":""}>{formatTime(remaining)}</strong></span></div><div className="round-dots">{Array.from({length:profile.turns},(_,i)=><i key={i} className={i<turns.length?"completed":i===turns.length?"current":""}/>)}</div><p className="room-note">专注当下这一题。<br/>回答结构和知识反馈会在结束后呈现。</p></aside><div className="question-pane"><div className="question-meta"><span>QUESTION {String(Math.min(turns.length+1,profile.turns)).padStart(2,"0")}</span><span>{question?.stage||"准备中"}</span></div>{question?<><h2>{question.question}</h2><div className="question-tools"><button disabled={recording} onClick={()=>speaking?(window.speechSynthesis.cancel(),setSpeaking(false)):speak(question.question)}>{speaking?<VolumeX size={14}/>:<Volume2 size={14}/>} {speaking?"停止朗读":"重听问题"}</button><button disabled={recording||Boolean(busy)} onClick={()=>{window.speechSynthesis?.cancel();setSpeaking(false);setPaused(v=>!v);}}>{paused?<Play size={14}/>:<Pause size={14}/>} {paused?"继续面试":"暂停计时"}</button><button disabled={Boolean(busy)||recording} onClick={()=>submitAnswer("",true)}>跳过此题<ChevronRight size={14}/></button></div><div className={`answer-area ${recording?"recording":""}`}><div className="answer-area-label"><span>{recording?<><i className="record-dot"/>正在录音，请自然作答</>:paused?"面试已暂停":"你的回答"}</span><span>{draft.length}/8000</span></div><textarea aria-label="本题回答" maxLength={8000} value={draft} disabled={recording||Boolean(busy)} onChange={e=>setDraft(e.target.value)} placeholder="点击下方麦克风开始回答。转写文字会出现在这里，也可以直接输入。"/><div className="answer-bottom"><button className={`record-btn ${recording?"active":""}`} disabled={Boolean(busy)||paused} onClick={toggleRecording}>{recording?<Square size={16}/>:<Mic size={17}/>} {recording?"结束录音":"开始语音回答"}</button><button className="submit-answer" disabled={!draft.trim()||Boolean(busy)||recording||paused} onClick={()=>submitAnswer(draft)}>提交回答<ArrowRight size={17}/></button></div></div><p className="answer-hint">{engine === "demo"
     ? "当前使用本地题库。浏览器会识别语音，也可以直接输入回答。"
     : serverSpeech
      ? "录音结束后可检查转写内容，再提交给面试官。"
      : "浏览器会识别语音。可以修改转写文字，也可以直接输入回答。"}
    </p></>:<div className="question-loading">{busy?<><LoaderCircle className="spin" size={28}/><h3>{busy==="transcribe"?"正在转写回答":"面试官正在准备问题"}</h3><p>回答会保留，请稍候。</p></>:<><h3>下一题未能生成</h3><p>已提交的回答仍保留。</p><button className="btn primary" onClick={()=>nextQuestion(turns,engine)}>重试下一题</button>{engine==="ai"&&<button className="text-button" onClick={()=>{setEngine("demo");nextQuestion(turns,"demo");}}>切换到明确标注的题库演练</button>}</>}</div>}</div></div></section>}
   {view==="report"&&<><section className="compact-intro"><span className="eyebrow">REFLECT & IMPROVE</span><div><h1>把这次练习，变成下一次进步。</h1>{report&&<button className="btn light" onClick={exportReport}><Download size={15}/>导出复盘</button>}</div><p>{profile.role} · {engine==="ai"?"AI 练习反馈":"本地题库记录，未进行 AI 内容评价"}</p></section>{!report?<div className="empty-state">{busy?<><LoaderCircle className="spin" size={30}/><h2>正在整理本次复盘</h2><p>对照你的实际回答，整理下一步的练习方向。</p></>:<><h2>复盘尚未生成</h2><p>回答记录已保留，可重新生成或先导出记录。</p><button className="btn primary" onClick={()=>finish(turns)}>重新生成复盘</button><button className="btn light" onClick={()=>{setEngine("demo");const r=createExampleReport(turns);setReport(r);}}>查看本地练习记录</button></>}</div>:<><section className="report-summary"><div className="small-mark"><Check size={24}/></div><div><span className="eyebrow">SESSION COMPLETE</span><h2>你完成了这次练习。</h2><p>{report.summary}</p></div><div className="report-numbers"><span><strong>{turns.length}</strong>轮练习</span><span><strong>{turns.filter(t=>!t.skipped).length}</strong>次回答</span></div></section><div className="report-grid"><section className="report-card"><h3>回答表现</h3><p className="subtle">{engine==="ai"?"仅作练习参考，每项满分 5 分":"本地统计，不代表专业能力"}</p>{report.dimensions.map((d,i)=><div className="dimension" key={i}><div><strong>{d.name}</strong><span>{engine==="demo"&&d.name==="专业内容"?"未评价":`${d.score}/5`}</span></div><div className="progress"><i style={{width:`${d.score/5*100}%`}}/></div><p>{d.comment}</p></div>)}</section><section className="report-card"><h3>下一次，重点练这几件事</h3>{report.practiceTasks.map((t,i)=><div className="practice-task" key={i}><span>0{i+1}</span><p>{t}</p></div>)}{report.strengths.length>0&&<div className="strengths"><h4>可以保留的做法</h4>{report.strengths.map((s,i)=><p key={i}><Check size={13}/>{s}</p>)}</div>}</section></div><section className="report-card evidence-card"><div className="section-heading"><h3>回到你的原回答</h3><span className="subtle">具体证据，具体修改</span></div>{report.improvements.length?report.improvements.map((r,i)=><div className="improvement" key={i}>{r.quote&&<blockquote>“{r.quote}”</blockquote>}<div><strong>{r.issue}</strong><p>{r.action}</p></div></div>):<p className="subtle">当前回答不足以形成具体改写建议，建议先完成更多有效回答。</p>}</section><section className="report-card transcript"><h3>逐题记录</h3>{turns.map((t,i)=><details key={t.id}><summary><span>0{i+1}</span>{t.question}<small>{t.skipped?"已跳过":`${t.elapsedSeconds} 秒`}</small><ChevronDown size={15}/></summary><p>{t.skipped?"本题没有提交回答。":t.answer}</p></details>)}</section><div className="report-actions"><button className="btn light" onClick={()=>setView("prepare")}><BookOpen size={16}/>回准备室补齐知识</button><button className="btn primary" onClick={()=>{setView("interview");setQuestion(null);}}>再练一次<ArrowUpRight size={16}/></button></div></>}</>}
   {view==="history"&&<><section className="compact-intro"><span className="eyebrow">YOUR PRACTICE JOURNAL</span><div><h1>每一次开口，都留下进步的线索。</h1><button className="btn primary" onClick={()=>navigate("interview")}><Plus size={16}/>新建练习</button></div><p>最近 10 次完整复盘保存在当前浏览器中。</p></section>{!records.length?<div className="empty-state"><History size={35}/><h2>你的第一份复盘，正在等你。</h2><p>完成一次模拟面试，就能在这里回看回答和练习建议。</p><button className="btn primary" onClick={()=>navigate("interview")}>开始第一次练习<ArrowRight size={16}/></button></div>:<div className="history-grid">{records.map(r=><button key={r.id} className="history-card" onClick={()=>{setProfile(r.profile);setTurns(r.turns);turnsRef.current=r.turns;setReport(r.report);setEngine(r.engine);setView("report");}}><div><span className="tag">{r.engine==="ai"?"AI 面试":"题库演练"}</span><ArrowUpRight size={18}/></div><h2>{r.profile.role}</h2><p>{r.profile.level} · {r.turns.length} 轮</p><div className="history-date"><Clock3 size={13}/>{new Date(r.date).toLocaleString("zh-CN",{month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"})}<span>查看复盘</span></div></button>)}</div>}</>}
   </main><footer className="page-footer"><span>临场 · 让准备有方向，让表达有底气</span><span>练习反馈仅供学习参考</span></footer>
  </div>
  {setup&&<div className="modal-backdrop" onClick={e=>{if(e.target===e.currentTarget)setSetup(false);}}><section className="setup-modal" role="dialog" aria-modal="true" aria-labelledby="setup-title"><header><div><span className="eyebrow">MAKE IT YOURS</span><h2 id="setup-title">这一次，你准备面试什么？</h2></div><button className="icon-btn" aria-label="关闭设置" onClick={()=>setSetup(false)}><X size={20}/></button></header><form onSubmit={e=>{e.preventDefault();saveProfile();}}><div className="form-row"><label>目标岗位<input required maxLength={100} value={editing.role} onChange={e=>setEditing({...editing,role:e.target.value})} placeholder="例如：前端开发工程师"/></label><label>经验阶段<select value={editing.level} onChange={e=>setEditing({...editing,level:e.target.value})}>{["应届 / 0–1 年","初级 / 1–3 年","中级 / 3–5 年","资深 / 5 年以上","转岗准备"].map(s=><option key={s}>{s}</option>)}</select></label></div><label>岗位描述 <small>可选 · 粘贴招聘要求，帮助确定考察范围</small><textarea rows={3} maxLength={10000} value={editing.job} onChange={e=>setEditing({...editing,job:e.target.value})} placeholder="岗位职责、技能要求、你最关心的能力…"/></label><label>你的相关经历 <small>可选 · 保留与岗位有关的项目和贡献即可</small><textarea rows={3} maxLength={15000} value={editing.resume} onChange={e=>setEditing({...editing,resume:e.target.value})} placeholder="做过什么项目？你具体负责什么？有哪些真实结果？"/></label><div className="form-row"><label>面试语言<select value={editing.language} onChange={e=>setEditing({...editing,language:e.target.value as Profile["language"]})}><option value="zh-CN">中文</option><option value="en-US">English</option></select></label><label>面试风格<select value={editing.tone} onChange={e=>setEditing({...editing,tone:e.target.value as Profile["tone"]})}><option value="balanced">专业平稳</option><option value="pressure">严谨追问 · 更有临场压力</option></select></label></div><div className="form-row"><label>面试轮数<select value={editing.turns} onChange={e=>setEditing({...editing,turns:Number(e.target.value)})}>{[3,5,8,10].map(n=><option key={n} value={n}>{n} 轮</option>)}</select></label><label>每题作答时间<select value={editing.answerSeconds} onChange={e=>setEditing({...editing,answerSeconds:Number(e.target.value)})}>{[60,90,120,180].map(n=><option key={n} value={n}>{n} 秒</option>)}</select></label></div><p className="privacy-note"><ShieldCheck size={14}/>资料保存在本浏览器。使用真实 AI 时，岗位、经历和相关回答会提交给模型服务，请移除无关的个人敏感信息。</p><div className="modal-actions"><button type="button" className="btn light" onClick={()=>setSetup(false)}>取消</button><button className="btn primary">保存目标<Check size={16}/></button></div></form></section></div>}
  {endDialog&&<div className="modal-backdrop"><section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="end-title"><h2 id="end-title">结束这次面试？</h2><p>会根据已提交的 {turns.length} 轮回答生成复盘。当前尚未提交的内容不会计入。</p><div className="modal-actions"><button className="btn light" onClick={()=>setEndDialog(false)}>继续回答</button><button className="btn primary" onClick={()=>{setEndDialog(false);generationRef.current++;finishRef.current(turnsRef.current);}}>结束并复盘</button></div></section></div>}
 </div>;
}
