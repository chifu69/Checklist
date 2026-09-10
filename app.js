"use strict";

const LINES=["EXT1","EXT2","EXT3","EXT4"];
const KEY="srLeadChecklist.v1.5";
const OLD_KEYS=["srLeadChecklist.v1.4","srLeadChecklist.v1.3","srLeadChecklist.v1.2","srLeadChecklist.v1.1","srLeadChecklist.v1"];
const SETTINGS_KEY="srLeadChecklist.settings.v1";
const $=id=>document.getElementById(id);

const safetyItems=[
  ["safety_walk","Safety","Safety Walk Thru / PPE in Use by All Associates"],
  ["hydrocarbon","Safety","Hydrocarbon System Working (report issues to Maintenance immediately)"],
  ["extinguishers","Safety","Fire Extinguishers in Proper Location and Full"],
  ["forklift","Fork Truck","Forklift Inspection Book Filled Out"],
  ["quality","Quality","Quality Inspection — “You should never be able to question the quality of a roll by looking at it”"],
  ["dept_orderly","Housekeeping","Verify Extrusion Department is in Safe and Orderly Condition"],
  ["tools_location","Housekeeping","Die wrenches, cam wrenches and gear ratchet/socket located on each line"],
  ["five_s","Housekeeping","Verify all 5S items are in proper location (brooms, dust pans, mops)"]
];

const productivityFields=[
  ["designator","Designator","text","",null],
  ["lineSpeed","Line Speed","number","",null],
  ["diePressure","Die Pressure","number","Plan: 1800–2000 PSI",{kind:"range",min:1800,max:2000}],
  ["dieMelt","Die Melt","number","Plan: 300–305 °F",{kind:"range",min:300,max:305}],
  ["outsideAir","Outside Air Pressure","number","Plan: 3–8 PSI",{kind:"rangeExact",min:3,max:8}],
  ["insideAir","Inside Air Pressure","number","Plan: 20–50 PSI",{kind:"rangeExact",min:20,max:50}],
  ["primaryLoad","Primary Motor Load","number","Plan: <80%",{kind:"strictMax",max:80}],
  ["primaryScrew","Primary Screw Speed","number","RPM",null],
  ["secondaryLoad","Secondary Motor Load","number","Plan: <80%",{kind:"strictMax",max:80}],
  ["secondaryScrew","Secondary Screw Speed","number","RPM",null],
  ["differential","Differential","number","<600 green · 600–800 yellow · >800 red",{kind:"differential"}]
];

const blendFields=[
  ["virgin1","Virgin 1 (%)"],["fluff","Fluff (%)"],["talc","Talc (%)"],["virgin2","Virgin 2 (%)"],["silo","Silo in Use"]
];

const equipmentFields=[
  ["gearbox","Gearbox Inspection (Lube Level Good)","Y"],
  ["noise","Noises or any issues","N"],
  ["primaryTank","Primary Water Tank Full","Y"],
  ["secondaryTank","Secondary Water Tank Full","Y"],
  ["meech","Meech Equipment working properly","Y"],
  ["regen","Regen Blower Turned On","Y"],
  ["camBolts","Issues with Cam Bolts","N"],
  ["dieHead","Issues with Die Head","N"]
];

const state={
  meta:{date:"",lead:"",shift:"C"}, safety:{}, productivity:{}, blends:{}, equipment:{},
  common:{pumpRoom:"",pumpTime:"",mechanicalBlower:"",screenPacks:""},
  inventory:{talcBoxes:"",silo1:"",silo2:"",silo3:"",silo4:"",silo5:"",butane:"",co2:""},
  lineStatus:{},
  times:{safety:{},equipment:{},common:{},lineStatus:{}},
  notes:""
};
LINES.forEach(l=>{
  state.productivity[l]={butane:"",co2:""};
  state.blends[l]={};
  state.equipment[l]={};
  state.lineStatus[l]="RUNNING";
  state.times.equipment[l]={};
});

let activeProductLine="EXT1",activeEquipmentLine="EXT1";

function el(tag,cls="",text=""){const n=document.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n}
function escapeHtml(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function hasValue(v){return String(v??"").trim()!==""}
function num(v){return hasValue(v)&&Number.isFinite(Number(v))?Number(v):null}
function fmt(v,d=2){const n=num(v);if(n===null)return"—";return new Intl.NumberFormat("en-US",{minimumFractionDigits:0,maximumFractionDigits:d}).format(n)}
function formatDate(v){if(!v)return"—";return new Date(v+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}
function updateDateDisplay(){const d=$("dateDisplay");if(d)d.textContent=formatDate($("date")?.value||state.meta.date)}
function format12h(v){if(!v)return"—";const m=String(v).match(/^(\d{1,2}):(\d{2})/);if(!m)return v;let h=Number(m[1]);const ampm=h>=12?"PM":"AM";h=h%12||12;return`${h}:${m[2]} ${ampm}`}
function nowStamp(){return new Date().toISOString()}
function currentTime24(){const d=new Date();return`${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`}
function stampTime(v){if(!v)return"";const d=new Date(v);if(Number.isNaN(d.getTime()))return"";return d.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"})}
function isDown(line){return state.lineStatus[line]==="DOWN"}
function lineCo2Pct(line){const b=num(state.productivity[line].butane),c=num(state.productivity[line].co2);if(b===null||c===null)return null;const total=b+c;return total>0?c/total*100:0}

function save(){state.meta.date=$("date").value;state.meta.lead=$("lead").value;state.meta.shift=$("shift").value;localStorage.setItem(KEY,JSON.stringify(state));updateProgress()}
function mergeState(src){
  if(!src)return;
  if(src.meta)Object.assign(state.meta,src.meta);if(src.safety)Object.assign(state.safety,src.safety);if(src.common)Object.assign(state.common,src.common);if(src.inventory)Object.assign(state.inventory,src.inventory);if(src.lineStatus)Object.assign(state.lineStatus,src.lineStatus);if(src.times){Object.assign(state.times.safety,src.times.safety||{});Object.assign(state.times.common,src.times.common||{});Object.assign(state.times.lineStatus,src.times.lineStatus||{})}if(typeof src.notes==="string")state.notes=src.notes;
  LINES.forEach(l=>{
    Object.assign(state.productivity[l],src.productivity?.[l]||{});Object.assign(state.blends[l],src.blends?.[l]||{});Object.assign(state.equipment[l],src.equipment?.[l]||{});if(src.times?.equipment?.[l])Object.assign(state.times.equipment[l],src.times.equipment[l]);if(!["RUNNING","DOWN"].includes(state.lineStatus[l]))state.lineStatus[l]="RUNNING";
    if(!hasValue(state.productivity[l].butane)&&hasValue(src.productivity?.[l]?.butaneCo2)){
      const m=String(src.productivity[l].butaneCo2).match(/^\s*(-?\d+(?:\.\d+)?)\s*[\/:,-]\s*(-?\d+(?:\.\d+)?)\s*$/);if(m){state.productivity[l].butane=m[1];state.productivity[l].co2=m[2]}
    }
  });
  delete state.inventory.co2Fill;delete state.trim;
}
function load(){
  let raw=localStorage.getItem(KEY);if(!raw){for(const k of OLD_KEYS){raw=localStorage.getItem(k);if(raw)break}}
  if(raw){try{mergeState(JSON.parse(raw))}catch(e){}}
  if(!state.meta.date)state.meta.date=new Date().toISOString().slice(0,10);
  $("date").value=state.meta.date;$("lead").value=state.meta.lead||"";$("shift").value=state.meta.shift||"C";updateDateDisplay();
}

function sectionCard(title,hint=""){const c=el("div","card"),t=el("div","section-title");t.appendChild(el("h2","",title));if(hint)t.appendChild(el("span","hint",hint));c.appendChild(t);return c}
function renderSafety(){
  const host=$("safety");host.innerHTML="";let current=null,card=null;
  safetyItems.forEach(([key,cat,label])=>{
    if(cat!==current){card=sectionCard(cat);host.appendChild(card);current=cat}
    const row=el("label","check-row");
    const cb=document.createElement("input");cb.type="checkbox";cb.checked=!!state.safety[key];
    const content=el("div","check-content");content.appendChild(el("span","",label));
    const time=el("small","auto-time",state.times.safety[key]?`Checked ${stampTime(state.times.safety[key])}`:"");
    content.appendChild(time);
    cb.onchange=()=>{
      state.safety[key]=cb.checked;
      state.times.safety[key]=cb.checked?nowStamp():"";
      time.textContent=cb.checked?`Checked ${stampTime(state.times.safety[key])}`:"";
      save();
    };
    row.append(cb,content);card.appendChild(row);
  });
}
function lineSelector(active,setActive,render){const w=el("div","line-tabs");LINES.forEach(l=>{const b=el("button","line-tab"+(active===l?" active":""),l);b.type="button";b.onclick=()=>{setActive(l);render()};w.appendChild(b)});return w}
function lineStatusControl(line){
  const w=el("div","line-status");
  const left=el("div","line-status-label");
  left.appendChild(el("strong","",`${line} Status`));
  left.appendChild(el("small","auto-time",state.times.lineStatus[line]?`Changed ${stampTime(state.times.lineStatus[line])}`:""));
  const buttons=el("div","line-status-buttons");
  [["RUNNING","Running"],["DOWN","Down"]].forEach(([value,label])=>{
    const b=el("button","status-btn "+(state.lineStatus[line]===value?"selected "+value.toLowerCase():""),label);
    b.type="button";
    b.onclick=()=>{
      if(state.lineStatus[line]===value)return;
      state.lineStatus[line]=value;
      state.times.lineStatus[line]=nowStamp();
      save();
      renderProductivity();
    };
    buttons.appendChild(b);
  });
  w.append(left,buttons);
  return w;
}
function refreshLineCo2(){
  const card=$("lineCo2Card"),value=$("lineCo2Value");if(!card||!value)return;
  if(isDown(activeProductLine)){card.className="line-co2 neutral";value.textContent="DOWN";return}
  const p=lineCo2Pct(activeProductLine);
  card.className="line-co2 "+(p===null?"neutral":p>=15?"good":"warn");
  value.textContent=p===null?"—":`${fmt(p)}%`;
}
function statusClass(value,rule){
  const n=num(value);if(n===null||!rule)return"";
  if(rule.kind==="range"){if(n<rule.min||n>rule.max)return"status-bad";const span=rule.max-rule.min,edge=span*.12;return(n<rule.min+edge||n>rule.max-edge)?"status-warn":"status-ok"}
  if(rule.kind==="rangeExact")return(n<rule.min||n>rule.max)?"status-bad":"status-ok";
  if(rule.kind==="strictMax")return n>=rule.max?"status-bad":n>=rule.max*.9?"status-warn":"status-ok";
  if(rule.kind==="differential")return n>800?"status-bad":n>=600?"status-warn":"status-ok";
  return"";
}


function renderProductivity(){
  const host=$("productivity");host.innerHTML="";
  const c=sectionCard("Productivity / Blends","One line at a time — report combines all four lines");
  c.appendChild(lineSelector(activeProductLine,l=>activeProductLine=l,renderProductivity));
  c.appendChild(lineStatusControl(activeProductLine));
  const down=isDown(activeProductLine);

  const body=el("div",down?"line-data line-down":"line-data");
  if(down)body.appendChild(el("div","down-message",`${activeProductLine} is marked DOWN. Productivity and blend fields are not required.`));

  const grid=el("div","field-grid");
  productivityFields.forEach(([key,label,type,meta,rule])=>{
    const f=el("label","field "+statusClass(state.productivity[activeProductLine][key],rule));
    f.appendChild(document.createTextNode(label));
    const i=document.createElement("input");i.type=type;i.disabled=down;
    if(type==="number"){i.inputMode="decimal";i.step="any"}
    i.value=state.productivity[activeProductLine][key]??"";
    i.oninput=()=>{state.productivity[activeProductLine][key]=i.value;save();renderProductivitySoft()};
    f.appendChild(i);if(meta)f.appendChild(el("span","meta",meta));grid.appendChild(f);
  });
  body.appendChild(grid);

  const gas=el("div","gas-fields");gas.appendChild(el("div","gas-title","Gas Set Points — lb/hr"));
  [["butane","Butane"],["co2","CO₂"]].forEach(([key,label])=>{
    const f=el("label","field");f.appendChild(document.createTextNode(label));
    const i=document.createElement("input");i.type="number";i.inputMode="decimal";i.step="any";i.disabled=down;
    i.placeholder=key==="co2"?"Enter 0 if line runs without CO₂":"lb/hr";
    i.value=state.productivity[activeProductLine][key]??"";
    i.oninput=()=>{state.productivity[activeProductLine][key]=i.value;save();refreshLineCo2()};
    f.appendChild(i);gas.appendChild(f);
  });
  body.appendChild(gas);

  const p=lineCo2Pct(activeProductLine),co=el("div","line-co2 "+(down||p===null?"neutral":p>=15?"good":"warn"));
  co.id="lineCo2Card";co.appendChild(el("span","",`${activeProductLine} CO₂ %`));
  const strong=el("strong","",down?"DOWN":p===null?"—":`${fmt(p)}%`);strong.id="lineCo2Value";co.appendChild(strong);
  body.appendChild(co);

  body.appendChild(el("div","subsection-title","Blends"));
  const bg=el("div","field-grid");
  blendFields.forEach(([key,label])=>{
    const f=el("label","field");f.appendChild(document.createTextNode(label));
    const i=document.createElement("input");i.type=key==="silo"?"text":"number";i.disabled=down;
    if(i.type==="number"){i.inputMode="decimal";i.step="any"}
    i.value=state.blends[activeProductLine][key]??"";
    i.oninput=()=>{state.blends[activeProductLine][key]=i.value;save()};
    f.appendChild(i);bg.appendChild(f);
  });
  body.appendChild(bg);c.appendChild(body);host.appendChild(c);
}
function renderProductivitySoft(){document.querySelectorAll("#productivity .field-grid:first-of-type .field").forEach((f,i)=>{const input=f.querySelector("input"),rule=productivityFields[i]?.[4];if(input)f.className="field "+statusClass(input.value,rule)})}

function yesNoControl(obj,key,good,timesObj,onSelect){
  const w=el("div","yesno");
  [["Y","YES"],["N","NO"]].forEach(([v,label])=>{
    const selected=obj[key]===v,b=el("button","yn-btn"+(selected?" selected "+(v===good?"good":"bad"):""),label);
    b.type="button";
    b.onclick=()=>{
      obj[key]=v;
      if(timesObj)timesObj[key]=nowStamp();
      if(onSelect)onSelect(v);
      save();renderEquipment();
    };
    w.appendChild(b);
  });
  return w;
}
function renderEquipment(){
  const host=$("equipment");host.innerHTML="";
  const c=sectionCard("Equipment Inspection","Time is recorded automatically when you choose YES or NO");
  c.appendChild(lineSelector(activeEquipmentLine,l=>activeEquipmentLine=l,renderEquipment));
  equipmentFields.forEach(([key,label,good])=>{
    const i=el("div","eq-item");
    const head=el("div","eq-head");head.appendChild(el("div","eq-name",label));
    head.appendChild(el("small","auto-time",state.times.equipment[activeEquipmentLine][key]?stampTime(state.times.equipment[activeEquipmentLine][key]):""));
    i.appendChild(head);
    i.appendChild(yesNoControl(state.equipment[activeEquipmentLine],key,good,state.times.equipment[activeEquipmentLine]));
    c.appendChild(i);
  });
  host.appendChild(c);

  const common=sectionCard("Common Areas","Time is recorded automatically");
  [["pumpRoom","Pump Room Inspected"],["mechanicalBlower","Mechanical Room Blower Powder Barrel Checked"],["screenPacks","All screen packs clean and accounted"]].forEach(([key,label])=>{
    const i=el("div","eq-item"),head=el("div","eq-head");
    head.appendChild(el("div","eq-name",label));
    head.appendChild(el("small","auto-time",state.times.common[key]?stampTime(state.times.common[key]):""));
    i.appendChild(head);
    i.appendChild(yesNoControl(state.common,key,"Y",state.times.common,key==="pumpRoom"?()=>{state.common.pumpTime=currentTime24()}:null));
    common.appendChild(i);
  });
  const auto=el("div","auto-time-box");
  auto.appendChild(el("span","","Pump Room Time"));
  auto.appendChild(el("strong","",state.times.common.pumpRoom?stampTime(state.times.common.pumpRoom):"Recorded when inspected"));
  common.appendChild(auto);

  const open=el("button","secondary","Open Roll Count App");open.type="button";open.style.marginTop="12px";
  open.onclick=()=>{const s=JSON.parse(localStorage.getItem(SETTINGS_KEY)||"{}");if(s.rollCountUrl)window.open(s.rollCountUrl,"_blank");else $("settingsDialog").showModal()};
  common.appendChild(open);host.appendChild(common);
}
function siloStatus(value){
  const n=num(value);if(n===null)return"";
  return n>100000?"ok":n>=50000?"warn":"bad";
}
function renderInventory(){
  const host=$("inventory");host.innerHTML="";
  const c=sectionCard("Inventory Levels","Silos: >100,000 green · 50,000–100,000 yellow · <50,000 red");
  const grid=el("div","inventory-grid");
  const fields=[
    ["talcBoxes","Talc (boxes)","14 boxes minimum"],
    ["silo1","Silo #1 Inventory","lb"],["silo2","Silo #2 Inventory","lb"],["silo3","Silo #3 Inventory","lb"],
    ["silo4","Silo #4 Inventory","lb"],["silo5","Silo #5 Inventory","lb"],
    ["butane","Butane Tank","%"],["co2","CO₂",""]
  ];
  fields.forEach(([key,label,unit])=>{
    const isTalc=key==="talcBoxes",siloKey=/^silo[1-5]$/.test(key);
    const talcLow=isTalc&&hasValue(state.inventory[key])&&Number(state.inventory[key])<14;
    const initialClass=siloKey?siloStatus(state.inventory[key]):talcLow?"bad":isTalc&&hasValue(state.inventory[key])?"ok":"";
    const f=el("label",["inventory-item",initialClass].filter(Boolean).join(" "));
    f.appendChild(document.createTextNode(label));
    const i=document.createElement("input");i.type="number";i.inputMode="decimal";i.step="any";i.value=state.inventory[key]??"";
    const badge=el("span","badge bad","BELOW MINIMUM");badge.hidden=!talcLow;
    i.oninput=()=>{
      state.inventory[key]=i.value;
      if(isTalc){
        const low=hasValue(i.value)&&Number(i.value)<14;
        f.className="inventory-item "+(hasValue(i.value)?low?"bad":"ok":"");
        badge.hidden=!low;
      }else if(siloKey){
        f.className="inventory-item "+siloStatus(i.value);
      }
      save();
    };
    f.appendChild(i);
    if(unit)f.appendChild(el("span","meta",unit));
    if(isTalc)f.appendChild(badge);
    grid.appendChild(f);
  });
  c.appendChild(grid);host.appendChild(c);
}
function renderNotes(){const host=$("notes");host.innerHTML="";const c=sectionCard("Notes"),lab=el("label","big-note"),ta=document.createElement("textarea");ta.placeholder="Shift notes, issues, follow-up…";ta.value=state.notes||"";ta.oninput=()=>{state.notes=ta.value;save()};lab.appendChild(ta);c.appendChild(lab);host.appendChild(c)}
function updateProgress(){
  let total=0,done=0;
  safetyItems.forEach(([k])=>{total++;if(state.safety[k])done++});
  LINES.forEach(l=>{
    if(!isDown(l)){
      productivityFields.forEach(([k])=>{total++;if(hasValue(state.productivity[l][k]))done++});
      ["butane","co2"].forEach(k=>{total++;if(hasValue(state.productivity[l][k]))done++});
      blendFields.forEach(([k])=>{total++;if(hasValue(state.blends[l][k]))done++});
    }
    equipmentFields.forEach(([k])=>{total++;if(hasValue(state.equipment[l][k]))done++});
  });
  ["pumpRoom","mechanicalBlower","screenPacks"].forEach(k=>{total++;if(hasValue(state.common[k]))done++});
  Object.keys(state.inventory).forEach(k=>{total++;if(hasValue(state.inventory[k]))done++});
  const pct=total?Math.round(done/total*100):0;$("progressText").textContent=pct+"%";$("progressBar").style.width=pct+"%";
}

function reportValue(value,rule,suffix=""){
  if(!hasValue(value))return"—";
  const c=statusClass(value,rule),mark=(c==="status-bad"||c==="status-warn")?"●":"";
  return`<span class="${c.replace("status-","")}">${escapeHtml(value)}${suffix}${mark?` <b>${mark}</b>`:""}</span>`;
}
function issueDetail(line,key,label,rule){
  const value=state.productivity[line][key],n=num(value);
  if(n===null||statusClass(value,rule)!=="status-bad")return null;
  const info={
    diePressure:[" PSI","1800–2000 PSI"],
    dieMelt:[" °F","300–305 °F"],
    outsideAir:[" PSI","3–8 PSI"],
    insideAir:[" PSI","20–50 PSI"],
    primaryLoad:["%","<80%"],
    secondaryLoad:["%","<80%"],
    differential:[" PSI","≤800 PSI"]
  }[key]||["","target range"];
  let direction="";
  if(rule?.min!==undefined&&rule?.min!==null&&n<rule.min)direction="LOW";
  else if(rule?.max!==undefined&&rule?.max!==null&&n>rule.max)direction="HIGH";
  else if(rule?.kind==="strictMax"&&n>=rule.max)direction="HIGH";
  else if(rule?.kind==="differential"&&n>800)direction="HIGH";
  return`${line} — ${label}: ${fmt(n)}${info[0]}${direction?` — ${direction}`:""} (${info[1]})`;
}
function siloCard(i,value){
  const cls=siloStatus(value);
  return`<div class="silo-card ${cls}"><div class="silo-art"><div class="silo-cap"></div><div class="silo-body"><span>SILO ${i}</span></div><div class="silo-cone"></div><div class="silo-leg l1"></div><div class="silo-leg l2"></div></div><div class="silo-lbs">${hasValue(value)?fmt(value):"—"} <small>lb</small></div></div>`;
}
function safeScriptJson(obj){return JSON.stringify(obj).replace(/</g,"\\u003c")}
function generateReport(){
  save();

  const safetyRows=safetyItems.map(([k,cat,label])=>`<tr><td class="cat">${escapeHtml(cat)}</td><td class="${state.safety[k]?"yes":""}">${state.safety[k]?"☑":"☐"}</td><td>${escapeHtml(label)}</td><td class="time-cell">${state.times.safety[k]?escapeHtml(stampTime(state.times.safety[k])):"—"}</td></tr>`).join("");
  const pRows=productivityFields.map(([k,label,t,meta,rule])=>`<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(meta?meta.replace("Plan: ",""):"—")}</td>${LINES.map(l=>isDown(l)?`<td class="down">DOWN</td>`:`<td>${reportValue(state.productivity[l][k],rule)}</td>`).join("")}</tr>`).join("");
  const gasRows=[["butane","Butane","lb/hr"],["co2","CO₂","lb/hr"]].map(([k,label,u])=>`<tr><th>${label}</th><td>${u}</td>${LINES.map(l=>isDown(l)?`<td class="down">DOWN</td>`:`<td>${hasValue(state.productivity[l][k])?escapeHtml(fmt(state.productivity[l][k])):"—"}</td>`).join("")}</tr>`).join("");
  const pctRow=`<tr><th>CO₂ %</th><td>CO₂ ÷ (Butane + CO₂)</td>${LINES.map(l=>{if(isDown(l))return`<td class="down">DOWN</td>`;const p=lineCo2Pct(l),cls=p===null?"":p>=15?"ok":"warn";return`<td class="${cls}">${p===null?"—":fmt(p)+"%"}</td>`}).join("")}</tr>`;
  const blendRows=blendFields.map(([k,label])=>`<tr><th>${escapeHtml(label)}</th><td>—</td>${LINES.map(l=>isDown(l)?`<td class="down">DOWN</td>`:`<td>${escapeHtml(state.blends[l][k]||"—")}</td>`).join("")}</tr>`).join("");
  const eqRows=equipmentFields.map(([k,label,good])=>`<tr><th>${escapeHtml(label)}</th>${LINES.map(l=>{const v=state.equipment[l][k]||"",cls=!v?"":v===good?"yes":"no",tm=state.times.equipment[l][k]?stampTime(state.times.equipment[l][k]):"";return`<td class="${cls}">${v||"—"}${tm?`<small class="cell-time">${escapeHtml(tm)}</small>`:""}</td>`}).join("")}</tr>`).join("");

  const talcN=num(state.inventory.talcBoxes);
  const talcCls=talcN===null?"":talcN<14?"bad":"ok";
  const invRows=[
    `<tr><th>Talc (14 Boxes Minimum)</th><td class="${talcCls}">${talcN===null?"—":escapeHtml(fmt(talcN))+" boxes"}</td></tr>`,
    `<tr><th>Butane Tank</th><td>${hasValue(state.inventory.butane)?escapeHtml(fmt(state.inventory.butane))+" %":"—"}</td></tr>`,
    `<tr><th>CO₂</th><td>${hasValue(state.inventory.co2)?escapeHtml(fmt(state.inventory.co2)):"—"}</td></tr>`
  ].join("");

  const silos=[1,2,3,4,5].map(i=>siloCard(i,state.inventory[`silo${i}`])).join("");

  const problems=[];
  LINES.forEach(l=>{if(!isDown(l))productivityFields.forEach(([k,label,t,m,rule])=>{const p=issueDetail(l,k,label,rule);if(p)problems.push(p)})});
  if(talcN!==null&&talcN<14)problems.push(`Talc Inventory: ${fmt(talcN)} boxes — BELOW MINIMUM (14 boxes)`);
  [1,2,3,4,5].forEach(i=>{const v=num(state.inventory[`silo${i}`]);if(v!==null&&v<50000)problems.push(`Silo ${i}: ${fmt(v)} lb — LOW (<50,000 lb)`)});
  LINES.forEach(l=>equipmentFields.forEach(([k,label,good])=>{const v=state.equipment[l][k];if(v&&v!==good)problems.push(`${l} — ${label}: ${v==="Y"?"YES":"NO"}`)}));
  [["pumpRoom","Pump Room Inspected"],["mechanicalBlower","Mechanical Room Blower Powder Barrel Checked"],["screenPacks","All screen packs clean and accounted"]].forEach(([k,label])=>{if(state.common[k]==="N")problems.push(`${label}: NO`)});

  const summaryHtml=problems.length
    ?`<div class="summary-title">⚠ ${problems.length} item(s) need attention</div><ul>${problems.map(p=>`<li>${escapeHtml(p)}</li>`).join("")}</ul>`
    :`<div class="summary-title good-summary">✓ No automatic exceptions detected</div>`;

  const shareData={
    meta:{date:formatDate(state.meta.date),dateRaw:state.meta.date,lead:state.meta.lead||"—",shift:state.meta.shift},lineStatus:{...state.lineStatus},times:JSON.parse(JSON.stringify(state.times)),
    safety:safetyItems.map(([k,cat,label])=>({key:k,cat,label,done:!!state.safety[k]})),
    productivity:productivityFields.map(([k,label,t,meta,rule])=>({
      key:k,label,plan:meta?meta.replace("Plan: ",""):"—",
      values:LINES.map(l=>({line:l,value:isDown(l)?"DOWN":state.productivity[l][k]??"",status:isDown(l)?"down":statusClass(state.productivity[l][k],rule)}))
    })),
    gas:["butane","co2"].map(k=>({key:k,label:k==="butane"?"Butane":"CO2",unit:"lb/hr",values:LINES.map(l=>isDown(l)?"DOWN":state.productivity[l][k]??"")})),
    co2Pct:LINES.map(l=>isDown(l)?null:lineCo2Pct(l)),
    blends:blendFields.map(([k,label])=>({key:k,label,values:LINES.map(l=>isDown(l)?"DOWN":state.blends[l][k]??"")})),
    equipment:equipmentFields.map(([k,label,good])=>({key:k,label,good,values:LINES.map(l=>state.equipment[l][k]??"")})),
    common:{pumpRoom:state.common.pumpRoom||"",pumpTime:state.times.common.pumpRoom?stampTime(state.times.common.pumpRoom):format12h(state.common.pumpTime),mechanicalBlower:state.common.mechanicalBlower||"",screenPacks:state.common.screenPacks||""},
    inventory:{...state.inventory},
    notes:state.notes||"",
    problems
  };
  const shareJson=safeScriptJson(shareData);

  const report=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sr. Lead Report</title><style>
  @page{size:letter;margin:.38in}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#1a2530;margin:0;background:#eef2f5}.toolbar{position:sticky;top:0;background:#0f3557;color:#fff;padding:10px;display:flex;gap:8px;justify-content:center;z-index:10}.toolbar button{border:0;border-radius:9px;padding:10px 14px;font-weight:700}.toolbar button:disabled{opacity:.55}.paper{max-width:900px;margin:18px auto;background:#fff;padding:26px;box-shadow:0 5px 25px #0002}.head{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:4px solid #0f3557;padding-bottom:10px}h1{font-size:22px;margin:0;color:#0f3557}.dcn{font-size:10px;color:#677481}.meta{display:grid;grid-template-columns:1fr 1.8fr .55fr;gap:8px;margin:12px 0}.meta div{border:1px solid #cbd5de;border-radius:7px;padding:7px}.meta b{display:block;font-size:9px;text-transform:uppercase;color:#6c7884;margin-bottom:2px}.summary{background:#fff7dd;border-left:5px solid #c98900;padding:8px 10px;margin:10px 0;font-size:11px}.summary-title{font-weight:800}.summary-title.good-summary{color:#176b38}.summary ul{margin:6px 0 0 18px;padding:0}.summary li{margin:3px 0;font-weight:700}h2{font-size:13px;color:#0f3557;background:#eaf0f5;padding:6px;margin:12px 0 0;border:1px solid #c7d3dc}table{width:100%;border-collapse:collapse;font-size:9.4px}th,td{border:1px solid #c7d3dc;padding:4px;text-align:center;vertical-align:middle}th{text-align:left;background:#f8fafb}.cat{font-weight:700;text-align:left;width:95px}.yes{color:#1b6f3d;font-weight:800;background:#f0f8f3}.no{color:#b32e2e;font-weight:800;background:#fff1f1}.ok{color:#176b38;background:#eff8f2}.warn{color:#946200;background:#fff7dd}.bad{color:#aa2929;background:#fff0f0;font-weight:800}.down{color:#5c6874;background:#eef1f4;font-weight:800}.cell-time{display:block;font-size:8px;color:#687686;margin-top:2px}.time-cell{white-space:nowrap;font-size:8.5px;color:#687686}.sheet{break-before:page}.keep{break-inside:avoid}.silo-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;padding:10px 2px 4px}.silo-card{--silo:#7b8995;--silo-fill:#edf1f4;--silo-cone:#cbd5dd;--silo-text:#5e6b77;text-align:center}.silo-card.ok{--silo:#2f8a5b;--silo-fill:#ddf3e6;--silo-cone:#9fd9b7;--silo-text:#176b38}.silo-card.warn{--silo:#c18a12;--silo-fill:#fff1bd;--silo-cone:#f0cc6a;--silo-text:#946200}.silo-card.bad{--silo:#bd3d3d;--silo-fill:#ffe1e1;--silo-cone:#e99898;--silo-text:#aa2929}.silo-art{width:76px;height:105px;margin:0 auto 4px;position:relative}.silo-cap{position:absolute;top:2px;left:12px;width:52px;height:13px;border:3px solid var(--silo);border-bottom:0;border-radius:50% 50% 0 0;background:var(--silo-fill)}.silo-body{position:absolute;top:12px;left:12px;width:52px;height:60px;border:3px solid var(--silo);border-top:0;background:var(--silo-fill);display:flex;align-items:center;justify-content:center}.silo-body span{font-weight:800;color:var(--silo-text);font-size:9px}.silo-cone{position:absolute;top:72px;left:21px;width:0;height:0;border-left:17px solid transparent;border-right:17px solid transparent;border-top:22px solid var(--silo-cone)}.silo-leg{position:absolute;top:89px;width:3px;height:15px;background:var(--silo)}.silo-leg.l1{left:25px}.silo-leg.l2{right:25px}.silo-lbs{font-weight:800;color:var(--silo-text);font-size:12px}.silo-lbs small{font-size:9px;color:#677481}.notes{min-height:90px;border:1px solid #c7d3dc;padding:8px;white-space:pre-wrap;font-size:10px}.foot{margin-top:12px;font-size:9px;color:#697681;display:flex;justify-content:space-between}@media print{body{background:white}.toolbar{display:none}.paper{margin:0;box-shadow:none;padding:0}.sheet{break-before:page}}@media(max-width:700px){.paper{margin:0;padding:10px}.meta{grid-template-columns:1fr 1.5fr .5fr}.silo-grid{grid-template-columns:repeat(5,1fr)}}
  </style></head><body>
  <div class="toolbar"><button onclick="window.print()">Print / Save PDF</button><button id="shareBtn" disabled>Preparing Share…</button><button onclick="window.close()">Close</button></div>
  <main class="paper">
    <div class="head"><div><h1>EXTRUSION SR. LEAD DAILY CHECKLIST</h1><div class="dcn">DCN TN-100-00003</div></div><div class="dcn">Digital Report</div></div>
    <div class="meta"><div><b>Date</b>${escapeHtml(formatDate(state.meta.date))}</div><div><b>Sr. Lead</b>${escapeHtml(state.meta.lead||"—")}</div><div><b>Shift</b>${escapeHtml(state.meta.shift)}</div></div>
    <div class="summary">${summaryHtml}</div>
    <h2>SAFETY / FORK TRUCK / QUALITY / HOUSEKEEPING</h2><table><thead><tr><th>Area</th><th>✓</th><th>Item</th><th>Time</th></tr></thead><tbody>${safetyRows}</tbody></table>
    <section class="sheet keep"><h2>PRODUCTIVITY / BLENDS</h2><table><thead><tr><th>Productivity</th><th>Plan</th>${LINES.map(l=>`<th>${l}</th>`).join("")}</tr></thead><tbody><tr><th>Line Status</th><td>—</td>${LINES.map(l=>`<td class="${isDown(l)?"down":"yes"}">${isDown(l)?"DOWN":"RUNNING"}</td>`).join("")}</tr>${pRows}${gasRows}${pctRow}</tbody></table><table style="margin-top:6px"><thead><tr><th>Blends</th><th>Plan</th>${LINES.map(l=>`<th>${l}</th>`).join("")}</tr></thead><tbody>${blendRows}</tbody></table></section>
    <section class="sheet"><h2>EQUIPMENT INSPECTION</h2><table><thead><tr><th>Item</th>${LINES.map(l=>`<th>${l}</th>`).join("")}</tr></thead><tbody>${eqRows}</tbody></table><table style="margin-top:7px"><tbody><tr><th>Pump Room Inspected</th><td>${state.common.pumpRoom||"—"}</td><th>Time</th><td>${escapeHtml(state.times.common.pumpRoom?stampTime(state.times.common.pumpRoom):format12h(state.common.pumpTime))}</td></tr><tr><th>Mechanical Room Blower Powder Barrel Checked</th><td>${state.common.mechanicalBlower||"—"}</td><th>All screen packs clean and accounted</th><td>${state.common.screenPacks||"—"}</td></tr></tbody></table><h2>INVENTORY LEVELS</h2><div class="silo-grid">${silos}</div><table>${invRows}</table><h2>NOTES</h2><div class="notes">${escapeHtml(state.notes||"")}</div><div class="foot"><span>DCN TN-100-00003</span></div></section>
  </main>
<script>window.REPORT_DATA=${shareJson};</script><script src="report-share.js"></script></body></html>`;

  const w=window.open("","_blank");
  if(!w){alert("Allow pop-ups to generate the report.");return}
  w.document.open();w.document.write(report);w.document.close();
}
document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));document.querySelectorAll(".panel").forEach(x=>x.classList.remove("active"));b.classList.add("active");$(b.dataset.target).classList.add("active")});
$("date").addEventListener("change",()=>{updateDateDisplay();save()});["lead","shift"].forEach(id=>$(id).addEventListener("change",save));
$("saveBtn").onclick=()=>{save();const b=$("saveBtn"),old=b.textContent;b.textContent="Saved ✓";setTimeout(()=>b.textContent=old,900)};
$("resetBtn").onclick=()=>{if(confirm("Clear the current shift checklist?")){localStorage.removeItem(KEY);OLD_KEYS.forEach(k=>localStorage.removeItem(k));location.reload()}};
$("reportBtn").onclick=generateReport;

$("settingsBtn").onclick=()=>{const s=JSON.parse(localStorage.getItem(SETTINGS_KEY)||"{}");$("rollCountUrl").value=s.rollCountUrl||"";$("settingsDialog").showModal()};
$("saveSettings").onclick=()=>localStorage.setItem(SETTINGS_KEY,JSON.stringify({rollCountUrl:$("rollCountUrl").value.trim()}));

load();renderSafety();renderProductivity();renderEquipment();renderInventory();renderNotes();updateProgress();if("serviceWorker"in navigator)navigator.serviceWorker.register("sw.js").catch(()=>{});
