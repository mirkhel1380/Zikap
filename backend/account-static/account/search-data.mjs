// Local-only analysis of a single English Search Console Queries or Pages CSV.
export function parseSearchCSV(source){
 if(typeof source!=='string'||source.length>1000000)throw new Error('Choose a CSV smaller than 1 MB.');
 const table=[];let row=[],cell='',quoted=false,ended=false;
 const endCell=()=>{row.push(cell);cell='';ended=false;};
 const endRow=()=>{endCell();if(row.some(v=>v.trim()))table.push(row);row=[];if(table.length>5001)throw new Error('Use at most 5,000 data rows.');};
 const text=source.replace(/^\uFEFF/,'');
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(quoted){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{quoted=false;ended=true;}}else cell+=c;}
  else if(c==='"'){if(cell||ended)throw new Error('Invalid CSV quoting.');quoted=true;}
  else if(c===',')endCell();
  else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;endRow();}
  else{if(ended)throw new Error('Invalid text after a quoted CSV field.');cell+=c;}
 }
 if(quoted)throw new Error('The CSV contains an unfinished quoted field.');if(cell||row.length)endRow();
 if(table.length<2)throw new Error('The CSV needs headings and at least one data row.');
 const headers=table.shift().map(v=>v.trim().toLowerCase()),dimension=headers[0];
 if(!['top queries','query','queries','top pages','page','pages'].includes(dimension))throw new Error('Use the English Queries.csv or Pages.csv from a single-period Search Console export.');
 if(new Set(headers).size!==headers.length||headers.slice(1).some(h=>!['clicks','impressions','ctr','position'].includes(h)))throw new Error('Use a single-period export with Clicks, Impressions and Position columns. Comparison exports are not supported.');
 const index=Object.fromEntries(headers.map((v,i)=>[v,i]));if(!['clicks','impressions','position'].every(h=>Object.hasOwn(index,h)))throw new Error('Missing Clicks, Impressions or Position column.');
 const number=(raw,integer,line)=>{const v=raw.trim();if(!(integer?/^(?:\d+|\d{1,3}(?:,\d{3})+)$/:/^\d+(?:\.\d+)?$/).test(v))throw new Error('Invalid metric on data row '+line+'. Use English numeric values without K or M suffixes.');const n=Number(v.replaceAll(',',''));if(!Number.isFinite(n)||n>1e12||(integer&&!Number.isSafeInteger(n)))throw new Error('Metric out of range on data row '+line+'.');return n;};
 const seen=new Set(),rows=table.map((values,i)=>{
  const line=i+1;if(values.length!==headers.length)throw new Error('Unexpected number of columns on data row '+line+'.');
  const label=values[0].trim();if(!label||label.length>1000||seen.has(label))throw new Error('Empty, duplicate or oversized label on data row '+line+'.');seen.add(label);
  const clicks=number(values[index.clicks],true,line),impressions=number(values[index.impressions],true,line),position=number(values[index.position],false,line);
  if(clicks>impressions||(!impressions&&position!==0)||position>1000)throw new Error('Inconsistent metrics on data row '+line+'.');
  return {label,clicks,impressions,ctr:impressions?100*clicks/impressions:0,position};
 });
 return {dimension:dimension.includes('quer')?'Queries':'Pages',rows};
}
export function summarize(rows){
 const clicks=rows.reduce((n,r)=>n+r.clicks,0),impressions=rows.reduce((n,r)=>n+r.impressions,0);
 return {clicks,impressions,ctr:impressions?100*clicks/impressions:0,position:impressions?rows.reduce((n,r)=>n+r.position*r.impressions,0)/impressions:null};
}
export function exportSearchCSV(rows,dimension){
 const cell=value=>'"'+String(value).replace(/^[\s]*[=+@\-]/,"'$&").replaceAll('"','""')+'"';
 return [[dimension,'Clicks','Impressions','CTR (%)','Position'],...rows.map(r=>[r.label,r.clicks,r.impressions,r.ctr.toFixed(2),r.position])].map(row=>row.map(cell).join(',')).join('\r\n');
}
