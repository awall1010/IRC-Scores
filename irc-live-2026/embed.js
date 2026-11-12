(() => {
'use strict';
const $=id=>document.getElementById(id);
const GAME_DATES={FRI:'2026-11-20',SAT:'2026-11-21',SUN:'2026-11-22'};
const DAY_NAMES={FRI:'Friday, Nov 20',SAT:'Saturday, Nov 21',SUN:'Sunday, Nov 22'};
const REGION_LOGOS={
  west:'/assets/team-logos/west.png',canada:'/assets/team-logos/canada.png',
  ne:'/assets/team-logos/northeast.png',northeast:'/assets/team-logos/northeast.png',
  midwest:'/assets/team-logos/midwest.png',south:'/assets/team-logos/south.png',
  bolivia:'/assets/team-logos/international.png',international:'/assets/team-logos/international.png'
};
let lastPayload=null;
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function hasScore(g){return String(g.HomeScore??'').trim()!==''&&String(g.AwayScore??'').trim()!==''&&Number.isFinite(Number(g.HomeScore))&&Number.isFinite(Number(g.AwayScore));}
function status(g){const s=String(g.Status||'').toLowerCase().trim();if(s==='live'||s==='in progress')return 'Live';if(s==='cancelled'||s==='canceled')return 'Cancelled';if(s==='delayed')return 'Delayed';return hasScore(g)?'Final':'Upcoming';}
function gameMinute(g){const m=String(g.Time||'').match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);if(!m)return 9999;return (Number(m[1])%12+(m[3].toUpperCase()==='PM'?12:0))*60+Number(m[2]);}
function localClock(){const now=new Date();const p=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hour:'numeric',minute:'2-digit',hour12:false}).formatToParts(now);const x=Object.fromEntries(p.map(t=>[t.type,t.value]));return {date:x.year+'-'+x.month+'-'+x.day,minute:(Number(x.hour)%24)*60+Number(x.minute)};}
function pick(games){
  const clock=localClock(),ordered=[...games].filter(g=>GAME_DATES[g.Day]).sort((a,b)=>GAME_DATES[a.Day].localeCompare(GAME_DATES[b.Day])||gameMinute(a)-gameMinute(b)||String(a.Field).localeCompare(String(b.Field)));
  let target=Object.keys(GAME_DATES).find(d=>GAME_DATES[d]===clock.date);
  if(!target){target=Object.keys(GAME_DATES).find(d=>GAME_DATES[d]>clock.date)||'SUN';}
  const group=ordered.filter(g=>g.Day===target&&status(g)!=='Cancelled');
  const isToday=clock.date===GAME_DATES[target];
  const live=group.filter(g=>status(g)==='Live');
  const next=group.filter(g=>status(g)==='Upcoming'&&(!isToday||gameMinute(g)>=clock.minute-100));
  const nextSlot=next.length?gameMinute(next[0]):null;
  const soon=nextSlot===null?[]:next.filter(g=>gameMinute(g)===nextSlot);
  const follow=nextSlot===null?[]:next.filter(g=>gameMinute(g)>nextSlot).slice(0,Math.max(0,6-live.length-soon.length));
  let selection=[...live,...soon,...follow].slice(0,8);
  let heading='Live & upcoming matches';
  let subtitle=DAY_NAMES[target];
  if(!selection.length){
    selection=group.filter(g=>status(g)==='Final').slice(-6).reverse();
    heading='Latest results';
    subtitle=DAY_NAMES[target];
  } else if(!live.length){
    heading=isToday?'Up next':'Next matchday';
  }
  return {selection,heading,subtitle};
}
function crest(name){const key=String(name||'').trim().toLowerCase(),src=REGION_LOGOS[key];if(src)return '<img class="crest" alt="" src="'+src+'" loading="lazy"/>';return '<span class="fallback" aria-hidden="true">'+esc((name||'?').charAt(0).toUpperCase())+'</span>';}
function resolvedTeam(text,division,payload){
  const raw=String(text||'').trim();const q=raw.match(/^(?:(BU\d{2}|GU\d{2})\s+)?#([1-9])(A|B)?$/i);
  if(!q)return raw;
  const div=(q[1]||division).toUpperCase(),pool=(q[3]||'').toUpperCase();
  const teams=(payload.teams||[]).filter(x=>x.Division===div&&(!pool||x.Pool===pool)).map(x=>x.Team);
  const group=(payload.games||[]).filter(g=>g.Division===div&&g.Round==='Group'&&(!pool||teams.includes(g.Home)&&teams.includes(g.Away)));
  if(!group.length||group.some(g=>status(g)!=='Final'))return raw;
  // Only show an automatically resolved name if the official main site can also do so;
  // unresolved placeholders remain visible until group play concludes.
  const points=new Map(teams.map(n=>[n,{name:n,pts:0,gd:0,gf:0}]));
  for(const g of group){if(!hasScore(g))continue;const h=points.get(g.Home),a=points.get(g.Away);if(!h||!a)continue;const hs=+g.HomeScore,as=+g.AwayScore;h.gf+=hs;a.gf+=as;h.gd+=hs-as;a.gd+=as-hs;h.pts+=hs>as?3:hs===as?1:0;a.pts+=as>hs?3:hs===as?1:0;}
  const ranked=[...points.values()].sort((a,b)=>b.pts-a.pts||b.gd-a.gd||b.gf-a.gf||a.name.localeCompare(b.name));
  // The actual tie-break order may include head-to-head; avoid incorrect qualifiers in an embed.
  if(ranked.some((r,i)=>i>0&&r.pts===ranked[i-1].pts))return raw;
  return ranked[Number(q[2])-1]?.name||raw;
}
function card(g,payload){
  const home=resolvedTeam(g.Home,g.Division,payload),away=resolvedTeam(g.Away,g.Division,payload),s=status(g),scored=hasScore(g);
  return '<article class="match"><div class="match-head"><span class="division">'+esc(g.Division)+'</span><span class="state '+s.toLowerCase()+'">'+(s==='Live'?'● ':'')+esc(s)+'</span></div>'+
    '<div class="side"><div class="club">'+crest(home)+'<span>'+esc(home)+'</span></div><strong class="score">'+(scored?esc(g.HomeScore):'–')+'</strong></div>'+
    '<div class="side"><div class="club">'+crest(away)+'<span>'+esc(away)+'</span></div><strong class="score">'+(scored?esc(g.AwayScore):'–')+'</strong></div>'+
    '<div class="match-foot"><span>'+esc(g.Time||'TBD')+'</span><span>'+esc(g.Field||'Field TBD')+'</span></div></article>';
}
function render(payload){
 const result=pick(payload.games||[]);
 $('headline').textContent=result.heading;
 $('context').textContent=result.subtitle+(result.selection.length?' · '+result.selection.length+' matches':'');
 $('matches').innerHTML=result.selection.length?result.selection.map(g=>card(g,payload)).join(''):'<div class="notice">No current matches are available. Open the full schedule for all fixtures.</div>';
 const time=new Date(payload.fetchedAt||Date.now());
 $('last-updated').textContent='Updated '+time.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',timeZone:'America/New_York'})+' ET';
}
async function refresh(){
 try{
  const response=await fetch('/api/data',{cache:'no-store'});
  if(!response.ok)throw Error('Live data unavailable');
  const payload=await response.json();
  if(!Array.isArray(payload.games)||!Array.isArray(payload.teams))throw Error('Invalid match data');
  lastPayload=payload;render(payload);
 }catch(e){
  if(!lastPayload){$('matches').innerHTML='<div class="notice">Live matches are temporarily unavailable. Use the full schedule button below.</div>';$('context').textContent='Connection issue';}
 }
}
refresh();
setInterval(()=>{if(!document.hidden)refresh();},60000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
})();
