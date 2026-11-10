const SHEET_ID = '1QvyVq5TvFaloM6L4Lsuyhved-CmhtEfV8GWyytOAmHc';
const SHEET_NAMES = ['Games','Teams','Settings'];

function parseCSV(text) {
  const rows=[]; let row=[], cell='', quoted=false;
  const normalized=text.replace(/^\uFEFF/,'');
  for(let i=0;i<normalized.length;i++) {
    const c=normalized[i];
    if(c==='"') {if(quoted && normalized[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
    else if(c===','&&!quoted){row.push(cell);cell='';}
    else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&normalized[i+1]==='\n')i++;row.push(cell);if(row.some(v=>v!==''))rows.push(row);row=[];cell='';}
    else cell+=c;
  }
  if(cell!==''||row.length){row.push(cell);rows.push(row);}
  const headers=rows.shift()||[];
  return rows.map(r=>Object.fromEntries(headers.map((h,i)=>[h.trim(),(r[i]||'').trim()])));
}
async function getSheet(sheet) {
  const url=`https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheet)}`;
  const response=await fetch(url,{headers:{'User-Agent':'RushIRC/1.0'},signal:AbortSignal.timeout(10000),redirect:'follow'});
  if(!response.ok)throw new Error(`Could not read ${sheet} (${response.status}).`);
  const text=await response.text();
  if(/^\s*<!doctype html|^\s*<html/i.test(text))throw new Error(`Google Sheets returned an access page for ${sheet}. Confirm public viewer access.`);
  const parsed=parseCSV(text);
  if(!parsed.length) throw new Error(`No records returned from ${sheet}.`);
  return parsed;
}
module.exports = async function handler(req,res){
  res.setHeader('Cache-Control','public, s-maxage=15');
  res.setHeader('Content-Type','application/json; charset=utf-8');
  if(req.method!=='GET')return res.status(405).end(JSON.stringify({error:'Method not allowed'}));
  try{
    const [games,teams,settings]=await Promise.all(SHEET_NAMES.map(getSheet));
    if(!games[0].GameID||!teams[0].Division||!settings[0].Setting)throw new Error('Unexpected spreadsheet structure. Check the Games, Teams and Settings tab headers.');
    return res.status(200).end(JSON.stringify({games,teams,settings,source:'Google Sheets',fetchedAt:new Date().toISOString()}));
  }catch(err){return res.status(503).end(JSON.stringify({error:'Live data temporarily unavailable',detail:err.message,source:'Google Sheets'}));}
};
module.exports.parseCSV=parseCSV;
