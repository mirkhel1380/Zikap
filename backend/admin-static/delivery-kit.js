'use strict';
(()=>{
 const requestedPages=order=>{try{const pages=Array.isArray(order.pages)?order.pages:JSON.parse(order.pages||'[]');return Array.isArray(pages)?pages.filter(x=>typeof x==='string'&&x.trim()).slice(0,5):[];}catch{return [];}};
 const steps={
  audit:['Confirm up to 5 public URLs, access limitations and the agreed review date.','For each reviewed page, record source evidence and distinguish observed issues from checks not performed.','Prioritize real findings, explain the reason and give a specific action and verification method.'],
  keywords:['Confirm one topic, language, target market and the business purpose of the research.','Prepare 25 distinct, relevant keyword ideas with intent, business-fit notes and topic groups.','Map the groups to up to 5 existing or proposed pages and record the method and sources. Do not invent search volume or difficulty.'],
  onpage:['Confirm up to 3 existing pages and the purpose of each page.','Compare current evidence with proposed titles, descriptions, headings and content edits.','Recommend internal links with source, destination and reason. Clearly label proposed work; no direct publishing is included.'],
  bundle:['Confirm the technical URLs (up to 5) and the selected on-page URLs (up to 3); agree on the latter rather than silently choosing them.','Complete the technical findings, 25 keyword ideas and a map to up to 5 pages.','Complete the on-page briefs and combine priorities without counting repeated recommendations as separate work.']
 };
 function guide(order){return steps[order.package_id]?[...steps[order.package_id],'Agree scope, required inputs, delivery date and time zone with the customer before work begins. Record the actual agreement in the customer-visible project update.','Before delivery, check every scoped page or explain its access limitation, replace every [ADD ...] field, verify sources and preview the report.','Keep internal notes private. Save the actual finished report through the existing delivery controls; one clarification/revision applies to the original scope.']:[];}
 function outline(order,p){
  if(!p||!steps[order.package_id])return '';
  const pages=requestedPages(order),parts=['DRAFT REPORT — REPLACE EVERY [ADD ...] BEFORE DELIVERY','Zikap / '+(order.package_title||p.title),'Website: '+order.website,'Scope: '+p.scope,'Language: '+order.language+' / Market: '+order.market,'','REQUEST CONTEXT','Customer topic: '+(order.topic||'Not supplied'),'Customer goals: '+(order.goals||'Not supplied'),'Requested URLs (not proof that a page was reviewed):',...(pages.length?pages:['[ADD confirm the requested URLs or keyword topic]']),'','REVIEW CONTEXT','Review date: [ADD date]','Agreed review scope: [ADD confirm exact pages and topic]','Method and access limitations: [ADD what was checked and what was not]','','SUMMARY','[ADD main observations and priorities supported by evidence]'];
  if(['audit','bundle'].includes(order.package_id)){
   parts.push('','TECHNICAL PAGE COVERAGE');
   for(const [i,url]of (pages.length?pages:['[ADD scoped page URL]']).entries())parts.push('Page '+(i+1)+': '+url,'Review status and access evidence: [ADD reviewed or unavailable, date and reason]');
   parts.push('','TECHNICAL FINDINGS','Repeat this block only for actual findings:','Affected URL: [ADD URL]','Observation and evidence: [ADD evidence]','Priority and reason: [ADD priority]','Recommended action: [ADD action]','Verification: [ADD how to verify]','Checks with no issue observed: [ADD checks and evidence]','Checks not performed: [ADD limitations]');
  }
  if(['keywords','bundle'].includes(order.package_id)){
   parts.push('','KEYWORD IDEAS','Topic: '+(order.topic||'[ADD confirmed topic]'),'For each idea: phrase | intent | business relevance | topic group. No live volume or difficulty data.');
   for(let i=1;i<=25;i++)parts.push(String(i).padStart(2,'0')+'. [ADD phrase, intent, relevance and group]');
   parts.push('','PAGE MAP (UP TO 5 PAGES)','[ADD target page, assigned group, existing/new decision and rationale]','Research method: [ADD sources, date and validation approach]');
  }
  if(['onpage','bundle'].includes(order.package_id)){
   parts.push('','ON-PAGE EDIT BRIEFS (UP TO 3 EXISTING PAGES)');
   const selected=pages.length&&pages.length<=3?pages:Array.from({length:3},()=> '[ADD confirm selected on-page URL from the agreed scope]');
   for(const [i,url]of selected.entries())parts.push('','On-page brief '+(i+1),'Page URL: '+url,'Page purpose: [ADD purpose]','Current observation and evidence: [ADD evidence]','Proposed title: [ADD title]','Proposed meta description: [ADD description]','Proposed heading/content edits: [ADD recommendations]','Internal links: [ADD source, target and reason]','Implementation status: [ADD what is proposed versus actually implemented]');
  }
  parts.push('','PRIORITIZED NEXT STEPS','[ADD action, responsible person and verification]','','LIMITATIONS AND HANDOFF','[ADD exclusions, open questions and next decision]','One clarification/revision within the agreed scope is included. Rankings, traffic and revenue are not guaranteed.');return parts.join('\n');
 }
 window.ZikapDeliveryKit={requestedPages,guide,outline};
})();
