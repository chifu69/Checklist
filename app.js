const LINES = ["EXT1","EXT2","EXT3","EXT4"];
const KEY = "srLeadChecklist.v1.1";
const OLD_KEY = "srLeadChecklist.v1";
const SETTINGS_KEY = "srLeadChecklist.settings.v1";

const safetyItems = [
  ["safety_walk","Safety","Safety Walk Thru / PPE in Use by All Associates"],
  ["hydrocarbon","Safety","Hydrocarbon System Working (report issues to Maintenance immediately)"],
  ["extinguishers","Safety","Fire Extinguishers in Proper Location and Full"],
  ["forklift","Fork Truck","Forklift Inspection Book Filled Out"],
  ["quality","Quality","Quality Inspection — “You should never be able to question the quality of a roll by looking at it”"],
  ["dept_orderly","Housekeeping","Verify Extrusion Department is in Safe and Orderly Condition"],
  ["tools_location","Housekeeping","Die wrenches, cam wrenches and gear ratchet/socket located on each line"],
  ["five_s","Housekeeping","Verify all 5S items are in proper location (brooms, dust pans, mops)"]
];

const productivityFields = [
  ["designator","Designator","text",""],
  ["lineSpeed","Line Speed","number",""],
  ["diePressure","Die Pressure","number","Plan: 1800–2000 psi",{kind:"range",min:1800,max:2000}],
  ["dieMelt","Die Melt","number","Plan: 300–305",{kind:"range",min:300,max:305}],
  ["outsideAir","Outside Air Pressure","number","Plan: ≤ 4 psi",{kind:"max",max:4}],
  ["insideAir","Inside Air Pressure","number","Plan: 20–50 psi",{kind:"rangeExact",min:20,max:50}],
  ["primaryLoad","Primary Motor Load","number","Plan: < 80%",{kind:"strictMax",max:80}],
  ["primaryScrew","Primary Screw Speed","number",""],
  ["secondaryLoad","Secondary Motor Load","number","Plan: < 80%",{kind:"strictMax",max:80}],
  ["secondaryScrew","Secondary Screw Speed","number",""],
  ["differential","Differential","number","<600 green · 600–800 yellow · >800 red",{kind:"differential"}]
];

const blendFields = [
  ["virgin1","Virgin 1 (%)"],
  ["fluff","Fluff (%)"],
  ["talc","Talc (%)"],
  ["virgin2","Virgin 2 (%)"],
  ["silo","Silo in Use"]
];

// goodValue defines the answer that means the equipment condition is OK.
const equipmentFields = [
  ["gearbox","Gearbox Inspection (Lube Level Good)","Y"],
  ["noise","Noises or any issues","N"],
  ["primaryTank","Primary Water Tank Full","Y"],
  ["secondaryTank","Secondary Water Tank Full","Y"],
  ["meech","Meech Equipment working properly","Y"],
  ["regen","Regen Blower Turned On","Y"],
  ["camBolts","Issues with Cam Bolts","N"],
  ["dieHead","Issues with Die Head","N"]
];

const state = {
  meta:{date:"",lead:"",shift:"C"}, safety:{}, productivity:{}, blends:{}, equipment:{},
  common:{pumpRoom:"",pumpTime:"",mechanicalBlower:"",screenPacks:"",rollCountComplete:false},
  inventory:{talcBoxes:"",silo1:"",silo2:"",silo3:"",silo4:"",silo5:"",butane:"",co2:"",co2Fill:""},
  trim:{}, notes:""
};
LINES.forEach(l=>{
  state.productivity[l]={butane:"",co2:""};
  state.blends[l]={};
  state.equipment[l]={};
});
let activeProductLine="EXT1", activeEquipmentLine="EXT1";

function el(tag, cls="", txt=""){
  const x=document.createElement(tag); if(cls)x.className=cls; if(txt)x.textContent=txt; return x;
}
function escapeHtml(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}
function hasValue(v){ return String(v??"").trim()!==""; }
function num(v){ return hasValue(v) && Number.isFinite(Number(v)) ? Number(v) : null; }
function fmt(v, digits=2){
  const n=num(v); if(n===null) return "—";
  return new Intl.NumberFormat("en-US",{minimumFractionDigits:0,maximumFractionDigits:digits}).format(n);
}
function save(){
  state.meta.date=document.getElementById("date").value;
  state.meta.lead=document.getElementById("lead").value;
  state.meta.shift=document.getElementById("shift").value;
  localStorage.setItem(KEY,JSON.stringify(state)); updateProgress();
}
function mergeState(src){
  if(!src) return;
  if(src.meta) Object.assign(state.meta,src.meta);
  if(src.safety) Object.assign(state.safety,src.safety);
  if(src.common) Object.assign(state.common,src.common);
  if(src.inventory) Object.assign(state.inventory,src.inventory);
  if(src.trim) Object.assign(state.trim,src.trim);
  if(typeof src.notes==="string") state.notes=src.notes;
  LINES.forEach(l=>{
    Object.assign(state.productivity[l],src.productivity?.[l]||{});
    Object.assign(state.blends[l],src.blends?.[l]||{});
    Object.assign(state.equipment[l],src.equipment?.[l]||{});
    // Best-effort migration from the old combined Butane/CO2 field if formatted like 55/8.
    if(!hasValue(state.productivity[l].butane) && hasValue(src.productivity?.[l]?.butaneCo2)){
      const m=String(src.productivity[l].butaneCo2).match(/^\s*(-?\d+(?:\.\d+)?)\s*[\/,:-]\s*(-?\d+(?:\.\d+)?)\s*$/);
      if(m){ state.productivity[l].butane=m[1]; state.productivity[l].co2=m[2]; }
    }
  });
}
function load(){
  let raw=localStorage.getItem(KEY);
  if(!raw) raw=localStorage.getItem(OLD_KEY);
  if(raw){ try{ mergeState(JSON.parse(raw)); }catch(e){} }
  if(!state.meta.date) state.meta.date=new Date().toISOString().slice(0,10);
  document.getElementById("date").value=state.meta.date;
  document.getElementById("lead").value=state.meta.lead||"";
  document.getElementById("shift").value=state.meta.shift||"C";
}
function sectionCard(title,hint=""){
  const c=el("div","card"), t=el("div","section-title"); t.appendChild(el("h2","",title));
  if(hint)t.appendChild(el("span","hint",hint)); c.appendChild(t); return c;
}
function renderSafety(){
  const host=document.getElementById("safety"); host.innerHTML=""; let currentCat=null,card=null;
  safetyItems.forEach(([key,cat,label])=>{
    if(cat!==currentCat){card=sectionCard(cat);host.appendChild(card);currentCat=cat;}
    const row=el("label","check-row"), cb=document.createElement("input"); cb.type="checkbox";cb.checked=!!state.safety[key];
    cb.addEventListener("change",()=>{state.safety[key]=cb.checked;save()}); row.append(cb,el("span","",label));card.appendChild(row);
  });
}
function lineSelector(active,setActive,rerender){
  const wrap=el("div","line-tabs"); LINES.forEach(l=>{const b=el("button","line-tab"+(active===l?" active":""),l);b.type="button";b.onclick=()=>{setActive(l);rerender()};wrap.appendChild(b)});return wrap;
}
function statusClass(value,rule){
  const n=num(value); if(n===null || !rule) return "";
  if(rule.kind==="range"){
    if(n<rule.min || n>rule.max) return "status-bad";
    const span=rule.max-rule.min, edge=span*.12;
    if(n<rule.min+edge || n>rule.max-edge) return "status-warn";
    return "status-ok";
  }
  if(rule.kind==="rangeExact") return (n<rule.min || n>rule.max)?"status-bad":"status-ok";
  if(rule.kind==="max") return n>rule.max?"status-bad":n>rule.max*.9?"status-warn":"status-ok";
  if(rule.kind==="strictMax") return n>=rule.max?"status-bad":n>=rule.max*.9?"status-warn":"status-ok";
  if(rule.kind==="differential") return n>800?"status-bad":n>=600?"status-warn":"status-ok";
  return "";
}
function co2Metrics(){
  const active=LINES.filter(l=>hasValue(state.productivity[l].butane));
  const missingCo2=active.filter(l=>!hasValue(state.productivity[l].co2));
  const butaneTotal=active.reduce((s,l)=>s+(num(state.productivity[l].butane)??0),0);
  const co2Total=active.reduce((s,l)=>s+(num(state.productivity[l].co2)??0),0);
  if(active.length===0) return {active:0,butaneTotal:0,co2Total:0,avg:null,pct:null,complete:true,missing:[]};
  const complete=missingCo2.length===0;
  const avg=complete?co2Total/active.length:null;
  const denom=butaneTotal+co2Total;
  const pct=complete && denom>0 ? (co2Total/denom)*100 : (complete && denom===0 ? 0 : null);
  return {active:active.length,butaneTotal,co2Total,avg,pct,complete,missing:missingCo2};
}
function co2PctClass(m){ if(!m.complete || m.pct===null) return "co2-incomplete"; return m.pct>=15?"co2-good":"co2-warn"; }
function co2SummaryNode(){
  const m=co2Metrics(), wrap=el("div","co2-summary"), head=el("div","co2-summary-head");
  head.appendChild(el("span","","CO₂ Daily Summary"));
  const status=el("span","badge",m.active===0?"No active lines":(!m.complete?`CO₂ missing: ${m.missing.join(", ")}`:(m.pct>=15?"≥15% target":"<15% target"))); head.appendChild(status);wrap.appendChild(head);
  const grid=el("div","co2-summary-grid");
  const metrics=[
    ["Active Lines",String(m.active)],
    ["Total Butane",m.active?`${fmt(m.butaneTotal)} lb/hr`:"—"],
    ["Total CO₂",m.active?`${fmt(m.co2Total)} lb/hr`:"—"],
    ["Avg CO₂ / Active Line",m.avg===null?"—":`${fmt(m.avg)} lb/hr`],
    ["Total CO₂ Mix",m.pct===null?"—":`${fmt(m.pct)}%`]
  ];
  metrics.forEach(([label,value],i)=>{const d=el("div","co2-metric"+(i===4?" "+co2PctClass(m):""));d.append(el("span","",label),el("strong","",value));grid.appendChild(d)});
  wrap.appendChild(grid); return wrap;
}
function renderProductivity(){
  const host=document.getElementById("productivity");host.innerHTML="";
  const c=sectionCard("Productivity / Blends","One line at a time — report combines all four lines");
  c.appendChild(lineSelector(activeProductLine,l=>activeProductLine=l,renderProductivity));
  const grid=el("div","field-grid");
  productivityFields.forEach(([key,label,type,meta,rule])=>{
    const f=el("label","field "+statusClass(state.productivity[activeProductLine][key],rule));f.appendChild(document.createTextNode(label));
    const inp=document.createElement("input");inp.type=type;if(type==="number"){inp.inputMode="decimal";inp.step="any";}inp.value=state.productivity[activeProductLine][key]??"";
    inp.oninput=()=>{state.productivity[activeProductLine][key]=inp.value;save();renderProductivitySoft();};f.appendChild(inp);if(meta)f.appendChild(el("span","meta",meta));grid.appendChild(f);
  });
  c.appendChild(grid);
  const gas=el("div","gas-fields");gas.appendChild(el("div","gas-title","Gas Set Points — lb/hr"));
  [["butane","Butane"],["co2","CO₂"]].forEach(([key,label])=>{const f=el("label","field");f.appendChild(document.createTextNode(label));const inp=document.createElement("input");inp.type="number";inp.inputMode="decimal";inp.step="any";inp.placeholder=key==="co2"?"Enter 0 if line runs without CO₂":"lb/hr";inp.value=state.productivity[activeProductLine][key]??"";inp.oninput=()=>{state.productivity[activeProductLine][key]=inp.value;save();renderProductivity()};f.appendChild(inp);gas.appendChild(f)});
  c.appendChild(gas);
  c.appendChild(el("div","subsection-title","Blends"));
  const bgrid=el("div","field-grid");
  blendFields.forEach(([key,label])=>{const f=el("label","field");f.appendChild(document.createTextNode(label));const inp=document.createElement("input");inp.type=key==="silo"?"text":"number";if(inp.type==="number"){inp.inputMode="decimal";inp.step="any";}inp.value=state.blends[activeProductLine][key]??"";inp.oninput=()=>{state.blends[activeProductLine][key]=inp.value;save();updateBlendSum()};f.appendChild(inp);bgrid.appendChild(f)});
  c.appendChild(bgrid);const sum=el("div","small");sum.id="blendSum";sum.style.marginTop="10px";c.appendChild(sum);c.appendChild(co2SummaryNode());host.appendChild(c);updateBlendSum();
}
function renderProductivitySoft(){
  document.querySelectorAll("#productivity .field-grid:first-of-type .field").forEach((f,i)=>{const rule=productivityFields[i]?.[4];const input=f.querySelector("input");if(input)f.className="field "+statusClass(input.value,rule)});
}
function updateBlendSum(){
  const b=state.blends[activeProductLine], keys=["virgin1","fluff","talc","virgin2"], has=keys.some(k=>hasValue(b[k]));
  const sum=keys.reduce((s,k)=>s+(num(b[k])??0),0), e=document.getElementById("blendSum"); if(!e)return;
  e.textContent=has?`Blend total: ${sum.toFixed(1)}%${Math.abs(sum-100)<.01?" ✓":" — check total"}`:"Blend total: —";e.style.color=has&&Math.abs(sum-100)>=.01?"#a56500":"#687686";
}
function yesNoControl(pathObj,key,goodValue){
  const wrap=el("div","yesno");[["Y","YES"],["N","NO"]].forEach(([val,lab])=>{const selected=pathObj[key]===val;const quality=selected?(val===goodValue?" good":" bad"):"";const b=el("button","yn-btn"+(selected?" selected":"")+quality,lab);b.type="button";b.onclick=()=>{pathObj[key]=val;save();renderEquipment()};wrap.appendChild(b)});return wrap;
}
function renderEquipment(){
  const host=document.getElementById("equipment");host.innerHTML="";const c=sectionCard("Equipment Inspection","Colors follow the meaning of each question");c.appendChild(lineSelector(activeEquipmentLine,l=>activeEquipmentLine=l,renderEquipment));
  equipmentFields.forEach(([key,label,good])=>{const item=el("div","eq-item");item.appendChild(el("div","eq-name",label));item.appendChild(yesNoControl(state.equipment[activeEquipmentLine],key,good));c.appendChild(item)});host.appendChild(c);
  const common=sectionCard("Common Areas");[["pumpRoom","Pump Room Inspected"],["mechanicalBlower","Mechanical Room Blower Powder Barrel Checked"],["screenPacks","All screen packs clean and accounted"]].forEach(([key,label])=>{const item=el("div","eq-item");item.appendChild(el("div","eq-name",label));item.appendChild(yesNoControl(state.common,key,"Y"));common.appendChild(item)});
  const time=el("label","field");time.appendChild(document.createTextNode("Pump Room Time"));const ti=document.createElement("input");ti.type="time";ti.value=state.common.pumpTime||"";ti.oninput=()=>{state.common.pumpTime=ti.value;save()};time.appendChild(ti);common.appendChild(time);
  const rc=el("label","check-row"),cb=document.createElement("input");cb.type="checkbox";cb.checked=!!state.common.rollCountComplete;cb.onchange=()=>{state.common.rollCountComplete=cb.checked;save()};rc.append(cb,el("span","","Roll Count completed in separate Roll Count app"));common.appendChild(rc);
  const open=el("button","secondary","Open Roll Count App");open.type="button";open.style.marginTop="8px";open.onclick=()=>{const s=JSON.parse(localStorage.getItem(SETTINGS_KEY)||"{}");if(s.rollCountUrl)window.open(s.rollCountUrl,"_blank");else document.getElementById("settingsDialog").showModal()};common.appendChild(open);host.appendChild(common);
}
function renderInventory(){
  const host=document.getElementById("inventory");host.innerHTML="";const c=sectionCard("Inventory Levels","Silo #1–#5 are pounds only");const grid=el("div","inventory-grid");
  const fields=[["talcBoxes","Talc (boxes)","14 boxes minimum"],["silo1","Silo #1 Inventory","lbs"],["silo2","Silo #2 Inventory","lbs"],["silo3","Silo #3 Inventory","lbs"],["silo4","Silo #4 Inventory","lbs"],["silo5","Silo #5 Inventory","lbs"],["butane","Butane Tank","%"],["co2","CO₂","lbs"],["co2Fill","CO₂ Fill Level","in."]];
  fields.forEach(([key,label,unit])=>{const low=key==="talcBoxes"&&hasValue(state.inventory[key])&&Number(state.inventory[key])<14;const f=el("label","inventory-item"+(low?" low":""));f.appendChild(document.createTextNode(label));const inp=document.createElement("input");inp.type="number";inp.inputMode="decimal";inp.step="any";inp.value=state.inventory[key]??"";inp.oninput=()=>{state.inventory[key]=inp.value;save();if(key==="talcBoxes")renderInventory()};f.appendChild(inp);f.appendChild(el("span","meta",unit));if(low)f.appendChild(el("span","badge bad","LOW"));grid.appendChild(f)});c.appendChild(grid);host.appendChild(c);
}
function renderTrim(){
  const host=document.getElementById("trim");host.innerHTML="";const c=sectionCard("Trim Speeds","Sheet Type / Regrind");for(let i=2;i<=9;i++){const row=el("div","field-grid");[["sheet","Sheet Type"],["regrind","Regrind"]].forEach(([kind,label])=>{const f=el("label","field");f.appendChild(document.createTextNode(`${i} - ${label}`));const inp=document.createElement("input");inp.type="text";inp.value=state.trim[`${i}_${kind}`]??"";inp.oninput=()=>{state.trim[`${i}_${kind}`]=inp.value;save()};f.appendChild(inp);row.appendChild(f)});c.appendChild(row)}host.appendChild(c);
  const n=sectionCard("Notes"),lab=el("label","big-note"),ta=document.createElement("textarea");ta.placeholder="Shift notes, issues, follow-up…";ta.value=state.notes||"";ta.oninput=()=>{state.notes=ta.value;save()};lab.appendChild(ta);n.appendChild(lab);host.appendChild(n);
}
function updateProgress(){
  let total=0,done=0;safetyItems.forEach(([k])=>{total++;if(state.safety[k])done++});LINES.forEach(l=>{productivityFields.forEach(([k])=>{total++;if(hasValue(state.productivity[l][k]))done++});["butane","co2"].forEach(k=>{total++;if(hasValue(state.productivity[l][k]))done++});blendFields.forEach(([k])=>{total++;if(hasValue(state.blends[l][k]))done++});equipmentFields.forEach(([k])=>{total++;if(hasValue(state.equipment[l][k]))done++})});["pumpRoom","mechanicalBlower","screenPacks"].forEach(k=>{total++;if(hasValue(state.common[k]))done++});total++;if(state.common.rollCountComplete)done++;Object.keys(state.inventory).forEach(k=>{total++;if(hasValue(state.inventory[k]))done++});const pct=Math.round(done/total*100);document.getElementById("progressText").textContent=pct+"%";document.getElementById("progressBar").style.width=pct+"%";
}
function reportValue(value,rule,suffix=""){
  if(!hasValue(value))return "—";const c=statusClass(value,rule),mark=c==="status-bad"?"●":c==="status-warn"?"●":"";return `<span class="${c.replace("status-","")}">${escapeHtml(value)}${suffix}${mark?` <b>${mark}</b>`:""}</span>`;
}
function siloCard(i,value){
  return `<div class="silo-card"><div class="silo-art" aria-hidden="true"><div class="silo-cap"></div><div class="silo-body"><span>SILO ${i}</span></div><div class="silo-cone"></div><div class="silo-leg l1"></div><div class="silo-leg l2"></div></div><div class="silo-lbs">${hasValue(value)?fmt(value):"—"} <small>lb</small></div></div>`;
}
function generateReport(){
  save();const m=co2Metrics();
  const safetyRows=safetyItems.map(([key,cat,label])=>`<tr><td class="cat">${escapeHtml(cat)}</td><td class="${state.safety[key]?"yes":"no"}">${state.safety[key]?"☑":"☐"}</td><td>${escapeHtml(label)}</td></tr>`).join("");
  const pRows=productivityFields.map(([key,label,type,meta,rule])=>`<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(meta?meta.replace("Plan: ",""):"—")}</td>${LINES.map(l=>`<td>${reportValue(state.productivity[l][key],rule)}</td>`).join("")}</tr>`).join("");
  const gasRows=[["butane","Butane","lb/hr"],["co2","CO₂","lb/hr"]].map(([key,label,u])=>`<tr><th>${label}</th><td>${u}</td>${LINES.map(l=>`<td>${hasValue(state.productivity[l][key])?escapeHtml(fmt(state.productivity[l][key])):"—"}</td>`).join("")}</tr>`).join("");
  const blendRows=blendFields.map(([key,label])=>`<tr><th>${escapeHtml(label)}</th><td>—</td>${LINES.map(l=>`<td>${escapeHtml(state.blends[l][key]||"—")}</td>`).join("")}</tr>`).join("");
  const co2Class=!m.complete||m.pct===null?"neutral":m.pct>=15?"greenbox":"yellowbox";
  const co2Summary=`<div class="co2-report ${co2Class}"><div><b>Active Lines</b><strong>${m.active}</strong></div><div><b>Total Butane</b><strong>${m.active?fmt(m.butaneTotal)+" lb/hr":"—"}</strong></div><div><b>Total CO₂</b><strong>${m.active?fmt(m.co2Total)+" lb/hr":"—"}</strong></div><div><b>Avg CO₂ / Active Line</b><strong>${m.avg===null?"—":fmt(m.avg)+" lb/hr"}</strong></div><div><b>Total CO₂ Mix</b><strong>${m.pct===null?"—":fmt(m.pct)+"%"}</strong></div>${!m.complete?`<p>Incomplete: enter CO₂ for ${escapeHtml(m.missing.join(", "))}. Use 0 when a line is running without CO₂.</p>`:""}</div>`;
  const eqRows=equipmentFields.map(([key,label,good])=>`<tr><th>${escapeHtml(label)}</th>${LINES.map(l=>{const v=state.equipment[l][key]||"";const cls=!v?"":v===good?"yes":"no";return `<td class="${cls}">${v||"—"}</td>`}).join("")}</tr>`).join("");
  const invRows=[["Talc (14 Boxes Minimum)",state.inventory.talcBoxes," boxes"],["Butane Tank",state.inventory.butane," %"],["CO₂",state.inventory.co2," lbs"],["CO₂ Fill Level",state.inventory.co2Fill," in."]].map(([a,b,u])=>`<tr><th>${a}</th><td>${hasValue(b)?escapeHtml(fmt(b))+u:"—"}</td></tr>`).join("");
  const silos=[1,2,3,4,5].map(i=>siloCard(i,state.inventory[`silo${i}`])).join("");
  const trimRows=Array.from({length:8},(_,j)=>j+2).map(i=>`<tr><th>${i} -</th><td>${escapeHtml(state.trim[`${i}_sheet`]||"")}</td><td>${escapeHtml(state.trim[`${i}_regrind`]||"")}</td></tr>`).join("");
  const problems=[];LINES.forEach(l=>productivityFields.forEach(([key,label,t,mta,rule])=>{if(statusClass(state.productivity[l][key],rule)==="status-bad")problems.push(`${l}: ${label}`)}));if(hasValue(state.inventory.talcBoxes)&&Number(state.inventory.talcBoxes)<14)problems.push("Talc below 14-box minimum");LINES.forEach(l=>equipmentFields.forEach(([key,label,good])=>{const v=state.equipment[l][key];if(v&&v!==good)problems.push(`${l}: ${label}`)}));const summary=problems.length?`${problems.length} item(s) need attention`:"No automatic exceptions detected";

  const report=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sr. Lead Report</title><style>
  @page{size:letter;margin:.38in}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#1a2530;margin:0;background:#eef2f5}.toolbar{position:sticky;top:0;background:#0f3557;color:#fff;padding:10px;display:flex;gap:8px;justify-content:center;z-index:10}.toolbar button{border:0;border-radius:9px;padding:10px 14px;font-weight:700}.paper{max-width:900px;margin:18px auto;background:#fff;padding:26px;box-shadow:0 5px 25px #0002}.head{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:4px solid #0f3557;padding-bottom:10px}h1{font-size:22px;margin:0;color:#0f3557}.dcn{font-size:10px;color:#677481}.meta{display:grid;grid-template-columns:1fr 1.5fr .7fr;gap:8px;margin:12px 0}.meta div{border:1px solid #cbd5de;border-radius:7px;padding:7px}.meta b{display:block;font-size:9px;text-transform:uppercase;color:#6c7884;margin-bottom:2px}.summary{background:#f1f6fa;border-left:5px solid #0f3557;padding:8px 10px;margin:10px 0;font-size:11px;font-weight:700}h2{font-size:13px;color:#0f3557;background:#eaf0f5;padding:6px;margin:12px 0 0;border:1px solid #c7d3dc}table{width:100%;border-collapse:collapse;font-size:9.4px}th,td{border:1px solid #c7d3dc;padding:4px;text-align:center;vertical-align:middle}th{text-align:left;background:#f8fafb}.cat{font-weight:700;text-align:left;width:95px}.yes{color:#1b6f3d;font-weight:800;background:#f0f8f3}.no{color:#b32e2e;font-weight:800;background:#fff1f1}.ok{color:#176b38}.warn{color:#9a6700;background:#fff8df}.bad{color:#aa2929;background:#fff0f0}.sheet{break-before:page}.keep{break-inside:avoid}.co2-report{display:grid;grid-template-columns:repeat(5,1fr);border:1px solid #cbd5de;margin-top:7px}.co2-report>div{padding:7px;border-right:1px solid #d5dee5}.co2-report>div:nth-child(5){border-right:0}.co2-report b{display:block;font-size:8px;text-transform:uppercase;color:#5d6974}.co2-report strong{display:block;font-size:12px;margin-top:3px}.co2-report p{grid-column:1/-1;margin:0;padding:6px 8px;font-size:9px}.greenbox{background:#eef9f2}.yellowbox{background:#fff8e2}.neutral{background:#f5f7f8}.silo-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;padding:10px 2px 4px}.silo-card{text-align:center}.silo-art{width:76px;height:105px;margin:0 auto 4px;position:relative}.silo-cap{position:absolute;top:2px;left:12px;width:52px;height:13px;border:3px solid #2f8a5b;border-bottom:0;border-radius:50% 50% 0 0;background:#ecf8f1}.silo-body{position:absolute;top:12px;left:12px;width:52px;height:60px;border:3px solid #2f8a5b;border-top:0;background:linear-gradient(#e6f6ed,#cfeedd);display:flex;align-items:center;justify-content:center}.silo-body span{font-weight:800;color:#236d48;font-size:9px}.silo-cone{position:absolute;top:72px;left:21px;width:0;height:0;border-left:17px solid transparent;border-right:17px solid transparent;border-top:22px solid #9fd9b7}.silo-leg{position:absolute;top:89px;width:3px;height:15px;background:#4c7660}.silo-leg.l1{left:25px}.silo-leg.l2{right:25px}.silo-lbs{font-weight:800;color:#0f3557;font-size:12px}.silo-lbs small{font-size:9px;color:#677481}.notes{min-height:80px;border:1px solid #c7d3dc;padding:8px;white-space:pre-wrap;font-size:10px}.foot{margin-top:12px;font-size:9px;color:#697681;display:flex;justify-content:space-between}@media print{body{background:white}.toolbar{display:none}.paper{margin:0;box-shadow:none;padding:0}.sheet{break-before:page}}@media(max-width:700px){.paper{margin:0;padding:10px}.meta{grid-template-columns:1fr}.co2-report{grid-template-columns:1fr 1fr}.silo-grid{grid-template-columns:repeat(2,1fr)}}
  </style></head><body><div class="toolbar"><button onclick="window.print()">Print / Save PDF</button><button onclick="window.close()">Close</button></div><main class="paper">
  <div class="head"><div><h1>EXTRUSION SR. LEAD DAILY CHECKLIST</h1><div class="dcn">DCN TN-100-00003</div></div><div class="dcn">Digital Report</div></div><div class="meta"><div><b>Date</b>${escapeHtml(state.meta.date)}</div><div><b>Sr. Lead</b>${escapeHtml(state.meta.lead||"—")}</div><div><b>Shift</b>${escapeHtml(state.meta.shift)}</div></div><div class="summary">${escapeHtml(summary)} · Roll Count: ${state.common.rollCountComplete?"Completed in separate app":"Not marked complete"}</div>
  <h2>SAFETY / FORK TRUCK / QUALITY / HOUSEKEEPING</h2><table>${safetyRows}</table>
  <section class="sheet keep"><h2>PRODUCTIVITY / BLENDS</h2><table><thead><tr><th>Productivity</th><th>Plan</th>${LINES.map(l=>`<th>${l}</th>`).join("")}</tr></thead><tbody>${pRows}${gasRows}</tbody></table><table style="margin-top:6px"><thead><tr><th>Blends</th><th>Plan</th>${LINES.map(l=>`<th>${l}</th>`).join("")}</tr></thead><tbody>${blendRows}</tbody></table>${co2Summary}</section>
  <section class="sheet"><h2>EQUIPMENT INSPECTION</h2><table><thead><tr><th>Item</th>${LINES.map(l=>`<th>${l}</th>`).join("")}</tr></thead><tbody>${eqRows}</tbody></table><table style="margin-top:7px"><tbody><tr><th>Pump Room Inspected</th><td>${state.common.pumpRoom||"—"}</td><th>Time</th><td>${escapeHtml(state.common.pumpTime||"—")}</td></tr><tr><th>Mechanical Room Blower Powder Barrel Checked</th><td>${state.common.mechanicalBlower||"—"}</td><th>All screen packs clean and accounted</th><td>${state.common.screenPacks||"—"}</td></tr></tbody></table>
  <h2>INVENTORY LEVELS</h2><div class="silo-grid">${silos}</div><table>${invRows}</table>
  <h2>TRIM SPEEDS</h2><table><thead><tr><th>Trim Speeds per Hour</th><th>Sheet Type</th><th>Regrind</th></tr></thead><tbody>${trimRows}</tbody></table><h2>NOTES</h2><div class="notes">${escapeHtml(state.notes||"")}</div><div class="foot"><span>DCN TN-100-00003</span><span>Generated from Sr. Lead Checklist PWA v1.1</span></div></section>
  </main></body></html>`;
  const w=window.open("","_blank");if(!w){alert("Allow pop-ups to generate the report.");return;}w.document.open();w.document.write(report);w.document.close();
}

document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));document.querySelectorAll(".panel").forEach(x=>x.classList.remove("active"));b.classList.add("active");document.getElementById(b.dataset.target).classList.add("active")});
["date","lead","shift"].forEach(id=>document.getElementById(id).addEventListener("change",save));
document.getElementById("saveBtn").onclick=()=>{save();const b=document.getElementById("saveBtn"),old=b.textContent;b.textContent="Saved ✓";setTimeout(()=>b.textContent=old,900)};
document.getElementById("resetBtn").onclick=()=>{if(confirm("Clear the current shift checklist?")){localStorage.removeItem(KEY);localStorage.removeItem(OLD_KEY);location.reload()}};
document.getElementById("reportBtn").onclick=generateReport;
const sd=document.getElementById("settingsDialog");document.getElementById("settingsBtn").onclick=()=>{const s=JSON.parse(localStorage.getItem(SETTINGS_KEY)||"{}");document.getElementById("rollCountUrl").value=s.rollCountUrl||"";sd.showModal()};document.getElementById("saveSettings").onclick=()=>{localStorage.setItem(SETTINGS_KEY,JSON.stringify({rollCountUrl:document.getElementById("rollCountUrl").value.trim()}))};
load();renderSafety();renderProductivity();renderEquipment();renderInventory();renderTrim();updateProgress();if("serviceWorker" in navigator)navigator.serviceWorker.register("sw.js").catch(()=>{});
