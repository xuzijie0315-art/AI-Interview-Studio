import test from "node:test";
import assert from "node:assert/strict";
import { defaultProfile, createExamplePlan, createExampleQuestion, createExampleReport, prepSchema, questionSchema, reportSchema } from "../lib/interview.ts";
test("different roles produce appropriate learning modules", () => {
 const front = createExamplePlan(defaultProfile);
 const back = createExamplePlan({...defaultProfile,role:"Java 后端工程师"});
 assert(prepSchema.safeParse(front).success);
 assert(prepSchema.safeParse(back).success);
 assert(front.topics.some(t=>t.id==="react"));
 assert(back.topics.some(t=>t.id==="data"));
 assert(!back.topics.some(t=>t.id==="react"));
});
test("follow-up references the submitted answer", () => {
 const turns=[{id:"one",question:"介绍自己",answer:"我负责搜索页面的缓存设计。",elapsedSeconds:30,skipped:false}];
 const q=createExampleQuestion(defaultProfile,turns,createExamplePlan(defaultProfile));
 assert(questionSchema.safeParse(q).success);
 assert(q.question.includes(turns[0].answer));
 assert(q.question.includes("你具体负责什么"));
});
test("a skipped answer is not treated as evidence", () => {
 const q=createExampleQuestion(defaultProfile,[{id:"skip",question:"介绍自己",answer:"",elapsedSeconds:90,skipped:true}],createExamplePlan(defaultProfile));
 assert(!q.question.includes("刚才你提到"));
});
test("empty practice has no fabricated strengths or quotes", () => {
 const report=createExampleReport([{id:"skip",question:"问题",answer:"",elapsedSeconds:90,skipped:true}]);
 assert(reportSchema.safeParse(report).success);
 assert.deepEqual(report.strengths,[]);
 assert.deepEqual(report.improvements,[]);
 assert(report.dimensions.every(d=>d.score===0));
});
test("practice report quotes come from submitted answers", () => {
 const answer="我先用性能面板定位瓶颈，再对比修改前后的加载时间。";
 const report=createExampleReport([{id:"a",question:"怎样优化",answer,elapsedSeconds:45,skipped:false}]);
 assert(report.improvements.every(i=>answer.includes(i.quote)));
});
