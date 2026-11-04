import { z } from "zod";
export const profileSchema = z.object({ role: z.string().trim().min(1).max(100), level: z.string().max(80), job: z.string().max(10000), resume: z.string().max(15000), language: z.enum(["zh-CN", "en-US"]), tone: z.enum(["balanced", "pressure"]), turns: z.number().int().min(3).max(10), answerSeconds: z.number().int().min(30).max(180) });
export type Profile = z.infer<typeof profileSchema>;
export const defaultProfile: Profile = { role: "前端开发工程师", level: "应届 / 0–1 年", job: "", resume: "", language: "zh-CN", tone: "balanced", turns: 5, answerSeconds: 90 };
export const turnSchema = z.object({ id: z.string().max(100), question: z.string().max(3000), answer: z.string().max(8000), elapsedSeconds: z.number().min(0).max(3600), skipped: z.boolean() });
export type Turn = z.infer<typeof turnSchema>;
export const prepSchema = z.object({ headline: z.string(), topics: z.array(z.object({ id: z.string(), title: z.string(), priority: z.enum(["核心", "加分"]), summary: z.string(), points: z.array(z.string()), questions: z.array(z.string()), exercise: z.string() })).min(3).max(8), days: z.array(z.string()).min(3).max(7) });
export type PrepPlan = z.infer<typeof prepSchema>;
export const questionSchema = z.object({ question: z.string(), focus: z.string(), stage: z.string() });
export type InterviewQuestion = z.infer<typeof questionSchema>;
export type TutorMessage = { role: "user" | "assistant"; content: string };
export const tutorSchema = z.object({ answer: z.string(), nextQuestion: z.string() });
export const reportSchema = z.object({ summary: z.string(), dimensions: z.array(z.object({ name: z.string(), score: z.number().min(0).max(5), comment: z.string() })).min(3).max(5), strengths: z.array(z.string()), improvements: z.array(z.object({ quote: z.string(), issue: z.string(), action: z.string() })), practiceTasks: z.array(z.string()) });
export type Report = z.infer<typeof reportSchema>;

const topic = (id: string, title: string, summary: string, points: string[], questions: string[], exercise: string, priority: "核心" | "加分" = "核心") => ({ id, title, summary, points, questions, exercise, priority });
export function createExamplePlan(p: Profile): PrepPlan {
 const front = /前端|frontend|react|web/i.test(p.role), back = /后端|backend|java|python|服务端/i.test(p.role), product = /产品|product|运营/i.test(p.role);
 const topics = front ? [
  topic("js", "JavaScript 与异步机制", "把语言基础放回真实的页面与代码中。", ["作用域、闭包与引用关系", "Promise、微任务与事件循环", "结合具体 Bug 解释排查过程"], ["Promise 和 setTimeout 的执行顺序如何判断？", "什么情况下闭包会读到旧状态？"], "写一个防抖函数，并说明它在输入框搜索中的使用边界。"),
  topic("react", "React 组件与状态设计", "讲清楚数据如何流动，以及为什么这样拆组件。", ["状态归属与单向数据流", "Effect 的依赖与清理", "请求竞态、列表 key 与渲染"], ["哪些数据应放入 state，哪些可以直接计算？", "如何避免请求竞态显示旧结果？"], "画出搜索页的组件树，标明状态归属与请求取消逻辑。"),
  topic("browser", "浏览器、网络与性能", "将原理与一次可以验证的优化联系起来。", ["缓存策略与资源加载", "渲染流程与布局抖动", "性能指标、测量与验证"], ["你会怎样定位页面首屏加载慢？", "Cookie 与本地存储分别适合什么场景？"], "选择一个页面，列出定位性能瓶颈的三个步骤与验证指标。"),
 ] : back ? [
  topic("api", "接口设计与可靠性", "从请求进入到异常返回，解释完整链路。", ["输入校验与错误语义", "幂等、超时、重试与限流", "日志、指标与故障定位"], ["重复到达的请求应该怎样处理？", "一个请求突然变慢，你会先看什么？"], "设计创建订单接口，说明重复请求与依赖失败时的处理。"),
  topic("data", "数据库与一致性", "明确数据模型、查询方式与并发边界。", ["索引与查询计划", "事务和并发冲突", "缓存更新与数据过期"], ["索引为什么有时没有被使用？", "缓存和数据库更新如何协调？"], "为商品列表设计表结构和索引，说明查询路径。"),
  topic("system", "系统设计与取舍", "先说明约束，再比较可行方案。", ["请求量与数据规模估算", "同步与异步处理", "可用性、复杂度与成本"], ["什么情况下需要消息队列？", "怎样判断现在是否需要拆服务？"], "设计通知服务，给出简单方案和扩展触发条件。"),
 ] : product ? [
  topic("user", "用户问题与需求判断", "从具体场景识别真正需要解决的问题。", ["用户、场景与现有做法", "区分功能诉求与根本问题", "访谈证据与反例"], ["如何判断一个需求值得做？", "用户要的功能与你判断的问题不一致怎么办？"], "写出一个需求的用户、场景、问题和验证方式。"),
  topic("metrics", "指标与实验设计", "把业务目标拆成能够验证的变化。", ["目标与过程指标", "漏斗、分群与基准", "实验假设与结果解释"], ["功能上线后数据上涨，如何判断原因？", "活跃提升但留存下降，你会怎样分析？"], "为新手引导功能设计核心指标、护栏指标和验证方案。"),
  topic("delivery", "优先级与协作", "说明资源有限时怎样推动交付。", ["价值、成本与风险比较", "MVP 范围和验收", "分歧处理与推进过程"], ["设计和研发对方案有分歧怎么办？", "截止时间缩短一半，如何调整？"], "为三个需求排序，写明舍弃的内容和理由。"),
 ] : [
  topic("core", "岗位核心知识", "从职责中提取需要解释和应用的能力。", ["岗位职责中的关键概念", "每个概念对应一个应用例子", "明确自己的知识边界"], [`${p.role}最重要的三项能力是什么？`, "用实际场景解释一个专业概念。"], "选出岗位的三个关键要求，分别写出你的证据和不足。"),
  topic("problem", "专业问题解决", "把判断过程和验证方式表达清楚。", ["澄清目标与约束", "比较方案与取舍", "验证结果与复盘"], ["遇到不熟悉的问题，你会如何推进？", "如何判断自己的方案有效？"], "准备一个问题解决案例，写清楚问题、行动和结果。"),
  topic("team", "沟通与协作", "用真实经历说明怎样共同完成工作。", ["角色与责任边界", "沟通方式与分歧处理", "可核对的交付成果"], ["讲一次意见不一致的经历。", "资源不足时，你会如何协调推进？"], "回忆一次合作经历，标出个人贡献和团队贡献。"),
 ];
 topics.push(topic("project", "项目经历与证据表达", "让面试官听清楚你具体做了什么。", ["背景、目标与个人责任", "关键行动、备选方案与取舍", "真实结果、测量方式与复盘"], ["项目中你独立负责的部分是什么？", "重做一次，你会改变哪个决定？"], "准备一个 90 秒项目故事。没有数据时，诚实说明可验证的变化。"));
 topics.push(topic("ask", "岗位理解与反问", "通过具体问题了解团队和工作预期。", ["团队当前的关键目标", "岗位成功的判断标准", "入职后的协作方式"], ["为什么选择这个岗位？", "你希望了解团队的哪些信息？"], "准备三个能帮助你判断岗位是否适合自己的问题。", "加分"));
 return { headline: `围绕${p.role}，建立知识骨架，再用经历证明。`, topics, days: ["第 1 天 · 梳理核心概念，用自己的话解释每个知识点。", "第 2 天 · 补充真实案例，完成各模块的自测题。", "第 3 天 · 进行限时面试，针对复盘结果定向重练。"] };
}
export function createExampleQuestion(p: Profile, turns: Turn[], plan: PrepPlan): InterviewQuestion {
 const en = p.language === "en-US";
 if (!turns.length) return { question: en ? `Please introduce yourself in ${p.answerSeconds} seconds, focusing on experience relevant to the ${p.role} position.` : `请用 ${p.answerSeconds} 秒介绍自己，重点说明与${p.role}最相关的一段经历，以及你希望承担的工作。`, focus: "自我介绍", stage: "开场" };
 const last = turns[turns.length - 1];
 if (turns.length === 1 && !last.skipped) { const quote = last.answer.replace(/\s+/g, " ").slice(0, 44); return { question: en ? `You mentioned “${quote}”. What was your own responsibility, and what specific decision did you make?` : `刚才你提到“${quote}${last.answer.length > 44 ? "…" : ""}”。这部分你具体负责什么？请讲一个你亲自做出的决定。`, focus: "个人贡献", stage: "经历追问" }; }
 const t = plan.topics[Math.min(Math.max(turns.length - 2, 0), plan.topics.length - 1)];
 return { question: en ? ["Describe a challenging project problem. What alternatives did you consider, and why did you choose your solution?", "How did you check your solution worked? Separate measured results from assumptions.", "What would you do if your first approach failed under a tight deadline?"][Math.min(Math.max(turns.length - 2, 0), 2)] : t.questions[0], focus: t.title, stage: turns.length >= p.turns - 1 ? "综合判断" : "专业考察" };
}
export function createExampleReport(turns: Turn[]): Report { const a = turns.filter(t => !t.skipped && t.answer.trim()); return { summary: `你完成了 ${turns.length} 轮练习，其中 ${a.length} 轮提交了回答。这是本地练习记录，尚未评价专业正确性。`, dimensions: [{ name: "完成情况", score: turns.length ? Math.round(a.length / turns.length * 5) : 0, comment: "按实际提交的回答计算。" }, { name: "回答展开", score: a.length ? Math.min(5, Math.round(a.reduce((s,t) => s+t.answer.length, 0)/a.length/45)) : 0, comment: "仅按字数记录展开程度，不代表质量。" }, { name: "专业内容", score: 0, comment: "尚未连接模型，未评价。" }], strengths: a.length ? ["你已留下可回看的回答记录，可以逐题重练。"] : [], improvements: a.slice(0,3).map(t => ({ quote: t.answer.slice(0,100), issue: "检查是否交代了背景、个人行动和真实结果。", action: "重组为 60–90 秒回答，补充真实事例，不虚构数据。" })), practiceTasks: ["重练最难的一题。", "核对个人贡献与团队成果的边界。", "定向学习一个没有把握的知识点。"] }; }

const str = { type: "string" }, arr = (items: unknown) => ({ type: "array", items }), obj = (properties: Record<string, unknown>) => ({ type: "object", properties, required: Object.keys(properties), additionalProperties: false });
export const outputSchemas = {
 prepare: obj({ headline: str, topics: arr(obj({ id: str, title: str, priority: { type: "string", enum: ["核心", "加分"] }, summary: str, points: arr(str), questions: arr(str), exercise: str })), days: arr(str) }),
 question: obj({ question: str, focus: str, stage: str }), tutor: obj({ answer: str, nextQuestion: str }),
 report: obj({ summary: str, dimensions: arr(obj({ name: str, score: { type: "number", minimum: 0, maximum: 5 }, comment: str })), strengths: arr(str), improvements: arr(obj({ quote: str, issue: str, action: str })), practiceTasks: arr(str) }),
};
