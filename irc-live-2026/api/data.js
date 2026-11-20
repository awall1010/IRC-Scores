const SHEET_ID = '1QvyVq5TvFaloM6L4Lsuyhved-CmhtEfV8GWyytOAmHc';
const SHEETS = Object.freeze({Games:0,Teams:1,Settings:2});
const CACHE_TTL_MS = 30000;
const MAX_STALE_MS = 10 * 60 * 1000;
// Warm Vercel instances retain a last-known-good response if Google has a short outage.
let lastGood = null;

function parseCSV(text) {
  const normalized = String(text).replace(/^\uFEFF/,'');
  const rows=[]; let row=[], cell='', quoted=false;
  for(let i=0;i<normalized.length;i++){
    const c=normalized[i];
    if(c==='"'){
      if(quoted&&normalized[i+1]==='"'){cell+='"';i++;}
      else quoted=!quoted;
    }else if(c===','&&!quoted){row.push(cell);cell='';}
    else if((c==='\r'||c==='\n')&&!quoted){
      if(c==='\r'&&normalized[i+1]==='\n')i++;
      row.push(cell);
      if(row.some(x=>String(x).trim()!==''))rows.push(row);
      row=[];cell='';
    }else{cell+=c;}
  }
  if(cell!==''||row.length){row.push(cell);if(row.some(x=>String(x).trim()!==''))rows.push(row);}
  const headers=(rows.shift()||[]).map(h=>h.trim());
  return rows.map(r=>Object.fromEntries(headers.map((h,i)=>[h,(r[i]??'').trim()])));
}

function validateTab(name, rows) {
  const required={Games:['GameID','Day','Time','Division','Home','Away'],Teams:['Division','Team'],Settings:['Setting','Value']}[name];
  if(!Array.isArray(rows)||!rows.length||required.some(k=>!Object.prototype.hasOwnProperty.call(rows[0],k)))
    throw Error(name+' returned unexpected or empty columns');
  return rows;
}

async function fetchCSV(url,name) {
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),8000);
  try{
    const resp=await fetch(url,{headers:{'Accept':'text/csv,text/plain,*/*'},redirect:'follow',signal:controller.signal});
    if(!resp.ok)throw Error('HTTP '+resp.status);
    const text=await resp.text();
    if(/^\s*(?:<!doctype html|<html|\{\s*"error")/i.test(text))throw Error('Google did not return CSV');
    return validateTab(name,parseCSV(text));
  }finally{clearTimeout(timeout);}
}

async function getSheet(name,gid) {
  const base='https://docs.google.com/spreadsheets/d/'+SHEET_ID;
  const urls=[
    base+'/export?format=csv&gid='+gid,
    base+'/gviz/tq?tqx=out%3Acsv&sheet='+encodeURIComponent(name)
  ];
  const errors=[];
  for(const url of urls) {
    try{return await fetchCSV(url,name);}
    catch(e){errors.push(e.name==='AbortError'?'timeout':e.message);}
  }
  throw Error(name+' unavailable ('+errors.join('; ')+')');
}

async function loadAll(){
  const [games,teams,settings]=await Promise.all(
    Object.entries(SHEETS).map(([name,gid])=>getSheet(name,gid))
  );
  return {games,teams,settings,source:'Google Sheets',fetchedAt:new Date().toISOString()};
}

module.exports=async function handler(req,res){
  res.setHeader('Content-Type','application/json; charset=utf-8');
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).end(JSON.stringify({error:'Method not allowed'}));}
  const now=Date.now();
  if(lastGood&&now-lastGood.at<CACHE_TTL_MS){
    res.setHeader('Cache-Control','public, s-maxage=20, stale-while-revalidate=60');
    return res.status(200).end(JSON.stringify(lastGood.payload));
  }
  try{
    const payload=await loadAll();
    lastGood={payload,at:Date.now()};
    res.setHeader('Cache-Control','public, s-maxage=20, stale-while-revalidate=60');
    return res.status(200).end(JSON.stringify(payload));
  }catch(e){
    console.error('IRC Sheet fetch failed:',e.message);
    if(lastGood&&Date.now()-lastGood.at<MAX_STALE_MS){
      res.setHeader('Cache-Control','no-store');
      return res.status(200).end(JSON.stringify({...lastGood.payload,stale:true,warning:'Google Sheets is temporarily unavailable; showing the last verified scores.'}));
    }
    res.setHeader('Cache-Control','no-store');
    return res.status(503).end(JSON.stringify({error:'Live data temporarily unavailable',detail:e.message,source:'Google Sheets'}));
  }
};
module.exports.parseCSV=parseCSV;
module.exports.validateTab=validateTab;
