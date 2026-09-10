"use strict";

const LINES=["EXT1","EXT2","EXT3","EXT4"];
const KEY="srLeadChecklist.v1.5";
const OLD_KEYS=["srLeadChecklist.v1.4","srLeadChecklist.v1.3","srLeadChecklist.v1.2","srLeadChecklist.v1.1","srLeadChecklist.v1"];
const SETTINGS_KEY="srLeadChecklist.settings.v1";
const SAVED_DB="srLeadChecklist.saved.v1";
const SAVED_STORE="checklists";
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

let activeProductLine="EXT1";

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

const CO2_TANK_TABLE=[
  {inch:5,gal:30,pct:0.4},{inch:20,gal:377,pct:5.1},{inch:35,gal:835,pct:11.2},{inch:50,gal:1327,pct:17.8},
  {inch:65,gal:1820,pct:24.4},{inch:80,gal:2313,pct:31.0},{inch:95,gal:2805,pct:37.7},{inch:110,gal:3298,pct:44.3},
  {inch:130,gal:3955,pct:53.1},{inch:150,gal:4612,pct:61.9},{inch:170,gal:5268,pct:70.7},{inch:190,gal:5925,pct:79.5},
  {inch:210,gal:6582,pct:88.4},{inch:225,gal:7075,pct:95.0},{inch:236,gal:7450,pct:100.0}
];
function co2LabelHtml(suffix=""){return `CO<span class="chem-sub">2</span>${suffix}`}
function calcCo2Tank(reading){
  const n=num(reading);if(n===null)return null;
  const rows=CO2_TANK_TABLE;
  for(const row of rows){if(Math.abs(row.inch-n)<1e-9)return{inch:n,gal:row.gal,pct:row.pct,exact:true}}
  if(n<=rows[0].inch)return{inch:n,gal:rows[0].gal,pct:rows[0].pct,exact:false};
  if(n>=rows[rows.length-1].inch)return{inch:n,gal:rows[rows.length-1].gal,pct:rows[rows.length-1].pct,exact:false};
  for(let i=0;i<rows.length-1;i++){
    const a=rows[i],b=rows[i+1];
    if(n>a.inch&&n<b.inch){
      const t=(n-a.inch)/(b.inch-a.inch);
      return{inch:n,gal:a.gal+(b.gal-a.gal)*t,pct:a.pct+(b.pct-a.pct)*t,exact:false};
    }
  }
  return null;
}
function co2TankHint(reading){
  const d=calcCo2Tank(reading);
  if(!d)return `Enter tank level in inches WC. The report will show ${co2LabelHtml()} gallons and % full.`;
  return `${d.exact?"":"≈ "}${fmt(d.gal)} gal · ${fmt(d.pct,1)}% full`;
}
function co2TankReportText(reading){
  const d=calcCo2Tank(reading);
  if(!d)return "—";
  return `${fmt(d.inch)} in. WC | ${fmt(d.gal)} gal | ${fmt(d.pct,1)}%`;
}
function syncVirgin2Silo(line){
  if(!state.blends[line])state.blends[line]={};
  const v=num(state.blends[line].virgin2);
  state.blends[line].silo=v!==null&&v>0?"Yes":"No";
}

function save(){state.meta.date=$("date").value;state.meta.lead=$("lead").value;state.meta.shift=$("shift").value;LINES.forEach(syncVirgin2Silo);localStorage.setItem(KEY,JSON.stringify(state));updateProgress()}
function mergeState(src){
  if(!src)return;
  if(src.meta)Object.assign(state.meta,src.meta);if(src.safety)Object.assign(state.safety,src.safety);if(src.common)Object.assign(state.common,src.common);if(src.inventory)Object.assign(state.inventory,src.inventory);if(src.lineStatus)Object.assign(state.lineStatus,src.lineStatus);if(src.times){Object.assign(state.times.safety,src.times.safety||{});Object.assign(state.times.common,src.times.common||{});Object.assign(state.times.lineStatus,src.times.lineStatus||{})}if(typeof src.notes==="string")state.notes=src.notes;
  LINES.forEach(l=>{
    Object.assign(state.productivity[l],src.productivity?.[l]||{});Object.assign(state.blends[l],src.blends?.[l]||{});Object.assign(state.equipment[l],src.equipment?.[l]||{});if(src.times?.equipment?.[l])Object.assign(state.times.equipment[l],src.times.equipment[l]);if(!["RUNNING","DOWN"].includes(state.lineStatus[l]))state.lineStatus[l]="RUNNING";
    if(!hasValue(state.productivity[l].butane)&&hasValue(src.productivity?.[l]?.butaneCo2)){
      const m=String(src.productivity[l].butaneCo2).match(/^\s*(-?\d+(?:\.\d+)?)\s*[\/:,-]\s*(-?\d+(?:\.\d+)?)\s*$/);if(m){state.productivity[l].butane=m[1];state.productivity[l].co2=m[2]}
    }
  });
  LINES.forEach(syncVirgin2Silo);
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
function lineSelector(active,setActive,render,{floating=false,jumpTop=false}={}){
  const w=el("div","line-tabs"+(floating?" floating-lines":""));
  LINES.forEach(l=>{
    const b=el("button","line-tab"+(active===l?" active":""),l);b.type="button";
    b.onclick=()=>{
      if(active===l)return;
      setActive(l);render();
      if(jumpTop)requestAnimationFrame(()=>{$("lineChecks")?.scrollIntoView({behavior:"smooth",block:"start"})});
    };
    w.appendChild(b);
  });
  return w;
}
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
      save();renderLineChecks();
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

function yesNoControl(obj,key,good,timesObj,onSelect,timeEl){
  const w=el("div","yesno");
  const paint=()=>{
    [...w.children].forEach(b=>{
      const v=b.dataset.value,selected=obj[key]===v;
      b.className="yn-btn"+(selected?" selected "+(v===good?"good":"bad"):"");
    });
  };
  [["Y","YES"],["N","NO"]].forEach(([v,label])=>{
    const b=el("button","yn-btn",label);b.type="button";b.dataset.value=v;
    b.onclick=()=>{
      obj[key]=v;
      if(timesObj)timesObj[key]=nowStamp();
      if(onSelect)onSelect(v);
      if(timeEl&&timesObj)timeEl.textContent=stampTime(timesObj[key]);
      paint();save();
    };
    w.appendChild(b);
  });
  paint();return w;
}

function renderLineChecks(){
  const host=$("lineChecks");host.innerHTML="";
  host.appendChild(lineSelector(activeProductLine,l=>activeProductLine=l,renderLineChecks,{floating:true,jumpTop:true}));
  const line=activeProductLine,down=isDown(line);
  const c=sectionCard(`${line} — Complete Line Check`,`Productivity, blends and equipment for this line`);
  c.appendChild(lineStatusControl(line));

  const body=el("div",down?"line-data line-down":"line-data");
  if(down)body.appendChild(el("div","down-message",`${line} is marked DOWN. Productivity and blend fields are not required. Equipment checks remain available below.`));

  body.appendChild(el("div","subsection-title first-subsection","Productivity"));
  const grid=el("div","field-grid productivity-grid");
  productivityFields.forEach(([key,label,type,meta,rule])=>{
    const f=el("label","field "+statusClass(state.productivity[line][key],rule));
    f.appendChild(document.createTextNode(label));
    const i=document.createElement("input");i.type=type;i.disabled=down;
    if(type==="number"){i.inputMode="decimal";i.step="any"}
    i.value=state.productivity[line][key]??"";
    i.oninput=()=>{state.productivity[line][key]=i.value;f.className="field "+statusClass(i.value,rule);save()};
    f.appendChild(i);if(meta)f.appendChild(el("span","meta",meta));grid.appendChild(f);
  });
  body.appendChild(grid);

  const gas=el("div","gas-fields");gas.appendChild(el("div","gas-title","Gas Set Points — lb/hr"));
  [["butane","Butane"],["co2","CO2"]].forEach(([key,label])=>{
    const f=el("label","field"),cap=document.createElement("span");
    if(key==="co2")cap.innerHTML=co2LabelHtml();else cap.textContent=label;
    f.appendChild(cap);
    const i=document.createElement("input");i.type="number";i.inputMode="decimal";i.step="any";i.disabled=down;
    i.placeholder=key==="co2"?"Enter 0 if line runs without CO2":"lb/hr";
    i.value=state.productivity[line][key]??"";
    i.oninput=()=>{state.productivity[line][key]=i.value;save();refreshLineCo2()};
    f.appendChild(i);gas.appendChild(f);
  });
  body.appendChild(gas);

  const p=lineCo2Pct(line),co=el("div","line-co2 "+(down||p===null?"neutral":p>=15?"good":"warn"));
  co.id="lineCo2Card";const coLabel=document.createElement("span");coLabel.innerHTML=`${line} ${co2LabelHtml(" %")}`;co.appendChild(coLabel);
  const strong=el("strong","",down?"DOWN":p===null?"—":`${fmt(p)}%`);strong.id="lineCo2Value";co.appendChild(strong);body.appendChild(co);

  body.appendChild(el("div","subsection-title","Blends"));
  syncVirgin2Silo(line);
  const bg=el("div","field-grid");
  blendFields.forEach(([key,label])=>{
    const f=el("label","field"+(key==="silo"?" auto-field":"")),cap=document.createElement("span");
    if(key==="silo")cap.innerHTML=`Silo in Use <span class="auto-pill">AUTO</span>`;else cap.textContent=label;f.appendChild(cap);
    const i=document.createElement("input");i.type=key==="silo"?"text":"number";i.disabled=down;
    if(i.type==="number"){i.inputMode="decimal";i.step="any"}
    if(key==="silo"){i.readOnly=true;i.className="auto-input";i.id="autoSiloInput";i.value=down?"—":(state.blends[line][key]||"No")}
    else i.value=state.blends[line][key]??"";
    if(key==="virgin2")i.placeholder="Optional";
    i.oninput=()=>{
      state.blends[line][key]=i.value;
      if(key==="virgin2"){syncVirgin2Silo(line);const auto=$("autoSiloInput");if(auto)auto.value=state.blends[line].silo||"No"}
      save();
    };
    f.appendChild(i);
    bg.appendChild(f);
  });
  body.appendChild(bg);c.appendChild(body);

  c.appendChild(el("div","subsection-title equipment-divider","Equipment Inspection"));
  const eqHint=el("div","line-equipment-hint","Complete the water, gearbox, Meech, Regen, cam bolt and die-head checks before moving to the next line.");c.appendChild(eqHint);
  equipmentFields.forEach(([key,label,good])=>{
    const item=el("div","eq-item"),head=el("div","eq-head"),time=el("small","auto-time",state.times.equipment[line][key]?stampTime(state.times.equipment[line][key]):"");
    head.appendChild(el("div","eq-name",label));head.appendChild(time);item.appendChild(head);
    item.appendChild(yesNoControl(state.equipment[line],key,good,state.times.equipment[line],null,time));c.appendChild(item);
  });
  host.appendChild(c);
}

function renderCommonAreas(){
  const host=$("common");host.innerHTML="";
  const common=sectionCard("Common Areas","These checks are not assigned to a specific extrusion line");
  let pumpDisplay=null;
  [["pumpRoom","Pump Room Inspected"],["mechanicalBlower","Mechanical Room Blower Powder Barrel Checked"],["screenPacks","All screen packs clean and accounted"]].forEach(([key,label])=>{
    const item=el("div","eq-item"),head=el("div","eq-head"),time=el("small","auto-time",state.times.common[key]?stampTime(state.times.common[key]):"");
    head.appendChild(el("div","eq-name",label));head.appendChild(time);item.appendChild(head);
    item.appendChild(yesNoControl(state.common,key,"Y",state.times.common,key==="pumpRoom"?()=>{state.common.pumpTime=currentTime24();if(pumpDisplay)pumpDisplay.textContent=stampTime(state.times.common.pumpRoom)}:null,time));common.appendChild(item);
  });
  const auto=el("div","auto-time-box");auto.appendChild(el("span","","Pump Room Time"));pumpDisplay=el("strong","",state.times.common.pumpRoom?stampTime(state.times.common.pumpRoom):"Recorded when inspected");auto.appendChild(pumpDisplay);common.appendChild(auto);
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
    ["butane","Butane Tank","%"],["co2","CO2 Tank Level","in. WC"]
  ];
  fields.forEach(([key,label,unit])=>{
    const isTalc=key==="talcBoxes",siloKey=/^silo[1-5]$/.test(key),isCo2=key==="co2";
    const talcLow=isTalc&&hasValue(state.inventory[key])&&Number(state.inventory[key])<14;
    const initialClass=siloKey?siloStatus(state.inventory[key]):talcLow?"bad":isTalc&&hasValue(state.inventory[key])?"ok":"";
    const f=el("label",["inventory-item",initialClass].filter(Boolean).join(" "));
    const cap=document.createElement("span");
    cap.innerHTML=isCo2?`${co2LabelHtml()} Tank Level`:label;
    f.appendChild(cap);
    const i=document.createElement("input");i.type="number";i.inputMode="decimal";i.step="any";i.value=state.inventory[key]??"";
    const badge=el("span","badge bad","BELOW MINIMUM");badge.hidden=!talcLow;
    const preview=el("span","meta co2-preview");
    preview.innerHTML=co2TankHint(state.inventory[key]);
    preview.hidden=!isCo2;
    i.oninput=()=>{
      state.inventory[key]=i.value;
      if(isTalc){
        const low=hasValue(i.value)&&Number(i.value)<14;
        f.className="inventory-item "+(hasValue(i.value)?low?"bad":"ok":"");
        badge.hidden=!low;
      }else if(siloKey){
        f.className="inventory-item "+siloStatus(i.value);
      }
      if(isCo2)preview.innerHTML=co2TankHint(i.value);
      save();
    };
    f.appendChild(i);
    if(unit)f.appendChild(el("span","meta",unit));
    if(isCo2)f.appendChild(preview);
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
      blendFields.forEach(([k])=>{if(k==="virgin2")return;total++;if(hasValue(state.blends[l][k]))done++});
      equipmentFields.forEach(([k])=>{total++;if(hasValue(state.equipment[l][k]))done++});
    }
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
function collectProblems(){
  const problems=[];
  LINES.forEach(l=>{if(!isDown(l))productivityFields.forEach(([k,label,t,m,rule])=>{const p=issueDetail(l,k,label,rule);if(p)problems.push(p)})});
  const talcN=num(state.inventory.talcBoxes);
  if(talcN!==null&&talcN<14)problems.push(`Talc Inventory: ${fmt(talcN)} boxes — BELOW MINIMUM (14 boxes)`);
  [1,2,3,4,5].forEach(i=>{const v=num(state.inventory[`silo${i}`]);if(v!==null&&v<50000)problems.push(`Silo ${i}: ${fmt(v)} lb — LOW (<50,000 lb)`)});
  LINES.forEach(l=>equipmentFields.forEach(([k,label,good])=>{const v=state.equipment[l][k];if(v&&v!==good)problems.push(`${l} — ${label}: ${v==="Y"?"YES":"NO"}`)}));
  [["pumpRoom","Pump Room Inspected"],["mechanicalBlower","Mechanical Room Blower Powder Barrel Checked"],["screenPacks","All screen packs clean and accounted"]].forEach(([k,label])=>{if(state.common[k]==="N")problems.push(`${label}: NO`)});
  return problems;
}
function buildReportData(problems=collectProblems()){
  LINES.forEach(syncVirgin2Silo);
  return{
    meta:{date:formatDate(state.meta.date),dateRaw:state.meta.date,lead:state.meta.lead||"—",shift:state.meta.shift},lineStatus:{...state.lineStatus},times:JSON.parse(JSON.stringify(state.times)),
    safety:safetyItems.map(([k,cat,label])=>({key:k,cat,label,done:!!state.safety[k]})),
    productivity:productivityFields.map(([k,label,t,meta,rule])=>({
      key:k,label,plan:meta?meta.replace("Plan: ",""):"—",
      values:LINES.map(l=>({line:l,value:isDown(l)?"":state.productivity[l][k]??"",status:isDown(l)?"":statusClass(state.productivity[l][k],rule)}))
    })),
    gas:["butane","co2"].map(k=>({key:k,label:k==="butane"?"Butane":"CO2",unit:"lb/hr",values:LINES.map(l=>isDown(l)?"":state.productivity[l][k]??"")})),
    co2Pct:LINES.map(l=>isDown(l)?null:lineCo2Pct(l)),
    blends:blendFields.map(([k,label])=>({key:k,label,values:LINES.map(l=>isDown(l)?"":state.blends[l][k]??"")})),
    equipment:equipmentFields.map(([k,label,good])=>({key:k,label,good,values:LINES.map(l=>state.equipment[l][k]??"")})),
    common:{pumpRoom:state.common.pumpRoom||"",pumpTime:state.times.common.pumpRoom?stampTime(state.times.common.pumpRoom):format12h(state.common.pumpTime),mechanicalBlower:state.common.mechanicalBlower||"",screenPacks:state.common.screenPacks||""},
    inventory:{...state.inventory,co2Computed:calcCo2Tank(state.inventory.co2)},
    notes:state.notes||"",
    problems
  };
}
function openSavedDb(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(SAVED_DB,1);
    req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(SAVED_STORE))db.createObjectStore(SAVED_STORE,{keyPath:"id"})};
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}
async function savedDbPut(record){
  const db=await openSavedDb();
  return new Promise((resolve,reject)=>{const tx=db.transaction(SAVED_STORE,"readwrite");tx.objectStore(SAVED_STORE).put(record);tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>{db.close();reject(tx.error)}});
}
async function savedDbAll(){
  const db=await openSavedDb();
  return new Promise((resolve,reject)=>{const tx=db.transaction(SAVED_STORE,"readonly"),req=tx.objectStore(SAVED_STORE).getAll();req.onsuccess=()=>{const rows=req.result||[];db.close();resolve(rows)};req.onerror=()=>{db.close();reject(req.error)}});
}
async function savedDbDelete(id){
  const db=await openSavedDb();
  return new Promise((resolve,reject)=>{const tx=db.transaction(SAVED_STORE,"readwrite");tx.objectStore(SAVED_STORE).delete(id);tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>{db.close();reject(tx.error)}});
}
function savedFilename(dateRaw,shift){return `Sr-Lead-Checklist_${dateRaw||"undated"}_Shift-${shift||"-"}.pdf`}
function savedDisplayTime(v){const d=new Date(v);return Number.isNaN(d.getTime())?"":d.toLocaleString("en-US",{month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"})}
async function refreshSavedCount(){
  try{const rows=await savedDbAll(),badge=$("savedCount");if(badge)badge.textContent=rows.length?String(rows.length):""}catch(e){}
}
function openSavedPdf(record){
  const url=URL.createObjectURL(record.pdfBlob);
  const w=window.open(url,"_blank");
  if(!w){const a=document.createElement("a");a.href=url;a.download=record.filename;document.body.appendChild(a);a.click();a.remove()}
  setTimeout(()=>URL.revokeObjectURL(url),60000);
}
async function shareSavedPdf(record){
  const file=new File([record.pdfBlob],record.filename,{type:"application/pdf"});
  try{
    if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){
      await navigator.share({title:"Extrusion Sr. Lead Daily Checklist",text:`${record.dateLabel} · Shift ${record.shift}`,files:[file]});
    }else{
      const url=URL.createObjectURL(record.pdfBlob),a=document.createElement("a");
      a.href=url;a.download=record.filename;document.body.appendChild(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),30000);
    }
  }catch(e){if(e&&e.name!=="AbortError")alert("Could not share the saved checklist.")}
}
async function renderSavedChecklists(){
  const host=$("saved");if(!host)return;
  host.innerHTML="";
  const card=sectionCard("Saved Checklists","PDF snapshots saved on this device");
  try{
    const rows=(await savedDbAll()).sort((a,b)=>String(b.savedAt).localeCompare(String(a.savedAt)));
    const badge=$("savedCount");if(badge)badge.textContent=rows.length?String(rows.length):"";
    if(!rows.length){
      card.appendChild(el("div","saved-empty","No saved checklists yet. Tap Save Checklist to store the current checklist as a PDF."));
      host.appendChild(card);return;
    }
    const list=el("div","saved-list");
    rows.forEach(record=>{
      const item=el("div","saved-item"),info=el("div","saved-info");
      info.appendChild(el("strong","",`${record.dateLabel} · Shift ${record.shift}`));
      const detail=[record.lead&&record.lead!=="—"?record.lead:"",record.progress||"",`Saved ${savedDisplayTime(record.savedAt)}`].filter(Boolean).join(" · ");
      info.appendChild(el("small","",detail));
      const actions=el("div","saved-actions");
      const open=el("button","secondary","Open PDF");open.type="button";open.onclick=()=>openSavedPdf(record);
      const share=el("button","primary","Share");share.type="button";share.onclick=()=>shareSavedPdf(record);
      const del=el("button","danger ghost","Delete");del.type="button";del.onclick=async()=>{if(confirm(`Delete ${record.dateLabel} · Shift ${record.shift}?`)){await savedDbDelete(record.id);renderSavedChecklists()}};
      actions.append(open,share,del);item.append(info,actions);list.appendChild(item);
    });
    card.appendChild(list);
  }catch(e){console.error(e);card.appendChild(el("div","saved-empty","Saved checklists could not be loaded on this device."))}
  host.appendChild(card);
}
async function saveChecklistPdf(){
  const btn=$("saveBtn"),old=btn.textContent;
  btn.disabled=true;btn.textContent="Saving PDF…";
  try{
    save();
    if(!window.SrLeadPdf||typeof window.SrLeadPdf.createBlob!=="function")throw new Error("PDF engine unavailable");
    const data=buildReportData(),blob=window.SrLeadPdf.createBlob(data),id=`${state.meta.date||"undated"}_${state.meta.shift||"-"}`;
    await savedDbPut({id,dateRaw:state.meta.date,dateLabel:formatDate(state.meta.date),shift:state.meta.shift,lead:state.meta.lead||"—",savedAt:new Date().toISOString(),progress:$("progressText")?$("progressText").textContent:"",filename:savedFilename(state.meta.date,state.meta.shift),pdfBlob:blob});
    btn.textContent="Saved as PDF ✓";
    await refreshSavedCount();
    if($("saved")&&$("saved").classList.contains("active"))renderSavedChecklists();
    setTimeout(()=>{btn.textContent=old;btn.disabled=false},1300);
  }catch(e){
    console.error(e);alert("Could not save the checklist PDF on this device.");btn.textContent=old;btn.disabled=false;
  }
}

function generateReport(){
  save();

  const safetyRows=safetyItems.map(([k,cat,label])=>`<tr><td class="cat">${escapeHtml(cat)}</td><td class="${state.safety[k]?"yes":""}">${state.safety[k]?"☑":"☐"}</td><td>${escapeHtml(label)}</td><td class="time-cell">${state.times.safety[k]?escapeHtml(stampTime(state.times.safety[k])):"—"}</td></tr>`).join("");
  const pRows=productivityFields.map(([k,label,t,meta,rule])=>`<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(meta?meta.replace("Plan: ",""):"—")}</td>${LINES.map(l=>isDown(l)?`<td>—</td>`:`<td>${reportValue(state.productivity[l][k],rule)}</td>`).join("")}</tr>`).join("");
  const gasRows=[["butane","Butane","lb/hr"],["co2",co2LabelHtml(),"lb/hr"]].map(([k,label,u])=>`<tr><th>${label}</th><td>${u}</td>${LINES.map(l=>isDown(l)?`<td>—</td>`:`<td>${hasValue(state.productivity[l][k])?escapeHtml(fmt(state.productivity[l][k])):"—"}</td>`).join("")}</tr>`).join("");
  const pctRow=`<tr><th>${co2LabelHtml(" %")}</th><td>${co2LabelHtml()} ÷ (Butane + ${co2LabelHtml()})</td>${LINES.map(l=>{if(isDown(l))return`<td>—</td>`;const p=lineCo2Pct(l),cls=p===null?"":p>=15?"ok":"warn";return`<td class="${cls}">${p===null?"—":fmt(p)+"%"}</td>`}).join("")}</tr>`;
  const blendRows=blendFields.map(([k,label])=>`<tr><th>${escapeHtml(label)}</th><td>—</td>${LINES.map(l=>isDown(l)?`<td>—</td>`:`<td>${escapeHtml(state.blends[l][k]||"—")}</td>`).join("")}</tr>`).join("");
  const eqRows=equipmentFields.map(([k,label,good])=>`<tr><th>${escapeHtml(label)}</th>${LINES.map(l=>{const v=state.equipment[l][k]||"",cls=!v?"":v===good?"yes":"no",tm=state.times.equipment[l][k]?stampTime(state.times.equipment[l][k]):"";return`<td class="${cls}">${v||"—"}${tm?`<small class="cell-time">${escapeHtml(tm)}</small>`:""}</td>`}).join("")}</tr>`).join("");

  const talcN=num(state.inventory.talcBoxes);
  const talcCls=talcN===null?"":talcN<14?"bad":"ok";
  const invRows=[
    `<tr><th>Talc (14 Boxes Minimum)</th><td class="${talcCls}">${talcN===null?"—":escapeHtml(fmt(talcN))+" boxes"}</td></tr>`,
    `<tr><th>Butane Tank</th><td>${hasValue(state.inventory.butane)?escapeHtml(fmt(state.inventory.butane))+" %":"—"}</td></tr>`,
    `<tr><th>${co2LabelHtml()} Tank Level</th><td>${hasValue(state.inventory.co2)?escapeHtml(co2TankReportText(state.inventory.co2)):"—"}</td></tr>`
  ].join("");

  const silos=[1,2,3,4,5].map(i=>siloCard(i,state.inventory[`silo${i}`])).join("");

  const problems=collectProblems();

  const summaryHtml=problems.length
    ?`<div class="summary-title">⚠ ${problems.length} item(s) need attention</div><ul>${problems.map(p=>`<li>${escapeHtml(p)}</li>`).join("")}</ul>`
    :`<div class="summary-title good-summary">✓ No automatic exceptions detected</div>`;

  const shareData=buildReportData(problems);
  const shareJson=safeScriptJson(shareData);

  const report=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sr. Lead Report</title><style>
  @page{size:letter;margin:.38in}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#1a2530;margin:0;background:#eef2f5}.toolbar{position:sticky;top:0;background:#0f3557;color:#fff;padding:10px;display:flex;gap:8px;justify-content:center;z-index:10}.toolbar button{border:0;border-radius:9px;padding:10px 14px;font-weight:700}.toolbar button:disabled{opacity:.55}.paper{max-width:900px;margin:18px auto;background:#fff;padding:26px;box-shadow:0 5px 25px #0002}.head{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:4px solid #0f3557;padding-bottom:10px}h1{font-size:22px;margin:0;color:#0f3557}.dcn{font-size:10px;color:#677481}.meta{display:grid;grid-template-columns:1fr 1.8fr .55fr;gap:8px;margin:12px 0}.meta div{border:1px solid #cbd5de;border-radius:7px;padding:7px}.meta b{display:block;font-size:9px;text-transform:uppercase;color:#6c7884;margin-bottom:2px}.summary{background:#fff7dd;border-left:5px solid #c98900;padding:8px 10px;margin:10px 0;font-size:11px}.summary-title{font-weight:800}.summary-title.good-summary{color:#176b38}.summary ul{margin:6px 0 0 18px;padding:0}.summary li{margin:3px 0;font-weight:700}.chem-sub{font-size:.8em;vertical-align:-.18em;display:inline-block;font-weight:800}h2{font-size:13px;color:#0f3557;background:#eaf0f5;padding:6px;margin:12px 0 0;border:1px solid #c7d3dc}table{width:100%;border-collapse:collapse;font-size:9.4px}th,td{border:1px solid #c7d3dc;padding:4px;text-align:center;vertical-align:middle}th{text-align:left;background:#f8fafb}.cat{font-weight:700;text-align:left;width:95px}.yes{color:#1b6f3d;font-weight:800;background:#f0f8f3}.no{color:#b32e2e;font-weight:800;background:#fff1f1}.ok{color:#176b38;background:#eff8f2}.warn{color:#946200;background:#fff7dd}.bad{color:#aa2929;background:#fff0f0;font-weight:800}.down{color:#5c6874;background:#eef1f4;font-weight:800}.cell-time{display:block;font-size:8px;color:#687686;margin-top:2px}.time-cell{white-space:nowrap;font-size:8.5px;color:#687686}.sheet{break-before:page}.keep{break-inside:avoid}.silo-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;padding:10px 2px 4px}.silo-card{--silo:#7b8995;--silo-fill:#edf1f4;--silo-cone:#cbd5dd;--silo-text:#5e6b77;text-align:center}.silo-card.ok{--silo:#2f8a5b;--silo-fill:#ddf3e6;--silo-cone:#9fd9b7;--silo-text:#176b38}.silo-card.warn{--silo:#c18a12;--silo-fill:#fff1bd;--silo-cone:#f0cc6a;--silo-text:#946200}.silo-card.bad{--silo:#bd3d3d;--silo-fill:#ffe1e1;--silo-cone:#e99898;--silo-text:#aa2929}.silo-art{width:76px;height:105px;margin:0 auto 4px;position:relative}.silo-cap{position:absolute;top:2px;left:12px;width:52px;height:13px;border:3px solid var(--silo);border-bottom:0;border-radius:50% 50% 0 0;background:var(--silo-fill)}.silo-body{position:absolute;top:12px;left:12px;width:52px;height:60px;border:3px solid var(--silo);border-top:0;background:var(--silo-fill);display:flex;align-items:center;justify-content:center}.silo-body span{font-weight:800;color:var(--silo-text);font-size:9px}.silo-cone{position:absolute;top:72px;left:21px;width:0;height:0;border-left:17px solid transparent;border-right:17px solid transparent;border-top:22px solid var(--silo-cone)}.silo-leg{position:absolute;top:89px;width:3px;height:15px;background:var(--silo)}.silo-leg.l1{left:25px}.silo-leg.l2{right:25px}.silo-lbs{font-weight:800;color:var(--silo-text);font-size:12px}.silo-lbs small{font-size:9px;color:#677481}.notes{min-height:90px;border:1px solid #c7d3dc;padding:8px;white-space:pre-wrap;font-size:10px}.foot{margin-top:12px;font-size:9px;color:#697681;display:flex;justify-content:space-between}@media print{body{background:white}.toolbar{display:none}.paper{margin:0;box-shadow:none;padding:0}.sheet{break-before:page}}@media(max-width:700px){.paper{margin:0;padding:10px}.meta{grid-template-columns:1fr 1.5fr .5fr}.silo-grid{grid-template-columns:repeat(5,1fr)}}
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
document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));document.querySelectorAll(".panel").forEach(x=>x.classList.remove("active"));b.classList.add("active");$(b.dataset.target).classList.add("active");if(b.dataset.target==="saved")renderSavedChecklists()});
$("date").addEventListener("change",()=>{updateDateDisplay();save()});["lead","shift"].forEach(id=>$(id).addEventListener("change",save));
$("saveBtn").onclick=saveChecklistPdf;
$("resetBtn").onclick=()=>{if(confirm("Clear the current shift checklist?")){localStorage.removeItem(KEY);OLD_KEYS.forEach(k=>localStorage.removeItem(k));location.reload()}};
$("reportBtn").onclick=generateReport;

$("settingsBtn").onclick=()=>{const s=JSON.parse(localStorage.getItem(SETTINGS_KEY)||"{}");$("rollCountUrl").value=s.rollCountUrl||"";$("settingsDialog").showModal()};
$("saveSettings").onclick=()=>localStorage.setItem(SETTINGS_KEY,JSON.stringify({rollCountUrl:$("rollCountUrl").value.trim()}));

load();renderSafety();renderLineChecks();renderCommonAreas();renderInventory();renderNotes();updateProgress();refreshSavedCount();if("serviceWorker"in navigator)navigator.serviceWorker.register("sw.js").catch(()=>{});
