(() => {
'use strict';
const DIVISIONS=['BU13','BU14','BU15','GU13','GU14','GU15'];
const DAYS=['FRI','SAT','SUN'];
const state={payload:null,day:'ALL',division:'ALL',status:'ALL',query:'',view:'schedule',standDivision:'BU13',selectedTeam:null,lastError:null,loading:false};
// Vercel Web Analytics uses a global queue on static HTML sites; do not send search terms or personal data.
function trackInteraction(name,data){if(typeof window.va==='function')window.va('event',{name,...(data?{data}:{})});}
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const setting=k=>(state.payload?.settings||[]).find(r=>r.Setting===k)?.Value||'';
const int=(value,fallback=0)=>{const n=Number(value);return Number.isFinite(n)&&String(value).trim()!==''?n:fallback};
const hasScore=g=>String(g.HomeScore??'').trim()!==''&&String(g.AwayScore??'').trim()!==''&&Number.isFinite(Number(g.HomeScore))&&Number.isFinite(Number(g.AwayScore));
function status(g){const s=String(g.Status||'').trim().toLowerCase();if(s==='cancelled'||s==='canceled')return 'Cancelled';if(s==='delayed')return 'Delayed';if(s==='live'||s==='in progress')return 'Live';if(s==='forfeit'||s==='final'||s==='finished')return hasScore(g)?'Final':'Upcoming';return hasScore(g)?'Final':'Upcoming';}
function pointValue(label,fallback){return int(setting(label),fallback)}
function fixtureTeams(division,pool){return(state.payload?.teams||[]).filter(x=>x.Division===division&&(!pool||x.Pool===pool)).map(x=>x.Team)}
function subMatches(division,pool){return(state.payload?.games||[]).filter(g=>g.Division===division&&g.Round==='Group'&&(!pool||fixtureTeams(division,pool).includes(g.Home)&&fixtureTeams(division,pool).includes(g.Away)))}
function standings(division,pool){const teams=fixtureTeams(division,pool);const data=new Map(teams.map(t=>[t,{team:t,p:0,w:0,d:0,l:0,gf:0,ga:0,gd:0,pts:0}]));const winPts=pointValue('Points for a win',3),drawPts=pointValue('Points for a draw',1);const cap=int(setting('Max goal difference per game'),0);
for(const g of subMatches(division,pool)){if(status(g)!=='Final'||!hasScore(g)||!data.has(g.Home)||!data.has(g.Away))continue;const h=data.get(g.Home),a=data.get(g.Away),hs=int(g.HomeScore),as=int(g.AwayScore);h.p++;a.p++;h.gf+=hs;h.ga+=as;a.gf+=as;a.ga+=hs;const delta=cap?Math.max(-cap,Math.min(cap,hs-as)):hs-as;h.gd+=delta;a.gd-=delta;if(hs>as){h.w++;a.l++;h.pts+=winPts}else if(hs<as){a.w++;h.l++;a.pts+=winPts}else{h.d++;a.d++;h.pts+=drawPts;a.pts+=drawPts}}
const rules=setting('Tiebreakers').split(',').map(v=>v.trim().toUpperCase()).filter(Boolean);if(!rules.length)rules.push('PTS','H2H','GD','GF');
function h2h(t1,t2){const games=subMatches(division,pool).filter(g=>status(g)==='Final'&&hasScore(g)&&((g.Home===t1.team&&g.Away===t2.team)||(g.Home===t2.team&&g.Away===t1.team)));return games.reduce((sum,g)=>{const a=g.Home===t1.team?int(g.HomeScore):int(g.AwayScore),b=g.Home===t1.team?int(g.AwayScore):int(g.HomeScore);return sum+(a>b?winPts:a===b?drawPts:0)-(a<b?winPts:a===b?drawPts:0)},0)}
const sortRule=(a,b,rule)=>{switch(rule){case'PTS':return b.pts-a.pts;case'H2H':return h2h(b,a);case'GD':return b.gd-a.gd;case'GF':return b.gf-a.gf;case'GA':return a.ga-b.ga;case'W':return b.w-a.w;default:return 0}};
return [...data.values()].sort((a,b)=>{for(const rule of rules){const n=sortRule(a,b,rule);if(n)return n}return a.team.localeCompare(b.team)})}
function allGroupComplete(division,pool){const g=subMatches(division,pool);return g.length>0&&g.every(game=>status(game)==='Final')}
function resolvedTeam(text,division){const raw=String(text||'').trim();const qualified=raw.match(/^(?:(BU\d{2}|GU\d{2})\s+)?#([1-9])(A|B)?$/i);if(!qualified)return raw;const targetDivision=(qualified[1]||division).toUpperCase(),rank=Number(qualified[2]),pool=(qualified[3]||'').toUpperCase();if(!DIVISIONS.includes(targetDivision)||!allGroupComplete(targetDivision,pool))return raw;return standings(targetDivision,pool)[rank-1]?.team||raw}
function shownStatus(g){return status(g)}
function dayTitle(day){const v=setting(day);return {FRI:'Friday',SAT:'Saturday',SUN:'Sunday'}[day]+(v?` · ${v}`:'')}
function nameInitial(s){const n=String(s||'').replace(/^#/,'');return n.match(/[A-Z]/i)?.[0]?.toUpperCase()||'R'}
const REGION_LOGOS=Object.freeze({
  west:'/assets/team-logos/west.png',
  canada:'/assets/team-logos/canada.png',
  ne:'/assets/team-logos/northeast.png',
  northeast:'/assets/team-logos/northeast.png',
  midwest:'/assets/team-logos/midwest.png',
  south:'/assets/team-logos/south.png',
  bolivia:'/assets/team-logos/international.png',
  international:'/assets/team-logos/international.png'
});
function teamIcon(team){const label=String(team||'').trim(),key=label.toLowerCase(),src=REGION_LOGOS[key];return src?`<img class="team-crest" src="${src}" alt="${esc(label)} regional crest" loading="lazy" decoding="async"/>`:`<span class="team-icon" aria-hidden="true">${esc(nameInitial(label))}</span>`}
function gameHtml(g){const s=shownStatus(g),home=resolvedTeam(g.Home,g.Division),away=resolvedTeam(g.Away,g.Division),scored=hasScore(g),hs=int(g.HomeScore),as=int(g.AwayScore),winHome=scored&&hs>as,winAway=scored&&as>hs;const live=s==='Live';return `<article class="match-card"><div class="card-top"><div class="card-left"><span class="division-pill">${esc(g.Division)}</span><span class="match-round">${esc(g.Round||'Group')} · ${esc(g.GameID)}</span></div><span class="game-state ${s.toLowerCase()}">${live?'● ':''}${esc(s)}</span></div><div class="card-body"><div class="teams"><div class="team">${teamIcon(home)}<button type="button" class="team-name team-link" data-team="${esc(home)}" data-team-division="${esc(g.Division)}" title="View ${esc(home)} schedule and standings">${esc(home)}</button></div><div class="team">${teamIcon(away)}<button type="button" class="team-name team-link" data-team="${esc(away)}" data-team-division="${esc(g.Division)}" title="View ${esc(away)} schedule and standings">${esc(away)}</button></div></div><div class="scores ${scored?'':'empty'}"><span class="${winHome?'winner':''}">${scored?hs:'—'}</span><span class="${winAway?'winner':''}">${scored?as:'—'}</span></div></div><div class="card-foot"><span>◷ ${esc(g.Time||'TBD')}</span><span>⌖ ${esc(g.Field||'Field TBD')}</span></div>${g.Notes?`<p class="match-note">${esc(g.Notes)}</p>`:''}</article>`}
function renderMatches(){if(!state.payload){$('matches').innerHTML=`<div class="empty-state"><h3>${state.lastError?'Could not load live schedule':'Loading the tournament schedule…'}</h3>${state.lastError?'Please confirm the sheet is publicly readable and try Refresh.':'Connecting to the official Google Sheet.'}</div>`;$('results-count').textContent='';return}
const matches=state.payload.games.filter(g=>{const home=resolvedTeam(g.Home,g.Division),away=resolvedTeam(g.Away,g.Division);return(state.day==='ALL'||g.Day===state.day)&&(state.division==='ALL'||g.Division.split('/').includes(state.division))&&(state.status==='ALL'||status(g)===state.status)&&(!state.query||[home,away,g.Field,g.GameID,g.Division].join(' ').toLowerCase().includes(state.query))});$('results-count').textContent=`${matches.length} ${matches.length===1?'match':'matches'}`;
if(!matches.length){$('matches').innerHTML='<div class="empty-state"><h3>No games found</h3>Try another team, division or day.</div>';return}
$('matches').innerHTML=DAYS.filter(day=>matches.some(g=>g.Day===day)).map(day=>{const arr=matches.filter(g=>g.Day===day);return `<section class="day-block"><div class="day-title"><h3>${esc(dayTitle(day))}</h3><span>${arr.length} matches</span></div><div class="match-grid">${arr.map(gameHtml).join('')}</div></section>`}).join('')}
function renderStandings(){const division=state.standDivision;$('stand-division-tabs').innerHTML=DIVISIONS.map(d=>`<button type="button" class="${d===division?'active':''}" data-stand-division="${d}">${d}</button>`).join('');if(!state.payload){$('standings').innerHTML='<div class="empty-state">Live standings are unavailable until the Google Sheet can be reached.</div>';return}const pools=division==='BU13'?['A','B']:[''];$('standings').innerHTML=pools.map(p=>{const rows=standings(division,p);return `<div class="stand-card"><div class="stand-top">${esc(division)}${p?` · Pool ${esc(p)}`:''}</div><div class="table-scroll"><table class="stand-table"><thead><tr><th>#</th><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>PTS</th></tr></thead><tbody>${rows.map((t,i)=>`<tr><td class="rank">${i+1}</td><td><span class="standing-team">${teamIcon(t.team)}<button type="button" class="team-link standings-link" data-team="${esc(t.team)}" data-team-division="${esc(division)}" title="View ${esc(t.team)} schedule and standings">${esc(t.team)}</button></span></td><td>${t.p}</td><td>${t.w}</td><td>${t.d}</td><td>${t.l}</td><td>${t.gf}</td><td>${t.ga}</td><td>${t.gd>0?'+':''}${t.gd}</td><td class="pts">${t.pts}</td></tr>`).join('')}</tbody></table></div></div>`}).join('')}

const TITLE_HISTORY=[
 {year:2025,south:3,midwest:1,west:0,northeast:2,canada:0,bolivia:0,puertorico:0},
 {year:2024,south:2,midwest:2,west:1,northeast:0,canada:1,bolivia:0,puertorico:0},
 {year:2023,south:2,midwest:1,west:1,northeast:1,canada:0,bolivia:1,puertorico:0},
 {year:2022,south:2,midwest:1,west:0,northeast:1,canada:0,bolivia:0,puertorico:1},
 {year:2021,south:0,midwest:2,west:3,northeast:0,canada:0,bolivia:0,puertorico:0},
 {year:2020,south:2,midwest:1,west:2,northeast:1,canada:0,bolivia:0,puertorico:0}
];
const TITLE_REGIONS=[
 {key:'south',name:'South',logo:'South'},
 {key:'midwest',name:'Midwest',logo:'Midwest'},
 {key:'west',name:'West',logo:'West'},
 {key:'northeast',name:'Northeast',logo:'NE'},
 {key:'canada',name:'Canada',logo:'Canada'},
 {key:'bolivia',name:'Bolivia',logo:'Bolivia'},
 {key:'puertorico',name:'Puerto Rico',logo:null}
];
function historyHtml(){
 const totals=TITLE_REGIONS.map(r=>({...r,total:TITLE_HISTORY.reduce((sum,y)=>sum+y[r.key],0)})).sort((a,b)=>b.total-a.total);
 const max=Math.max(...totals.map(r=>r.total));
 return '<div class="history-intro"><p class="kicker">THE LEGACY</p><h3>All-time IRC champions</h3><p>Championship titles by region · 2020–2025 · 2026 titles not yet included</p></div>'+
 '<div class="history-grid">'+totals.map((r,i)=>'<article class="history-region"><span class="history-rank">'+(i+1).toString().padStart(2,'0')+'</span><div class="history-region-logo">'+(r.logo?teamIcon(r.logo):'<span class="history-fallback">PR</span>')+'</div><div class="history-region-info"><strong>'+esc(r.name)+'</strong><div class="history-meter"><span style="width:'+(100*r.total/max)+'%"></span></div></div><div class="history-total"><strong>'+r.total+'</strong><span>TITLES</span></div></article>').join('')+'</div>'+
 '<div class="history-years"><h3>Championships by year</h3><div class="table-scroll"><table class="stand-table"><thead><tr><th>Year</th>'+TITLE_REGIONS.map(r=>'<th>'+esc(r.name)+'</th>').join('')+'</tr></thead><tbody>'+TITLE_HISTORY.map(y=>'<tr><td><strong>'+y.year+'</strong></td>'+TITLE_REGIONS.map(r=>'<td>'+y[r.key]+'</td>').join('')+'</tr>').join('')+'</tbody></table></div></div>'+
 '<p class="history-source">Source: <a href="https://www.rushtournaments.com/irc-leaderboard" target="_blank" rel="noopener noreferrer">Rush Tournaments · IRC Previous Results ↗</a>. Counts are championships, not match wins. 2026 pending.</p>';
}
function resolveProfileDivision(team,rawDivision){
 const ds=String(rawDivision||'').split('/');
 if(ds.length===1)return ds[0];
 const matches=ds.filter(d=>(state.payload?.teams||[]).some(x=>x.Division===d&&x.Team===team));
 return matches.length===1?matches[0]:null;
}
function renderTeamProfile(){
 const profile=state.selectedTeam;
 if(!profile||!state.payload)return;
 const {team,division}=profile;
 const profileGames=state.payload.games.filter(g=>{
   if(division&&!g.Division.split('/').includes(division))return false;
   return resolvedTeam(g.Home,g.Division)===team||resolvedTeam(g.Away,g.Division)===team||
     // A cross-division seed can resolve using the team division.
     (g.Division.includes('/')&&[g.Home,g.Away].some(t=>resolvedTeam(t,division)===team));
 }).sort((a,b)=>DAYS.indexOf(a.Day)-DAYS.indexOf(b.Day)||parseTime(a.Time)-parseTime(b.Time));
 let rank=null,pool='',table=[];
 if(division&&DIVISIONS.includes(division)){
   pool=(state.payload.teams.find(x=>x.Division===division&&x.Team===team)||{}).Pool||'';
   table=standings(division,pool);
   rank=table.findIndex(x=>x.team===team)+1||null;
 }
 const record=table.find(x=>x.team===team);
 $('team-profile').innerHTML=
 '<div class="profile-header">'+teamIcon(team)+'<div><p class="kicker">TEAM CENTER · '+esc(division||'CROSSOVER')+(pool?' · POOL '+esc(pool):'')+'</p><h3>'+esc(team)+'</h3><p>All matches, results, and group position</p></div></div>'+
 '<div class="profile-stats"><div><b>'+profileGames.length+'</b><span>MATCHES</span></div><div><b>'+(record?record.w:'—')+'</b><span>WINS</span></div><div><b>'+(record?record.pts:'—')+'</b><span>POINTS</span></div><div><b>'+(rank?'#'+rank:'—')+'</b><span>GROUP RANK</span></div></div>'+
 '<h4>Team schedule & results</h4><div class="match-grid">'+(profileGames.length?profileGames.map(gameHtml).join(''):'<div class="empty-state">No fixtures currently listed for this team.</div>')+'</div>'+
 '<h4>Group standings '+(division?'<span>'+esc(division)+(pool?' · Pool '+esc(pool):'')+'</span>':'')+'</h4>'+
 (table.length?'<div class="stand-card"><div class="table-scroll"><table class="stand-table"><thead><tr><th>#</th><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>PTS</th></tr></thead><tbody>'+table.map((t,i)=>'<tr class="'+(t.team===team?'profile-highlight':'')+'"><td>'+(i+1)+'</td><td>'+esc(t.team)+'</td><td>'+t.p+'</td><td>'+t.w+'</td><td>'+t.d+'</td><td>'+t.l+'</td><td>'+t.gf+'</td><td>'+t.ga+'</td><td>'+t.gd+'</td><td>'+t.pts+'</td></tr>').join('')+'</tbody></table></div></div>':'<p>Group standings will appear after team information is available.</p>')+
 '<p class="small-note">Group standings update from final scores. Tiebreaker rules remain subject to official confirmation.</p>';
}
function parseTime(value){
 const m=String(value||'').match(/(\d+):(\d+)\s*(AM|PM)/i);
 return m?(Number(m[1])%12+(m[3].toUpperCase()==='PM'?12:0))*60+Number(m[2]):0;
}
function openTeam(team,rawDivision){
 if(!state.payload)return;
 const division=resolveProfileDivision(team,rawDivision);
 if(!division && !(state.payload.teams||[]).some(x=>x.Team===team))return;
 if(!division)return;
 state.selectedTeam={team,division};state.view='team';
 $('schedule-view').hidden=true;$('standings-view').hidden=true;$('history-view').hidden=true;
 $('team-view').hidden=false;
 document.querySelectorAll('[data-view]').forEach(n=>{n.classList.remove('active');n.setAttribute('aria-selected','false')});
 renderTeamProfile();
 document.querySelector('.page-head')?.scrollIntoView({behavior:'smooth',block:'start'});
}
function showView(next){
 state.view=next;state.selectedTeam=null;
 document.querySelectorAll('[data-view]').forEach(n=>{n.classList.toggle('active',n.dataset.view===next);n.setAttribute('aria-selected',String(n.dataset.view===next))});
 $('schedule-view').hidden=next!=='schedule';$('standings-view').hidden=next!=='standings';
 $('history-view').hidden=next!=='history';$('team-view').hidden=true;
 if(next==='history')$('history-view').innerHTML=historyHtml();
}

function updateMeta(){const s=state.payload?.settings||[];if(!s.length)return;const name=setting('Tournament name');if(name)document.title=`${name} | Live Center`;const date=setting('Dates'),venue=setting('Venue');$('hero-date').textContent=date||'INTERNATIONAL RUSH CUP 2026';$('hero-venue').textContent=venue||'SCHEDULE & STANDINGS';const a=setting('Announcement');$('announcement').hidden=!a;$('announcement').textContent=a;const d=$('division-select');const old=d.value;d.innerHTML='<option value="ALL">All divisions</option>'+DIVISIONS.map(x=>`<option value="${x}">${x}</option>`).join('');d.value=old}
function renderStatus(){const mark=$('live-mark');mark.className='live-mark'+(state.lastError?' error':state.payload?' ok':'');$('status-text').textContent=state.lastError?'Connection issue · Scores may be unavailable':state.payload?'Connected to official tournament data':'Connecting to tournament data';if(state.payload){const d=new Date(state.payload.fetchedAt||Date.now());$('updated-at').textContent=`Checked ${d.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}`;}else $('updated-at').textContent='';$('refresh').disabled=state.loading;$('refresh').textContent=state.loading?'Refreshing…':'↻ Refresh'}
function render(){renderStatus();updateMeta();renderMatches();renderStandings();renderTeamProfile()}
async function refresh(){if(state.loading)return;state.loading=true;renderStatus();try{const response=await fetch('/api/data',{cache:'no-store'}),body=await response.json();if(!response.ok)throw Error(body.detail||body.error||'Unable to load Google Sheet');if(!Array.isArray(body.games)||!Array.isArray(body.teams))throw Error('Unexpected response data');state.payload=body;state.lastError=null}catch(error){state.lastError=error.message;console.error('IRC refresh:',error)}finally{state.loading=false;render()}}
function init(){
  document.querySelectorAll('[data-day]').forEach(b=>b.addEventListener('click',()=>{
    const next=b.dataset.day;
    if(state.day!==next)trackInteraction('Day Selected',{day:next});
    state.day=next;
    document.querySelectorAll('[data-day]').forEach(n=>n.classList.toggle('active',n===b));
    renderMatches();
  }));
  document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{
    const next=b.dataset.view;
    if(state.view!==next&&next==='standings')trackInteraction('Standings Viewed',{division:state.standDivision});
    showView(next);
  }));
  // One anonymous event per settled search, never the entered search text.
  let searchTimer=null,lastTrackedSearch='';
  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-team][data-team-division]');
    if(b)openTeam(b.dataset.team,b.dataset.teamDivision);
  });
  $('profile-back').addEventListener('click',()=>showView('schedule'));
  $('team-search').addEventListener('input',e=>{
    state.query=e.target.value.trim().toLowerCase();
    renderMatches();
    if(searchTimer!==null)clearTimeout(searchTimer);
    if(state.query.length<2){if(!state.query)lastTrackedSearch='';return}
    searchTimer=setTimeout(()=>{
      if(state.query.length>=2&&state.query!==lastTrackedSearch){
        trackInteraction('Team Searched');
        lastTrackedSearch=state.query;
      }
      searchTimer=null;
    },900);
  });
  $('division-select').addEventListener('change',e=>{
    const next=e.target.value;
    if(state.division!==next)trackInteraction('Division Selected',{division:next,view:'schedule'});
    state.division=next;renderMatches();
  });
  $('status-select').addEventListener('change',e=>{
    const next=e.target.value;
    if(state.status!==next)trackInteraction('Status Filtered',{status:next});
    state.status=next;renderMatches();
  });
  $('stand-division-tabs').addEventListener('click',e=>{
    const b=e.target.closest('[data-stand-division]');
    if(b){
      const next=b.dataset.standDivision;
      if(state.standDivision!==next)trackInteraction('Division Selected',{division:next,view:'standings'});
      state.standDivision=next;renderStandings();
    }
  });
  $('refresh').addEventListener('click',()=>{
    if(!state.loading)trackInteraction('Score Refreshed');
    refresh();
  });
  refresh();
  // Automatic polling and returning to the tab are intentionally not tracked as interactions.
  setInterval(()=>{if(!document.hidden)refresh()},60000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
}
init();
})();
