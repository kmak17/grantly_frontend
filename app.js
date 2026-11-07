/* Grantly app: state + storage, eligibility logic, views, dialogs, event handling. Needs data.js. */
const store={get(k,d){try{const v=localStorage.getItem('grantly:'+k);return v?JSON.parse(v):d}catch(e){return d}},set(k,v){try{localStorage.setItem('grantly:'+k,JSON.stringify(v))}catch(e){}}};
const S={profile:store.get('profile',DEFAULT_PROFILE),apps:store.get('apps',SEED_APPS),have:store.get('have',{transcript:true,id:true,enrol:true}),
  view:'discover',q:'',type:'All',sort:'match',showAll:false,open:null,editing:false};
const save=()=>{store.set('profile',S.profile);store.set('apps',S.apps);store.set('have',S.have)};

const IC={
 search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
 compass:'<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
 board:'<rect x="3" y="4" width="5" height="16" rx="1.5"/><rect x="10" y="4" width="5" height="10" rx="1.5"/><rect x="17" y="4" width="4" height="6" rx="1.5"/>',
 cal:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
 file:'<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
 mark:'<path d="M6 4h12v17l-6-4-6 4z"/>',
 check:'<path d="m5 12.5 4.5 4.5L19 7.5"/>',
 x:'<path d="M6 6l12 12M18 6 6 18"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
 moon:'<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>',
 user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>'
};
const ic=(n,w=2)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n]}</svg>`;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const today=new Date();today.setHours(0,0,0,0);
const dateOf=s=>{const x=new Date(today);x.setDate(x.getDate()+s.d);return x};
const dfmt=s=>dateOf(s).toLocaleDateString('en-GB',{day:'numeric',month:'short'});
const urg=s=>s.d<=7?'hot':s.d<=21?'warm':'';

function evalS(s,p){
  const c=[];
  c.push({k:'level',ok:s.lv.includes(p.level),t:'Level: '+s.lv.join(' or '),f:'You are '+p.level});
  if(s.fl)c.push({k:'field',ok:s.fl.includes(p.field),t:'Field: '+s.fl.join(', '),f:'Your field is '+p.field});
  if(s.nat)c.push({k:'nat',ok:s.nat.includes(p.nat),t:'Citizenship: '+s.nat.join(', '),f:'Your citizenship is '+p.nat});
  c.push({k:'score',ok:p.score>=s.min,t:'Academic score of '+s.min+'% or more',f:'Your score is '+p.score+'%'});
  if(s.need)c.push({k:'need',ok:!!p.need,t:'Open to students who need financial support',f:'Your profile says you do not need support'});
  const bad=c.filter(x=>!x.ok);
  const near=bad.length===1&&bad[0].k==='score'&&s.min-p.score<=6;
  const state=!bad.length?'eligible':near?'near':'no';
  return {checks:c,state,pct:Math.round(100*(c.length-bad.length)/c.length),bad};
}
const ev=s=>evalS(s,S.profile);
const readiness=s=>{const h=s.docs.filter(d=>S.have[d]).length;return {h,n:s.docs.length,pct:Math.round(100*h/s.docs.length)}};
const toast=(m)=>{const t=document.getElementById('toast');t.textContent=m;t.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>t.hidden=true,2200)};
const byId=id=>SCH.find(s=>s.id===id);

/* ---------- views ---------- */
const ILLUS=`<svg class="ill" viewBox="0 0 360 300" role="img" aria-label="Line illustration of a graduation cap above three rising arches with a blue sun travelling along the outer arch">
<path class="ln1" d="M20 262A160 160 0 0 1 340 262"/><path class="ln1 d2" d="M62 262A118 118 0 0 1 298 262"/><path class="ln1 d3" d="M104 262A76 76 0 0 1 256 262"/>
<path class="ln1 d4" d="M10 262H350"/><path class="ln1 d4" d="M40 274H320M70 286H290"/>
<g><path class="ln1 d2" d="M180 58 262 90 180 122 98 90Z"/><path class="ln1 d3" d="M132 108v26c0 12 96 12 96 0v-26"/><path class="cobl" d="M254 94v38"/><circle class="cob" cx="254" cy="138" r="5"/></g>
<circle class="cob" r="9"><animateMotion dur="10s" repeatCount="indefinite" path="M20 262A160 160 0 0 1 340 262"/></circle>
</svg>`;
const urgC=s=>s.d<=14?'hot':'';
const meter=e=>`<div class="meter" aria-hidden="true">${Array.from({length:10},(_,i)=>`<i class="${i<Math.round(e.pct/10)?'on':''}"></i>`).join('')}</div>`;
const amtParts=s=>{const i=s.amt.indexOf(' ');return [s.amt.slice(0,i),s.amt.slice(i+1)]};
const saveBtn=(s)=>{const on=!!S.apps[s.id];return `<button class="save" data-act="save" data-id="${s.id}" aria-pressed="${on}" aria-label="${on?'Remove from my plan':'Save to my plan'}">${ic('mark')}</button>`};

function filtered(){
  const q=S.q.trim().toLowerCase();
  let r=SCH.map(s=>({s,e:ev(s)}));
  if(!S.showAll)r=r.filter(x=>x.e.state!=='no');
  if(S.type!=='All')r=r.filter(x=>x.s.type.includes(S.type));
  if(q)r=r.filter(x=>(x.s.name+' '+x.s.org+' '+x.s.desc+' '+(x.s.fl||[]).join(' ')).toLowerCase().includes(q));
  const rank={eligible:0,near:1,no:2};
  const cmp={match:(a,b)=>rank[a.e.state]-rank[b.e.state]||b.s.usd-a.s.usd,deadline:(a,b)=>a.s.d-b.s.d,amount:(a,b)=>b.s.usd-a.s.usd,effort:(a,b)=>a.s.hrs-b.s.hrs}[S.sort];
  return r.sort(cmp);
}
function row({s,e},i){
  const [a,u]=amtParts(s);
  const note=e.state==='eligible'?`${esc(s.org)} · ${esc(s.type)} · ${s.essay?'Essay, '+s.hrs+'h':'No essay'}`
    :`${esc(s.org)} · <em>${e.state==='near'?'Almost:':'Not a fit:'}</em> ${esc(e.bad[0].f)}${e.bad[0].k==='score'?', needs '+s.min+'%':''}`;
  const lbl=e.state==='eligible'?`Fits all ${e.checks.length}`:e.state==='near'?'Near miss':'Not eligible';
  return `<article class="row ${e.state==='no'?'dim':''}" data-s="${e.state}" data-act="open" data-id="${s.id}">
    <span class="idx">${String(i+1).padStart(2,'0')}</span>
    <div class="name"><h3><button class="ttl" data-act="open" data-id="${s.id}">${esc(s.name)}</button></h3><p>${note}</p></div>
    <div class="cells"><div class="amt"><b>${esc(a)}</b><small>${esc(u)}</small></div>
    <div class="due ${urgC(s)}"><b>${s.d}</b><small>days · ${dfmt(s)}</small></div>
    <div class="fit">${meter(e)}<small>${e.pct}% · ${lbl}</small></div></div>
    ${saveBtn(s)}</article>`;
}
const listHtml=()=>{const r=filtered();return r.length?r.map(row).join(''):`<div class="empty"><h3>No matches</h3>Try another word, or show the scholarships you do not qualify for yet.</div>`};
const THEAD=`<div class="thead lab"><span>No.</span><span>Scholarship</span><span>Award</span><span>Closes in</span><span>Your fit</span><span></span></div>`;

function discover(){
  const p=S.profile;
  const all=SCH.map(s=>({s,e:ev(s)}));
  const fit=all.filter(x=>x.e.state==='eligible');
  const val=fit.reduce((a,x)=>a+x.s.usd,0);
  const soon=fit.filter(x=>!S.apps[x.s.id]||S.apps[x.s.id].status!=='submitted').sort((a,b)=>a.s.d-b.s.d)[0];
  const dr=Object.keys(DOCS).filter(k=>S.have[k]).length;
  const tick=fit.slice().sort((a,b)=>a.s.d-b.s.d).slice(0,6).map(x=>`<span>${esc(x.s.name)} · ${x.s.d} days</span>`).join('');
  return `<div class="ticker" aria-hidden="true"><div>${tick}${tick}</div></div>
  <section class="hero">
    <div class="hero-main"><div>
      <span class="lab">${today.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</span>
      <h1 class="disp"><span class="ln"><span><b data-count="${fit.length}">${fit.length}</b> scholarships</span></span><span class="ln"><span>fit you.</span></span></h1>
      <div class="prof"><span class="tag">${esc(p.level)}</span><span class="tag">${esc(p.field)}</span><span class="tag">${esc(p.nat)}</span><span class="tag">${p.score}% avg</span>${p.need?'<span class="tag">Needs support</span>':''}<button class="link" data-act="profile">Edit</button></div>
    </div><div class="hero-art">${ILLUS}</div></div>
    <div class="stats">
      <div class="stat"><span class="lab">In reach</span><b data-count="${val}" data-fmt="money">${'$'+(Math.round(val/100)*100).toLocaleString('en-US')}</b><small>across ${fit.length} scholarships</small></div>
      ${soon?`<button class="stat" data-act="open" data-id="${soon.s.id}"><span class="lab">Closes first</span><b>${soon.s.d} days</b><small>${esc(soon.s.name)}</small></button>`:'<div class="stat"></div>'}
      <div class="stat"><span class="lab">Documents ready</span><b>${dr}/${Object.keys(DOCS).length}</b><small>reused across applications</small></div>
      <button class="stat" data-act="nav" data-v="plan"><span class="lab">In my plan</span><b>${Object.keys(S.apps).length}</b><small>tracked applications</small></button>
    </div>
  </section>
  <section class="how" aria-label="How Grantly works"><div><span class="lab">01 · Match</span><b>Know where you qualify</b><p>Students lose money because eligibility rules are hard to read. Grantly checks every rule against your profile and shows near misses.</p></div>
    <div><span class="lab">02 · Plan</span><b>Never miss a date</b><p>Deadlines, effort and value sit in one plan, with calendar export.</p></div>
    <div><span class="lab">03 · Prepare</span><b>Write each document once</b><p>Applications share most documents. Tick them off once and reuse them everywhere.</p></div></section>
  <div class="tools"><label class="search">${ic('search')}<input id="q" type="search" placeholder="Search by name, field or provider" value="${esc(S.q)}" aria-label="Search scholarships"></label>
    <div class="tabs2">${['All','Merit','Need'].map(t=>`<button class="ft" data-act="type" data-v="${t}" aria-pressed="${S.type===t}">${t}</button>`).join('')}</div>
    <select class="sel" id="sort" aria-label="Sort by"><option value="match">Best fit</option><option value="deadline">Closing soonest</option><option value="amount">Highest value</option><option value="effort">Least effort</option></select>
    <label class="toggle"><input type="checkbox" id="showall" ${S.showAll?'checked':''}> Include not eligible</label></div>
  ${THEAD}<div id="list">${listHtml()}</div>
  <p class="foot">Sample listings to show how Grantly works. Confirm details with each provider before you apply. <button class="link" style="color:var(--cobalt)" data-act="reset">Reset demo data</button> · Press / to search.</p>`;
}
function plan(){
  const apps=Object.keys(S.apps).map(id=>({s:byId(id),a:S.apps[id]})).filter(x=>x.s);
  if(!apps.length)return `<h1 class="disp ptitle">My plan</h1><div class="empty"><h3>Nothing saved yet</h3>Bookmark a scholarship and it appears here with its documents and deadline.<br><br><button class="btn fill" data-act="nav" data-v="discover">Find scholarships</button></div>`;
  const total=apps.reduce((a,x)=>a+x.s.usd,0);
  const nx=apps.filter(x=>!['submitted','result'].includes(x.a.status)).sort((a,b)=>a.s.d-b.s.d)[0];
  const cols=STAGES.map(([k,l])=>{const items=apps.filter(x=>x.a.status===k).sort((a,b)=>a.s.d-b.s.d);
    return `<div class="col"><h3 class="lab"><span>${l}</span><span>${items.length}</span></h3>${items.length?items.map(x=>mini(x,k)).join(''):'<div class="colempty">Nothing here yet.</div>'}</div>`}).join('');
  return `<h1 class="disp ptitle">My plan</h1><p class="sub">${apps.length} application${apps.length>1?'s':''} tracked, worth about ${'$'+(Math.round(total/100)*100).toLocaleString('en-US')} if all succeed. ${nx?`Next up: <b>${esc(nx.s.name)}</b>, ${nx.s.d} days left, ${readiness(nx.s).n-readiness(nx.s).h} document(s) still missing.`:''} <button class="link" style="color:var(--cobalt)" data-act="ics" data-id="all">Export deadlines (.ics)</button></p><div class="board">${cols}</div>`;
}
function mini({s,a},k){
  const r=readiness(s);const next=STAGES[STAGES.findIndex(x=>x[0]===k)+1];
  const [am]=amtParts(s);
  return `<article class="mini" data-act="open" data-id="${s.id}">
    <h4><button class="ttl" data-act="open" data-id="${s.id}">${esc(s.name)}</button></h4><div class="rw"><span>${esc(am)}</span><span style="${s.d<=14?'color:var(--cobalt)':''}">${s.d} days</span></div>
    ${k==='saved'||k==='preparing'?`<div><div class="bar">${Array.from({length:10},(_,i)=>`<i class="${i<Math.round(r.pct/10)?'on':''}"></i>`).join('')}</div><div class="rw" style="margin-top:6px"><span>Documents</span><span>${r.h}/${r.n}</span></div></div>`:''}
    ${next?`<button class="btn" data-act="advance" data-id="${s.id}" style="justify-content:center">${k==='preparing'?'Mark submitted':k==='saved'?'Start preparing':'Record result'}</button>`:''}</article>`;
}
function deadlines(){
  const ids=new Set(Object.keys(S.apps));
  const mine=[...ids].map(byId).filter(s=>s&&!['submitted','result'].includes(S.apps[s.id].status));
  const open=SCH.filter(s=>!ids.has(s.id)&&ev(s).state==='eligible'&&s.d<=45);
  const pts=[...mine.map(s=>[s,true]),...open.map(s=>[s,false])].sort((a,b)=>a[0].d-b[0].d);
  const MAX=66;
  const ruler=`<div class="ruler" role="group" aria-label="Timeline of the next ${MAX} days">${[0,14,28,42,56].map(d=>`<span class="tick" style="left:${d/MAX*100}%"></span><span class="tl lab" style="left:${d/MAX*100}%">${d===0?'Today':'+'+d+'d'}</span>`).join('')}
    ${pts.map(([s,sv],i)=>`<button class="mk ${sv?'saved':''}" style="left:${s.d/MAX*100}%;--h:${26+(i%4)*17}px" data-act="open" data-id="${s.id}" aria-label="${esc(s.name)}, ${s.d} days" title="${esc(s.name)}"><i></i><span>${s.d}</span></button>`).join('')}</div>`;
  const g=(t,l)=>l.length?`<div class="group"><span class="lab">${t}</span>${l.map((s,i)=>row({s,e:ev(s)},i)).join('')}</div>`:'';
  const m=mine.sort((a,b)=>a.d-b.d);
  return `<h1 class="disp ptitle">Deadlines</h1><p class="sub">Filled markers are in your plan. Hollow ones fit you but are not saved yet.</p>${ruler}<div style="height:30px"></div>
   ${g('This week',m.filter(s=>s.d<=7))}${g('Next 30 days',m.filter(s=>s.d>7&&s.d<=30))}${g('Later',m.filter(s=>s.d>30))}
   ${m.length?'':'<div class="empty"><h3>No open deadlines</h3>Save a scholarship to track its date.</div>'}
   ${g('Fits you and closes within 45 days',open.sort((a,b)=>a.d-b.d))}`;
}
function documents(){
  const mine=Object.keys(S.apps);
  const need=k=>mine.filter(id=>byId(id).docs.includes(k)).length;
  const elig=k=>SCH.filter(s=>ev(s).state==='eligible'&&s.docs.includes(k)).length;
  const keys=Object.keys(DOCS).sort((a,b)=>(!!S.have[a]-!!S.have[b])||need(b)-need(a)||elig(b)-elig(a));
  const h=keys.filter(k=>S.have[k]).length;
  return `<h1 class="disp ptitle">Documents</h1><p class="sub">Most applications ask for the same few things. Prepare each once and reuse it.</p>
   <div class="progress"><b>${h}/${keys.length}</b><div class="bar">${Array.from({length:keys.length},(_,i)=>`<i class="${i<h?'on':''}"></i>`).join('').replace(/<i/g,'<i').replace('grid','')}</div></div>
   <div class="docs">${keys.map(k=>`<div class="doc"><button class="check" data-act="have" data-k="${k}" aria-pressed="${!!S.have[k]}" aria-label="Mark ${esc(DOCS[k].n)} as ready">${ic('check',3)}</button>
     <div style="min-width:0"><h4>${DOCS[k].n}</h4><p>${DOCS[k].d}</p></div><span class="lab">${need(k)} in plan<br>${elig(k)} you fit</span></div>`).join('')}</div>`;
}

/* ---------- sheet ---------- */
function sheet(){
  if(S.editing)return profileSheet();
  const s=byId(S.open);if(!s)return '';
  const e=ev(s),a=S.apps[s.id],r=readiness(s),miss=s.docs.filter(d=>!S.have[d]);
  const done=a&&['submitted','result'].includes(a.status);
  const steps=[[e.state==='eligible','Check you meet every requirement'],
    [!miss.length,miss.length?`Gather ${miss.length} missing document${miss.length>1?'s':''}: ${miss.map(d=>DOCS[d].n.toLowerCase()).join(', ')}`:'All documents are ready'],
    ...(s.essay?[[done,`Write the essay (about ${Math.max(2,s.hrs-2)} hours)`]]:[]),
    [done,`Submit before ${dateOf(s).toLocaleDateString('en-GB',{day:'numeric',month:'long'})}`]];
  return `<div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(s.name)}">
   <div class="sheet-head"><span class="lab">${esc(s.org)}</span><button class="xbtn" data-act="close" id="closebtn">Close ${ic('x')}</button></div>
   <h2 class="disp">${esc(s.name)}</h2>
   <p style="font-size:17px">${esc(s.desc)}</p>
   <div class="facts"><div class="fact"><span class="lab">Award</span><b>${esc(s.amt)}</b></div><div class="fact"><span class="lab">Deadline</span><b>${dfmt(s)} · ${s.d} days</b></div>
     <div class="fact"><span class="lab">Type</span><b>${esc(s.type)}</b></div><div class="fact"><span class="lab">Effort</span><b>About ${s.hrs} hour${s.hrs>1?'s':''}</b></div></div>
   <div class="block"><span class="lab">Do you qualify? ${e.pct}% fit</span>${meter(e)}${e.checks.map(c=>`<div class="crit"><span class="dot ${c.ok?'':'bad'}">${ic(c.ok?'check':'x',3)}</span><div>${esc(c.t)}<small>${c.ok?'You meet this':esc(c.f)}</small></div></div>`).join('')}</div>
   <div class="block"><span class="lab">Documents · ${r.h} of ${r.n} ready</span>${s.docs.map(d=>`<div class="doc" style="padding:12px 0"><button class="check" data-act="have" data-k="${d}" aria-pressed="${!!S.have[d]}" aria-label="Mark ${esc(DOCS[d].n)} as ready">${ic('check',3)}</button><div style="min-width:0"><h4>${DOCS[d].n}</h4><p>${DOCS[d].d}</p></div><span></span></div>`).join('')}</div>
   ${s.essay?`<div class="block"><span class="lab">Essay prompt</span><div class="quote">${esc(s.essay)}</div></div>`:''}
   <div class="block"><span class="lab">Your path to submitting</span><div class="steps">${steps.map(([d,t],i)=>`<div class="step ${d?'done':''}"><i>${d?'✓':i+1}</i><span>${t}</span></div>`).join('')}</div></div>
   ${a?`<div class="block"><span class="lab">Status</span><div class="seg" role="group" aria-label="Application status">${[['saved','Saved'],['preparing','Prep'],['submitted','Sent'],['won','Won'],['declined','Lost']].map(([k,l])=>`<button data-act="status" data-id="${s.id}" data-v="${k}" aria-pressed="${a.status===k||(a.status==='result'&&a.result===k)}">${l}</button>`).join('')}</div>
     <label for="note" class="lab">Notes</label><textarea id="note" data-id="${s.id}" placeholder="Who to ask, what to write, logins to remember">${esc(a.note||'')}</textarea></div>`:''}
   <div><button class="btn ${a?'':'fill'}" data-act="save" data-id="${s.id}">${a?'Remove from my plan':'Save to my plan'}</button> <button class="btn" data-act="ics" data-id="${s.id}">${ic('cal')} Add deadline to calendar</button></div></div>`;
}
function profileSheet(){
  const p=S.profile;
  const sel=(id,l,arr,v)=>`<div class="field"><label for="${id}">${l}</label><select id="${id}" data-prof="${id}">${arr.map(o=>`<option ${o===v?'selected':''}>${o}</option>`).join('')}</select></div>`;
  return `<div class="sheet" role="dialog" aria-modal="true" aria-label="Your profile">
   <div class="sheet-head"><span class="lab">Used to match you</span><button class="xbtn" data-act="close" id="closebtn">Close ${ic('x')}</button></div>
   <h2 class="disp">Your profile</h2><p style="color:var(--mut)">Change anything and your matches update at once. Stored only in this browser.</p>
   ${sel('level','Level of study',LEVELS,p.level)}${sel('field','Field of study',FIELDS,p.field)}${sel('nat','Citizenship',NATS,p.nat)}
   <div class="field"><label for="score">Average score · <span id="scoreval">${p.score}%</span></label><div class="range"><input id="score" type="range" min="40" max="100" value="${p.score}"></div></div>
   <label class="toggle" style="margin:0;color:var(--ink)"><input type="checkbox" id="need" ${p.need?'checked':''}> I need financial support</label>
   <div><button class="btn fill" data-act="close">Show my matches</button></div></div>`;
}

/* ---------- shell ---------- */
const NAV=[['discover','Discover'],['plan','My plan'],['deadlines','Deadlines'],['documents','Documents']];
const root=document.documentElement;
const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
const fine=matchMedia('(hover:hover) and (pointer:fine)').matches;
function render(skipLayer){
  const anim=S._anim;S._anim=false;
  const cnt=Object.keys(S.apps).length;
  const nv=([k,l])=>`<button class="nv" data-act="nav" data-v="${k}" ${S.view===k?'aria-current="page"':''}>${l}${k==='plan'&&cnt?`<span class="n">${cnt}</span>`:''}</button>`;
  const body={discover,plan,deadlines,documents}[S.view]();
  document.getElementById('app').innerHTML=`<header class="top"><div class="brand">Grantly<i></i></div><nav aria-label="Main">${NAV.map(nv).join('')}</nav>
    <div class="top-r"><button class="tbtn" data-act="theme" aria-label="Switch between light and dark mode"><span class="sun">${ic('sun')}</span><span class="moon">${ic('moon')}</span></button></div></header><main id="main" tabindex="-1" class="${anim?'enter':''}">${body}</main>`;
  document.getElementById('tabs').innerHTML=NAV.map(nv).join('');
  const sortEl=document.getElementById('sort');if(sortEl)sortEl.value=S.sort;
  syncTheme();
  if(!skipLayer)renderLayer();
  if(anim){document.querySelectorAll('.enter .row,.enter .mini,.enter .doc,.enter .col>h3').forEach((el,i)=>el.style.setProperty('--i',i));countUps()}
}
function renderLayer(){
  const L=document.getElementById('layer');
  if(!(S.open||S.editing)){L.innerHTML='';document.body.style.overflow='';setInert(false);return}
  const prev=L.querySelector('.sheet');const sc=prev?prev.scrollTop:0;
  L.innerHTML=`<div class="scrim" data-act="scrim">${sheet()}</div>`;
  const sh=L.querySelector('.sheet');if(sh){sh.scrollTop=sc;if(prev)sh.style.animation='none'}
  if(!prev){setInert(true);const c=document.getElementById('closebtn');c&&c.focus()}
  document.body.style.overflow='hidden';
}
const setInert=v=>['app','tabs'].forEach(i=>{const e=document.getElementById(i);if(e)e.inert=v});
function closeSheet(){S.open=null;S.editing=false;renderLayer();render();const o=S._op;S._op=null;
  const el=o&&(o[0]==='open'?document.querySelector('.ttl[data-id="'+o[1]+'"]'):document.querySelector('[data-act="profile"]'));(el||document.getElementById('main')).focus({preventScroll:true})}
function icsFile(list){const p=n=>String(n).padStart(2,'0'),f=d=>d.getFullYear()+p(d.getMonth()+1)+p(d.getDate()),x=s=>s.replace(/[,;]/g,'\\$&');
  const body=list.map(s=>{const a=dateOf(s),b=new Date(a);b.setDate(b.getDate()+1);
    return 'BEGIN:VEVENT\r\nUID:'+s.id+'@grantly\r\nDTSTAMP:'+f(new Date())+'T000000Z\r\nDTSTART;VALUE=DATE:'+f(a)+'\r\nDTEND;VALUE=DATE:'+f(b)+'\r\nSUMMARY:'+x('Deadline: '+s.name)+'\r\nDESCRIPTION:'+x(s.org+' - '+s.amt)+'\r\nEND:VEVENT'}).join('\r\n');
  const u=URL.createObjectURL(new Blob(['BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Grantly//EN\r\n'+body+'\r\nEND:VCALENDAR'],{type:'text/calendar'}));
  const a=document.createElement('a');a.href=u;a.download='grantly-deadlines.ics';a.click();setTimeout(()=>URL.revokeObjectURL(u),500)}
function setTheme(t){root.dataset.theme=t;try{localStorage.setItem('grantly:theme',t)}catch(e){}syncTheme()}
function syncTheme(){const d=(root.dataset.theme||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'))==='dark';document.querySelectorAll('.tbtn').forEach(b=>b.classList.toggle('dark',d))}
try{const t=localStorage.getItem('grantly:theme');if(t)root.dataset.theme=t}catch(e){}
function countUps(){
  document.querySelectorAll('[data-count]').forEach(el=>{
    if(reduce)return;const to=+el.dataset.count,money=el.dataset.fmt==='money',t0=performance.now();
    const f=n=>money?'$'+(Math.round(n/100)*100).toLocaleString('en-US'):Math.round(n);
    const step=t=>{const k=Math.min(1,(t-t0)/1300),e=1-Math.pow(1-k,4);el.textContent=f(to*e);if(k<1)requestAnimationFrame(step)};
    requestAnimationFrame(step)});
}

document.addEventListener('click',ev_=>{
  const t=ev_.target.closest('[data-act]');if(!t)return;
  const act=t.dataset.act,id=t.dataset.id;
  if(act==='scrim'){if(ev_.target===t)closeSheet();return}
  if(act==='nav'){S.view=t.dataset.v;S.open=null;S.editing=false;S._anim=true;render();window.scrollTo(0,0)}
  else if(act==='open'){S._op=['open',id];S.open=id;S.editing=false;renderLayer()}
  else if(act==='close')closeSheet();
  else if(act==='profile'){S._op=['profile'];S.editing=true;renderLayer()}
  else if(act==='theme'){const cur=root.dataset.theme||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light');setTheme(cur==='dark'?'light':'dark')}
  else if(act==='type'){S.type=t.dataset.v;render()}
  else if(act==='save'){
    if(S.apps[id]){delete S.apps[id];toast('Removed from your plan')}else{S.apps[id]={status:'saved',note:''};toast('Saved to your plan')}
    save();render();
  }
  else if(act==='advance'){const a=S.apps[id];const i=STAGES.findIndex(x=>x[0]===a.status);a.status=STAGES[Math.min(i+1,3)][0];save();toast('Moved to '+STAGES[Math.min(i+1,3)][1]);render()}
  else if(act==='status'){const v=t.dataset.v;const res=(v==='won'||v==='declined');S.apps[id].status=res?'result':v;S.apps[id].result=res?v:null;if(v==='won')toast('Congratulations');save();render()}
  else if(act==='ics'){const l=id==='all'?Object.keys(S.apps).map(byId).filter(Boolean):[byId(id)];if(l.length){icsFile(l);toast('Calendar file downloaded')}}
  else if(act==='reset'){if(confirm('Reset your profile, plan and documents to the demo data?')){S.profile={...DEFAULT_PROFILE};S.apps=JSON.parse(JSON.stringify(SEED_APPS));S.have={transcript:true,id:true,enrol:true};save();render();toast('Demo data restored')}}
  else if(act==='have'){S.have[t.dataset.k]=!S.have[t.dataset.k];save();const sc=window.scrollY,k=t.dataset.k;render();window.scrollTo(0,sc);const b=document.querySelector('.sheet [data-k="'+k+'"]')||document.querySelector('[data-k="'+k+'"]');b&&b.focus({preventScroll:true})}
});
document.addEventListener('keydown',e=>{
  if(e.key==='/'&&!e.target.matches('input,textarea,select')&&!S.open&&!S.editing){const q=document.getElementById('q');if(q){e.preventDefault();q.focus()}}
  if(e.key==='Escape'&&(S.open||S.editing))closeSheet();
  if((e.key==='Enter'||e.key===' ')&&e.target.matches('article[data-act]')){e.preventDefault();e.target.click()}
});
document.addEventListener('input',e=>{
  const t=e.target;
  if(t.id==='q'){S.q=t.value;document.getElementById('list').innerHTML=listHtml()}
  else if(t.id==='note'){S.apps[t.dataset.id].note=t.value;save()}
  else if(t.id==='score'){S.profile.score=+t.value;document.getElementById('scoreval').textContent=t.value+'%';save();behind()}
});
document.addEventListener('change',e=>{
  const t=e.target;
  if(t.id==='sort'){S.sort=t.value;S._anim=true;render()}
  else if(t.id==='showall'){S.showAll=t.checked;render()}
  else if(t.dataset.prof){S.profile[t.dataset.prof]=t.value;save();behind()}
  else if(t.id==='need'){S.profile.need=t.checked;save();behind()}
});
function behind(){const sc=window.scrollY;render(true);window.scrollTo(0,sc)}

/* cursor */
const cur=document.getElementById('cur');let tx=-100,ty=-100,cx=-100,cy=-100;
if(fine&&!reduce){
  root.classList.add('has-cursor');
  (function loop(){cx+=(tx-cx)*.22;cy+=(ty-cy)*.22;cur.style.transform=`translate(${cx}px,${cy}px)`;requestAnimationFrame(loop)})();
  root.addEventListener('pointerleave',()=>cur.classList.add('away'));root.addEventListener('pointerenter',()=>cur.classList.remove('away'));
}
document.addEventListener('pointermove',e=>{
  tx=e.clientX;ty=e.clientY;const tg=e.target;if(!tg.closest)return;
  const btn=tg.closest('button,a,input,select,textarea,label');
  const view=!btn&&tg.closest('.row,.mini');
  cur.classList.toggle('hot',!!btn&&!view);cur.classList.toggle('view',!!view);cur.textContent=view?'VIEW':'';
});
S._anim=true;render();
