'use strict';
(()=>{
 function parse(content){
  if(typeof content!=='string'||content.length>12000)throw new Error('Choose a Zikap account recovery text file smaller than 12 KB.');
  const lines=content.replace(/^\uFEFF/,'').split(/\r?\n/);
  const emails=lines.filter(line=>line.startsWith('Email: ')),codes=lines.filter(line=>line.startsWith('Recovery code: '));
  if(lines[0]!=='Zikap account recovery'||emails.length!==1||codes.length!==1)throw new Error('This is not a Zikap account recovery file. A project receipt cannot recover an account.');
  const email=emails[0].slice(7).trim(),code=codes[0].slice(15).trim().toLowerCase();
  if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!/^[a-f0-9]{64}$/.test(code))throw new Error('The file needs one email address and one complete 64-character recovery code.');
  return {email,code};
 }
 function mount({file,email,code,message,alive}){
  let version=0,reading=false;
  function clear(){version++;reading=false;file.value='';code.value='';code.type='password';message.textContent='';}
  const edited=()=>{if(reading){version++;reading=false;file.value='';message.textContent='File reading cancelled. Your manual changes are kept.';}};
  email.addEventListener('input',edited);code.addEventListener('input',edited);
  file.addEventListener('change',async()=>{
   const selected=file.files?.[0],current=++version;reading=false;if(!selected||!alive())return;code.value='';code.type='password';reading=true;message.textContent='Reading your recovery file in this browser…';
   try{if(selected.size>12000)throw new Error('Choose a Zikap account recovery text file smaller than 12 KB.');const data=parse(await selected.text());if(current!==version||!alive())return;email.value=data.email;code.value=data.code;message.textContent='File opened in this browser. Enter a new password, then choose Recover account. The code is checked when you submit.';}
   catch(e){if(current===version&&alive())message.textContent=e.message||'The recovery file could not be read. You can enter your code manually.';}
   finally{if(current===version){reading=false;file.value='';}}
  });
  return {clear};
 }
 window.ZikapRecoveryFile={parse,mount};
})();
