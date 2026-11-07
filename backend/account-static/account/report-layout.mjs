// Plain-text reports only: never interpret HTML, execute links, or fetch remote assets.
export function reportBlocks(value){
 const lines=String(value).match(/[^\n]*(?:\n|$)/g)||[],blocks=[];let buffer='',fenced=false;
 const flush=()=>{if(buffer){blocks.push({kind:'text',raw:buffer});buffer='';}};
 for(const raw of lines){if(!raw)continue;const line=raw.replace(/\r?\n$/,'');
  if(/^\s*```/.test(line)){buffer+=raw;fenced=!fenced;continue;}
  const heading=!fenced&&line.length<=100&&!/^https?:\/\//i.test(line)&&(/^#{1,3}\s+\S/.test(line)||(/^[A-Z][A-Z0-9 &/(),:.-]{3,89}$/.test(line)&&/[A-Z]{3}/.test(line)));
  if(heading){flush();blocks.push({kind:'heading',raw});}else{buffer+=raw;if(!line.trim())flush();}
 }
 flush();return blocks;
}
export function renderReport(host,order,{logo='/account/zikap-logo.svg',status=order.status||''}={}){
 const doc=host.ownerDocument,node=(tag,text,cls)=>{const n=doc.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};host.replaceChildren();
 const brand=node('div',null,'report-brand'),image=node('img');image.src=logo;image.alt='Zikap';image.width=132;image.height=36;brand.append(image,node('span','SPECIALIST REPORT','eyebrow'));
 const title=node('h1',order.packageTitle||'Specialist report'),meta=node('dl',null,'report-metadata');
 const date=new Date(order.updatedAt),updated=Number.isNaN(date.getTime())?String(order.updatedAt||'Not recorded'):date.toLocaleString();
 for(const [label,value]of [['Website',order.website],['Project ID',order.id],['Project status',status],['Project updated',updated]])meta.append(node('dt',label),node('dd',String(value||'Not recorded')));
 const body=node('div',null,'report-content');for(const block of reportBlocks(order.report)){const text=block.raw.replace(/\r?\n$/,'');if(!text.trim())continue;body.append(block.kind==='heading'?node('h2',text.replace(/^#{1,3}\s+/,''),'report-section-heading'):node('p',text,'report-copy'));}
 host.append(brand,title,meta,node('p','The saved specialist report, formatted for reading. Download text for the original plain-text version.','report-intro'),body,node('p','Zikap / Private customer report','report-document-footer'));
}
