'use strict';
(()=>{
 const $=id=>document.getElementById(id),reader=$('report-reader');if(!reader)return;let current=null,generation=0,titleBeforePrint=null;const sheet=document.createElement('section');sheet.id='report-print-sheet';document.body.append(sheet);
 const navigation=document.createElement('div'),label=document.createElement('label'),sections=document.createElement('select'),go=document.createElement('button');let targets=[];
 navigation.className='reader-navigation';navigation.hidden=true;label.htmlFor='reader-section';label.textContent='Jump to report section';sections.id='reader-section';go.type='button';go.className='btn ghost';go.textContent='Go to section';navigation.append(label,sections,go);reader.querySelector('.reader-toolbar').append(navigation);
 function resetNavigation(){targets=[];sections.replaceChildren();sections.disabled=true;go.disabled=true;navigation.hidden=true;}
 function buildNavigation(){
  resetNavigation();const headings=[...$('report-document').querySelectorAll('.report-section-heading')],overview=$('report-document').querySelector('h1');if(!headings.length||!overview)return;
  targets=[overview,...headings];for(const [index,target]of targets.entries()){const option=document.createElement('option');option.value=String(index);option.textContent=index===0?'Report overview':index+'. '+target.textContent;sections.append(option);}
  navigation.hidden=false;sections.disabled=false;go.disabled=false;
 }
 go.addEventListener('click',()=>{if(!reader.open||!current)return;const target=targets[Number(sections.value)];if(!target?.isConnected)return;target.tabIndex=-1;target.style.scrollMarginTop=(reader.querySelector('.reader-toolbar').offsetHeight+24)+'px';target.focus({preventScroll:true});target.scrollIntoView({block:'start',behavior:'instant'});});
 function restorePrint(){sheet.replaceChildren();document.body.classList.remove('report-printing');delete document.body.dataset.reportPaper;if(titleBeforePrint!==null){document.title=titleBeforePrint;titleBeforePrint=null;}}
 function cleanup(){generation++;current=null;resetNavigation();$('report-document').replaceChildren();$('reader-status').textContent='';restorePrint();}
 function close(){cleanup();if(reader.open)reader.close();}
 function preparePrint(){if(!reader.open||!current)return false;const copy=$('report-document').cloneNode(true);copy.id='report-print-document';sheet.replaceChildren(copy);if(titleBeforePrint===null)titleBeforePrint=document.title;document.title='Zikap - '+(current.packageTitle||'Specialist report');document.body.dataset.reportPaper=$('reader-paper').value==='letter'?'letter':'a4';document.body.classList.add('report-printing');return true;}
 async function open(order,options={}){
  close();const request=generation;if(!order||typeof order.report!=='string'||!order.report.trim())return;
  try{const {renderReport}=await import('/account/report-layout.mjs');if(request!==generation)return;renderReport($('report-document'),order,options);}
  catch{if(request!==generation)return;const pre=document.createElement('pre');pre.className='report-copy';pre.textContent=order.report;$('report-document').replaceChildren(pre);$('reader-status').textContent='The formatted view could not load. Your original report text is shown below.';}
  if(request!==generation)return;current={report:order.report,id:order.id,packageTitle:order.packageTitle};buildNavigation();reader.showModal();$('reader-close').focus();
 }
 $('reader-close').addEventListener('click',close);reader.addEventListener('close',()=>{if(!reader.open&&current)cleanup();});
 $('reader-download').addEventListener('click',()=>{if(!current)return;const url=URL.createObjectURL(new Blob([current.report],{type:'text/plain;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download='zikap-report-'+current.id+'.txt';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
 $('reader-print').addEventListener('click',()=>{if(!preparePrint())return;$('reader-status').textContent='In your browser, choose Save as PDF if available. Keep the selected paper size, use default margins and disable browser headers/footers if they duplicate the report footer. Page numbering depends on browser support.';try{window.print();}catch{restorePrint();$('reader-status').textContent='Printing could not open. Keep the report open and choose Print from your browser menu, or download the original text.';}});
 addEventListener('beforeprint',preparePrint);addEventListener('afterprint',restorePrint);document.addEventListener('zikap-session-cleared',close);
 window.ZikapReports={open,close};
})();
