// Download only the selected check's public-page evidence. Never serialize the account object.
const line=value=>String(value??'Not available').replace(/[\r\n\u2028\u2029]+/g,' ').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g,'').trim();
const when=value=>{const date=new Date(value);return value&&Number.isFinite(date.getTime())?date.toISOString():'Not available';};
export function sourceFindingsReport(check){
 const audit=check?.audit;if(!audit||!Array.isArray(audit.pages)||!Array.isArray(audit.findings)||!Array.isArray(audit.limitations)||!Array.isArray(audit.notices))throw Error('The saved source findings are incomplete. Refresh the saved check before downloading.');
 const out=['ZIKAP / SOURCE-HTML FINDINGS','Rule-based observations from a limited public-page sample. This is not an AI report or a full-site SEO audit.','',
  'Website: '+line(audit.finalUrl),'Checked at (UTC): '+when(audit.checkedAt),'Saved check expires (UTC): '+when(check.expiresAt),'Pages checked: '+audit.pages.filter(p=>p.checked===true).length+' / '+audit.pages.length+' sampled','Sample findings: '+audit.findings.length,'',
  'SCOPE',line(audit.scope),'','SAMPLED PAGES'];
 for(const [i,page]of audit.pages.entries()){
  out.push((i+1)+'. '+line(page.url),'   Result: '+(page.checked===true?'Source HTML checked':'Not analyzed')+(Number.isInteger(page.status)?' / HTTP '+page.status:''));
  if(page.checked===true&&page.title)out.push('   Page title: '+line(page.title));
  if(page.checked!==true&&page.reason)out.push('   Reason: '+line(page.reason));
 }
 out.push('','SOURCE FINDINGS');
 if(!audit.findings.length)out.push('No findings were raised in this sample. This does not certify the whole website as issue-free.');
 for(const [i,finding]of audit.findings.entries()){
  out.push('',''+(i+1)+'. '+line(finding.title),'Reference: '+line(finding.id),'Page: '+line(finding.url),'Category: '+line(finding.category)+' / Severity: '+line(finding.severity),'Evidence: '+line(finding.evidence),'Suggested review: '+line(finding.action));
  if(finding.review)out.push('Human review: Confirm intent before making changes.');
 }
 if(audit.notices.length){out.push('','CHECK NOTICES');for(const notice of audit.notices)out.push('- '+line(notice));}
 out.push('','LIMITATIONS');for(const limitation of audit.limitations)out.push('- '+line(limitation));
 out.push('- No Google indexing status, rankings, traffic, speed, keyword volume or backlink database was verified.','- These observations do not confirm that a fix has been made. No website changes, order or payment are created by this download.','',
  'YOUR DOWNLOAD','This file was prepared in your browser from the selected saved check. No new crawl or AI generation is required.','The saved check has its own expiry; this downloaded copy remains on your device until you remove it. Review it before sharing.','');
 return out.join('\n');
}
