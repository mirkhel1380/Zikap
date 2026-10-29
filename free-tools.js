'use strict';
(()=>{
 const $=id=>document.getElementById(id);
 const save=(name,body,type)=>{const url=URL.createObjectURL(new Blob([body],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
 function preview(){
  const title=$('snippet-title').value.trim(),description=$('snippet-description').value.trim();
  $('preview-title').textContent=title||'Your page title';$('preview-description').textContent=description||'Your page description';
  $('title-count').textContent=title.length+' characters · Approximately 30–60 is a common editing guide.';$('description-count').textContent=description.length+' characters · Approximately 70–160 is a common editing guide.';
  let url;try{url=new URL($('snippet-url').value);if(!['http:','https:'].includes(url.protocol))throw new Error();$('preview-host').textContent=url.hostname;$('preview-url').textContent=url.href;}catch{$('preview-host').textContent='Enter an HTTP or HTTPS URL';$('preview-url').textContent='';}return {title,description,url};
 }
 ['snippet-title','snippet-description','snippet-url'].forEach(id=>$(id).addEventListener('input',preview));preview();
 $('snippet-form').addEventListener('submit',e=>{e.preventDefault();const {title,description,url}=preview();if(!url||!['http:','https:'].includes(url.protocol)||url.username||url.password){$('snippet-message').textContent='Enter a complete HTTP or HTTPS page URL without login credentials.';return;}save('zikap-meta-tags.txt','<!-- Proposed title and description. Review before adding to your page head. -->\n<title>'+escape(title)+'</title>\n<meta name="description" content="'+escape(description)+'">\n','text/plain;charset=utf-8');$('snippet-message').textContent='Your tags were prepared for download. Your website has not been changed.';});
 function intent(k){
  const s=k.toLowerCase();if(/\b(buy|order|coupon|discount|book|hire)\b/.test(s))return 'Transactional suggestion';if(/\b(best|review|reviews|versus|vs|compare|comparison)\b/.test(s))return 'Commercial suggestion';if(/\b(how|what|why|when|where|guide|tips|tutorial)\b/.test(s))return 'Informational suggestion';if(/\b(login|log in|sign in)\b/.test(s))return 'Navigational suggestion';return 'Needs manual review';
 }
 const csv=s=>'"'+(/^[=+\-@\t\r]/.test(s)?"'":'')+s.replaceAll('"','""')+'"';
 $('keyword-form').addEventListener('submit',e=>{
  e.preventDefault();const input=$('keyword-input').value.split(/\r?\n/).map(k=>k.normalize('NFC').trim().replace(/\s+/g,' ')).filter(Boolean);$('keyword-message').textContent='';
  if(input.length>500||input.some(k=>k.length>200)){ $('keyword-message').textContent='Use up to 500 phrases, with no more than 200 characters per phrase.';return;}
  const seen=new Set(),rows=input.filter(k=>{const key=k.toLowerCase();if(seen.has(key))return false;seen.add(key);return true;}).map(k=>[k,intent(k)]);
  if(!rows.length){$('keyword-message').textContent='Paste at least one keyword phrase.';return;}
  const heading=document.createElement('h3');heading.textContent=rows.length+' unique keyword phrases';const summary=document.createElement('p');summary.textContent=(input.length-rows.length)+' duplicate entries removed. Intent labels are rule-based suggestions, not search-engine data.';
  const wrap=document.createElement('div');wrap.className='keyword-table-wrap';const table=document.createElement('table');table.className='keyword-table';const head=document.createElement('thead'),hr=document.createElement('tr');['Keyword','Suggested intent (English rules)'].forEach(t=>{const th=document.createElement('th');th.scope='col';th.textContent=t;hr.append(th);});head.append(hr);table.append(head);const body=document.createElement('tbody');rows.forEach(row=>{const tr=document.createElement('tr');row.forEach(value=>{const td=document.createElement('td');td.textContent=value;tr.append(td);});body.append(tr);});table.append(body);wrap.append(table);
  const button=document.createElement('button');button.className='btn';button.type='button';button.textContent='Download planning CSV';button.addEventListener('click',()=>save('zikap-keyword-plan.csv','\uFEFF'+[['Keyword','Suggested intent (English rules)'],...rows].map(row=>row.map(csv).join(',')).join('\r\n'),'text/csv;charset=utf-8'));
  $('keyword-output').replaceChildren(heading,summary,wrap,button);$('keyword-message').textContent='Your cleaned list is ready. No keywords were sent to a server.';
 });
 $('keyword-sample').addEventListener('click',()=>{$('keyword-input').value='gardening tips\nhow to start a garden\nbest gardening tools\nbuy garden tools\nGardening tips';$('keyword-form').requestSubmit();});
})();
