
const LINES = ["EXT1","EXT2","EXT3","EXT4"];
const KEY = "srLeadChecklist.v1";
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
  ["diePressure","Die Pressure","number","Plan: 1800–2000 psi",1800,2000],
  ["dieMelt","Die Melt","number","Plan: 300–305",300,305],
  ["outsideAir","Outside Air Pressure","number","Plan: ≤ 4 psi",null,4],
  ["insideAir","Inside Air Pressure","number","Plan: ≤ 10 psi",null,10],
  ["primaryLoad","Primary Motor Load","number","Plan: < 80%",null,79.999],
  ["primaryScrew","Primary Screw Speed","number",""],
  ["secondaryLoad","Secondary Motor Load","number","Plan: < 80%",null,79.999],
  ["secondaryScrew","Secondary Screw Speed","number",""],
  ["differential","Differential","number","Plan: < 800 psi",null,799.999],
  ["butaneCo2","Butane / CO₂ Set Points","text",""]
];

const blendFields = [
  ["virgin1","Virgin 1 (%)"],
  ["fluff","Fluff (%)"],
  ["talc","Talc (%)"],
  ["virgin2","Virgin 2 (%)"],
  ["silo","Silo in Use"]
];

const equipmentFields = [
  ["gearbox","Gearbox Inspection (Lube Level Good)"],
  ["noise","Noises or any issues"],
  ["primaryTank","Primary Water Tank Full"],
  ["secondaryTank","Secondary Water Tank Full"],
  ["meech","Meech Equipment working properly"],
  ["regen","Regen Blower Turned On"],
  ["camBolts","Issues with Cam Bolts"],
  ["dieHead","Issues with Die Head"]
];

const state = {
  meta:{date:"",lead:"",shift:"C"},
  safety:{},
  productivity:{},
  blends:{},
  equipment:{},
  common:{pumpRoom:"",pumpTime:"",mechanicalBlower:"",screenPacks:"",rollCountComplete:false},
  inventory:{talcBoxes:"",silo1:"",silo2:"",silo3:"",silo4:"",silo5:"",butane:"",co2:"",co2Fill:""},
  trim:{}, notes:""
};
LINES.forEach(l=>{
  state.productivity[l]={};
  state.blends[l]={};
  state.equipment[l]={};
});
let activeProductLine="EXT1", activeBlendLine="EXT1", activeEquipmentLine="EXT1";

function el(tag, cls="", txt=""){
  const x=document.createElement(tag); if(cls)x.className=cls; if(txt)x.textContent=txt; return x;
}
function save(){
  state.meta.date = document.getElementById("date").value;
  state.meta.lead = document.getElementById("lead").value;
  state.meta.shift = document.getElementById("shift").value;
  localStorage.setItem(KEY, JSON.stringify(state));
  updateProgress();
}
function load(){
  const raw=localStorage.getItem(KEY);
  if(raw){
    try{
      const s=JSON.parse(raw);
      Object.assign(state,s);
      LINES.forEach(l=>{
        state.productivity[l]=state.productivity[l]||{};
        state.blends[l]=state.blends[l]||{};
        state.equipment[l]=state.equipment[l]||{};
      });
    }catch(e){}
  }
  if(!state.meta.date) state.meta.date = new Date().toISOString().slice(0,10);
  document.getElementById("date").value=state.meta.date;
  document.getElementById("lead").value=state.meta.lead||"";
  document.getElementById("shift").value=state.meta.shift||"C";
}

function sectionCard(title, hint=""){
  const c=el("div","card");
  const t=el("div","section-title");
  const h=el("h2","",title); t.appendChild(h);
  if(hint){ const s=el("span","hint",hint); t.appendChild(s); }
  c.appendChild(t); return c;
}

function renderSafety(){
  const host=document.getElementById("safety"); host.innerHTML="";
  let currentCat=null, card=null;
  safetyItems.forEach(([key,cat,label])=>{
    if(cat!==currentCat){
      card=sectionCard(cat); host.appendChild(card); currentCat=cat;
    }
    const row=el("label","check-row");
    const cb=document.createElement("input"); cb.type="checkbox"; cb.checked=!!state.safety[key];
    cb.addEventListener("change",()=>{state.safety[key]=cb.checked;save()});
    const sp=el("span","",label); row.append(cb,sp); card.appendChild(row);
  });
}

function lineSelector(active,setActive,rerender){
  const wrap=el("div","line-tabs");
  LINES.forEach(l=>{
    const b=el("button","line-tab"+(active===l?" active":""),l); b.type="button";
    b.onclick=()=>{setActive(l);rerender();};
    wrap.appendChild(b);
  });
  return wrap;
}
function statusClass(value,min,max){
  if(value===""||value===null||isNaN(Number(value))) return "";
  const n=Number(value);
  if(min!==undefined && min!==null && n<min) return "status-bad";
  if(max!==undefined && max!==null && n>max) return "status-bad";
  if(max!==undefined && max!==null && min!==undefined && min!==null){
    const span=max-min, edge=span*.15;
    if(n<min+edge||n>max-edge) return "status-warn";
  } else if(max!==undefined && max!==null && n>max*.92) return "status-warn";
  return "status-ok";
}
function renderProductivity(){
  const host=document.getElementById("productivity"); host.innerHTML="";
  const c=sectionCard("Productivity", "Enter one extrusion line at a time");
  c.appendChild(lineSelector(activeProductLine,l=>activeProductLine=l,renderProductivity));
  const grid=el("div","field-grid");
  productivityFields.forEach(([key,label,type,meta,min,max])=>{
    const f=el("label","field "+statusClass(state.productivity[activeProductLine][key],min,max));
    f.appendChild(document.createTextNode(label));
    const inp=document.createElement("input"); inp.type=type; if(type==="number") inp.inputMode="decimal";
    inp.value=state.productivity[activeProductLine][key]??"";
    inp.oninput=()=>{state.productivity[activeProductLine][key]=inp.value;save(); renderProductivitySoft();};
    f.appendChild(inp);
    if(meta) f.appendChild(el("span","meta",meta));
    grid.appendChild(f);
  });
  c.appendChild(grid); host.appendChild(c);
}
function renderProductivitySoft(){
  document.querySelectorAll("#productivity .field").forEach((f,i)=>{
    const [, , , ,min,max]=productivityFields[i];
    const input=f.querySelector("input"); f.className="field "+statusClass(input.value,min,max);
  });
}

function renderBlends(){
  const host=document.getElementById("blends"); host.innerHTML="";
  const c=sectionCard("Blends","Percent fields can be checked against 100%");
  c.appendChild(lineSelector(activeBlendLine,l=>activeBlendLine=l,renderBlends));
  const grid=el("div","field-grid");
  blendFields.forEach(([key,label])=>{
    const f=el("label","field"); f.appendChild(document.createTextNode(label));
    const inp=document.createElement("input"); inp.type=key==="silo"?"text":"number"; if(inp.type==="number") inp.inputMode="decimal";
    inp.value=state.blends[activeBlendLine][key]??"";
    inp.oninput=()=>{state.blends[activeBlendLine][key]=inp.value;save(); updateBlendSum()};
    f.appendChild(inp); grid.appendChild(f);
  });
  c.appendChild(grid);
  const sum=el("div","small"); sum.id="blendSum"; sum.style.marginTop="10px"; c.appendChild(sum);
  host.appendChild(c); updateBlendSum();
}
function updateBlendSum(){
  const b=state.blends[activeBlendLine];
  const vals=["virgin1","fluff","talc","virgin2"].map(k=>Number(b[k]||0));
  const has= ["virgin1","fluff","talc","virgin2"].some(k=>String(b[k]??"").trim()!=="");
  const sum=vals.reduce((a,b)=>a+b,0), e=document.getElementById("blendSum");
  if(!e) return;
  e.textContent = has ? `Blend total: ${sum.toFixed(1)}%${Math.abs(sum-100)<0.01?" ✓":" — check total"}` : "Blend total: —";
  e.style.color = has && Math.abs(sum-100)>=0.01 ? "#a56500" : "#687686";
}

function yesNoControl(pathObj,key){
  const wrap=el("div","yesno");
  [["Y","YES"],["N","NO"]].forEach(([val,lab])=>{
    const b=el("button","yn-btn "+(pathObj[key]===val?"selected "+(val==="Y"?"yes":"no"):""),lab); b.type="button";
    b.onclick=()=>{pathObj[key]=val;save();renderEquipment();}; wrap.appendChild(b);
  }); return wrap;
}
function renderEquipment(){
  const host=document.getElementById("equipment"); host.innerHTML="";
  const c=sectionCard("Equipment Inspection","Tap YES or NO");
  c.appendChild(lineSelector(activeEquipmentLine,l=>activeEquipmentLine=l,renderEquipment));
  equipmentFields.forEach(([key,label])=>{
    const item=el("div","eq-item"); item.appendChild(el("div","eq-name",label));
    item.appendChild(yesNoControl(state.equipment[activeEquipmentLine],key)); c.appendChild(item);
  });
  host.appendChild(c);
  const common=sectionCard("Common Areas");
  [["pumpRoom","Pump Room Inspected"],["mechanicalBlower","Mechanical Room Blower Powder Barrel Checked"],["screenPacks","All screen packs clean and accounted"]].forEach(([key,label])=>{
    const item=el("div","eq-item"); item.appendChild(el("div","eq-name",label)); item.appendChild(yesNoControl(state.common,key)); common.appendChild(item);
  });
  const time=el("label","field"); time.appendChild(document.createTextNode("Pump Room Time"));
  const ti=document.createElement("input"); ti.type="time"; ti.value=state.common.pumpTime||""; ti.oninput=()=>{state.common.pumpTime=ti.value;save()}; time.appendChild(ti); common.appendChild(time);

  const rc=el("label","check-row"); const cb=document.createElement("input"); cb.type="checkbox"; cb.checked=!!state.common.rollCountComplete;
  cb.onchange=()=>{state.common.rollCountComplete=cb.checked;save()}; rc.append(cb,el("span","","Roll Count completed in separate Roll Count app")); common.appendChild(rc);
  const open=el("button","secondary","Open Roll Count App"); open.type="button"; open.style.marginTop="8px";
  open.onclick=()=>{const s=JSON.parse(localStorage.getItem(SETTINGS_KEY)||"{}"); if(s.rollCountUrl) window.open(s.rollCountUrl,"_blank"); else document.getElementById("settingsDialog").showModal();};
  common.appendChild(open); host.appendChild(common);
}

function renderInventory(){
  const host=document.getElementById("inventory"); host.innerHTML="";
  const c=sectionCard("Inventory Levels","Talc minimum: 14 boxes");
  const grid=el("div","inventory-grid");
  const fields=[
    ["talcBoxes","Talc (boxes)","14 boxes minimum"],
    ["silo1","Silo #1 Inventory","lbs"],["silo2","Silo #2 Inventory","lbs"],["silo3","Silo #3 Inventory","lbs"],
    ["silo4","Silo #4 Inventory","lbs"],["silo5","Silo #5 Inventory","lbs"],["butane","Butane Tank","%"],
    ["co2","CO₂","lbs"],["co2Fill","CO₂ Fill Level","in."]
  ];
  fields.forEach(([key,label,unit])=>{
    const low=key==="talcBoxes" && state.inventory[key]!=="" && Number(state.inventory[key])<14;
    const f=el("label","inventory-item"+(low?" low":"")); f.appendChild(document.createTextNode(label));
    const inp=document.createElement("input"); inp.type="number"; inp.inputMode="decimal"; inp.value=state.inventory[key]??"";
    inp.oninput=()=>{state.inventory[key]=inp.value;save();renderInventory()};
    f.appendChild(inp); f.appendChild(el("span","meta",unit)); if(low) f.appendChild(el("span","badge bad","LOW"));
    grid.appendChild(f);
  });
  c.appendChild(grid); host.appendChild(c);
}

function renderTrim(){
  const host=document.getElementById("trim"); host.innerHTML="";
  const c=sectionCard("Trim Speeds","Sheet Type / Regrind");
  for(let i=2;i<=9;i++){
    const row=el("div","field-grid");
    [["sheet","Sheet Type"],["regrind","Regrind"]].forEach(([kind,label])=>{
      const f=el("label","field"); f.appendChild(document.createTextNode(`${i} - ${label}`));
      const inp=document.createElement("input"); inp.type="text"; inp.value=state.trim[`${i}_${kind}`]??"";
      inp.oninput=()=>{state.trim[`${i}_${kind}`]=inp.value;save()}; f.appendChild(inp); row.appendChild(f);
    });
    c.appendChild(row);
  }
  host.appendChild(c);
  const n=sectionCard("Notes");
  const lab=el("label","big-note"); const ta=document.createElement("textarea"); ta.placeholder="Shift notes, issues, follow-up…"; ta.value=state.notes||"";
  ta.oninput=()=>{state.notes=ta.value;save()}; lab.appendChild(ta); n.appendChild(lab); host.appendChild(n);
}

function updateProgress(){
  let total=0, done=0;
  safetyItems.forEach(([k])=>{total++; if(state.safety[k])done++;});
  LINES.forEach(l=>{
    productivityFields.forEach(([k])=>{total++; if(String(state.productivity[l][k]??"").trim()!=="")done++;});
    blendFields.forEach(([k])=>{total++; if(String(state.blends[l][k]??"").trim()!=="")done++;});
    equipmentFields.forEach(([k])=>{total++; if(state.equipment[l][k])done++;});
  });
  ["pumpRoom","mechanicalBlower","screenPacks"].forEach(k=>{total++; if(state.common[k])done++;});
  total++; if(state.common.rollCountComplete) done++;
  Object.keys(state.inventory).forEach(k=>{total++; if(String(state.inventory[k]??"").trim()!=="")done++;});
  const pct=Math.round(done/total*100);
  document.getElementById("progressText").textContent=pct+"%";
  document.getElementById("progressBar").style.width=pct+"%";
}

function reportStatus(value,min,max, suffix=""){
  if(value===""||value==null) return "—";
  const c=statusClass(value,min,max), icon=c==="status-bad"?"⚠":c==="status-warn"?"△":"";
  return `${escapeHtml(value)}${suffix} ${icon}`.trim();
}
function escapeHtml(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}

function generateReport(){
  save();
  const pRows=productivityFields.map(([key,label,type,meta,min,max])=>{
    const plan=meta?meta.replace("Plan: ",""):"";
    return `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(plan||"—")}</td>${LINES.map(l=>`<td>${reportStatus(state.productivity[l][key],min,max)}</td>`).join("")}</tr>`;
  }).join("");

  const blendRows=blendFields.map(([key,label])=>`<tr><th>${escapeHtml(label)}</th><td>—</td>${LINES.map(l=>`<td>${escapeHtml(state.blends[l][key]||"—")}</td>`).join("")}</tr>`).join("");

  const eqRows=equipmentFields.map(([key,label])=>`<tr><th>${escapeHtml(label)}</th>${LINES.map(l=>{
    const v=state.equipment[l][key]; return `<td class="${v==="N"?"no":v==="Y"?"yes":""}">${v||"—"}</td>`;
  }).join("")}</tr>`).join("");

  const safetyRows=safetyItems.map(([key,cat,label])=>`<tr><td class="cat">${escapeHtml(cat)}</td><td class="${state.safety[key]?"yes":"no"}">${state.safety[key]?"☑":"☐"}</td><td>${escapeHtml(label)}</td></tr>`).join("");

  const inv=[
    ["Talc (14 Boxes Minimum)", state.inventory.talcBoxes, " boxes"],
    ["Silo #1 Inventory",state.inventory.silo1," lbs"],["Silo #2 Inventory",state.inventory.silo2," lbs"],["Silo #3 Inventory",state.inventory.silo3," lbs"],
    ["Silo #4 Inventory",state.inventory.silo4," lbs"],["Silo #5 Inventory",state.inventory.silo5," lbs"],
    ["Butane Tank",state.inventory.butane," %"],["CO₂",state.inventory.co2," lbs"],["CO₂ Fill Level",state.inventory.co2Fill," in."]
  ].map(([a,b,u])=>`<tr><th>${a}</th><td>${b!==""?escapeHtml(b)+u:"—"}</td></tr>`).join("");

  const trimRows=Array.from({length:8},(_,j)=>j+2).map(i=>`<tr><th>${i} -</th><td>${escapeHtml(state.trim[`${i}_sheet`]||"")}</td><td>${escapeHtml(state.trim[`${i}_regrind`]||"")}</td></tr>`).join("");

  const problems=[];
  LINES.forEach(l=>productivityFields.forEach(([key,label,t,m,min,max])=>{if(statusClass(state.productivity[l][key],min,max)==="status-bad")problems.push(`${l}: ${label}`)}));
  if(state.inventory.talcBoxes!=="" && Number(state.inventory.talcBoxes)<14) problems.push("Talc below 14-box minimum");
  LINES.forEach(l=>equipmentFields.forEach(([key,label])=>{if(state.equipment[l][key]==="N") problems.push(`${l}: ${label}`)}));
  const summary = problems.length ? `${problems.length} item(s) need attention` : "No automatic exceptions detected";

  const report = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Sr. Lead Report</title><style>
  @page{size:letter;margin:.42in}
  *{box-sizing:border-box} body{font-family:Arial,Helvetica,sans-serif;color:#1a2530;margin:0;background:#eef2f5}
  .toolbar{position:sticky;top:0;background:#0f3557;color:#fff;padding:10px;display:flex;gap:8px;justify-content:center}
  .toolbar button{border:0;border-radius:9px;padding:10px 14px;font-weight:700}
  .paper{max-width:900px;margin:18px auto;background:#fff;padding:28px;box-shadow:0 5px 25px #0002}
  .head{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:4px solid #0f3557;padding-bottom:12px}
  h1{font-size:24px;margin:0;color:#0f3557}.dcn{font-size:11px;color:#677481}
  .meta{display:grid;grid-template-columns:1fr 1.5fr .7fr;gap:10px;margin:14px 0}
  .meta div{border:1px solid #cbd5de;border-radius:8px;padding:8px}.meta b{display:block;font-size:10px;text-transform:uppercase;color:#6c7884;margin-bottom:3px}
  .summary{background:#f1f6fa;border-left:5px solid #0f3557;padding:10px 12px;margin:12px 0;font-weight:700}
  h2{font-size:14px;color:#0f3557;background:#eaf0f5;padding:8px;margin:16px 0 0;border:1px solid #c7d3dc}
  table{width:100%;border-collapse:collapse;font-size:11px} th,td{border:1px solid #c7d3dc;padding:6px;text-align:center;vertical-align:middle}
  th{text-align:left;background:#f8fafb}.cat{font-weight:700;text-align:left;width:105px}.yes{color:#1b6f3d;font-weight:800}.no{color:#b32e2e;font-weight:800}
  .notes{min-height:90px;border:1px solid #c7d3dc;padding:10px;white-space:pre-wrap;font-size:12px}
  .foot{margin-top:14px;font-size:10px;color:#697681;display:flex;justify-content:space-between}
  @media print{body{background:white}.toolbar{display:none}.paper{margin:0;box-shadow:none;padding:0}.pagebreak{break-before:page}}
  @media(max-width:700px){.paper{margin:0;padding:12px}.meta{grid-template-columns:1fr}table{font-size:9px}th,td{padding:4px}}
  </style></head><body>
  <div class="toolbar"><button onclick="window.print()">Print / Save PDF</button><button onclick="window.close()">Close</button></div>
  <main class="paper">
    <div class="head"><div><h1>EXTRUSION SR. LEAD DAILY CHECKLIST</h1><div class="dcn">DCN TN-100-00003</div></div><div class="dcn">Digital Report</div></div>
    <div class="meta"><div><b>Date</b>${escapeHtml(state.meta.date)}</div><div><b>Sr. Lead</b>${escapeHtml(state.meta.lead||"—")}</div><div><b>Shift</b>${escapeHtml(state.meta.shift)}</div></div>
    <div class="summary">${escapeHtml(summary)} · Roll Count: ${state.common.rollCountComplete?"Completed in separate app":"Not marked complete"}</div>

    <h2>SAFETY / FORK TRUCK / QUALITY / HOUSEKEEPING</h2>
    <table>${safetyRows}</table>

    <h2>PRODUCTIVITY</h2>
    <table><thead><tr><th>Productivity</th><th>Plan</th>${LINES.map(l=>`<th>${l}</th>`).join("")}</tr></thead><tbody>${pRows}</tbody></table>

    <h2>BLENDS</h2>
    <table><thead><tr><th>Blends</th><th>Plan</th>${LINES.map(l=>`<th>${l}</th>`).join("")}</tr></thead><tbody>${blendRows}</tbody></table>

    <div class="pagebreak"></div>
    <h2>EQUIPMENT INSPECTION</h2>
    <table><thead><tr><th>Item</th>${LINES.map(l=>`<th>${l}</th>`).join("")}</tr></thead><tbody>${eqRows}</tbody></table>
    <table style="margin-top:8px"><tbody>
      <tr><th>Pump Room Inspected</th><td>${state.common.pumpRoom||"—"}</td><th>Time</th><td>${escapeHtml(state.common.pumpTime||"—")}</td></tr>
      <tr><th>Mechanical Room Blower Powder Barrel Checked</th><td>${state.common.mechanicalBlower||"—"}</td><th>All screen packs clean and accounted</th><td>${state.common.screenPacks||"—"}</td></tr>
    </tbody></table>

    <h2>INVENTORY LEVELS</h2>
    <table>${inv}</table>

    <h2>TRIM SPEEDS</h2>
    <table><thead><tr><th>Trim Speeds per Hour</th><th>Sheet Type</th><th>Regrind</th></tr></thead><tbody>${trimRows}</tbody></table>

    <h2>NOTES</h2>
    <div class="notes">${escapeHtml(state.notes||"")}</div>
    <div class="foot"><span>DCN TN-100-00003</span><span>Generated from Sr. Lead Checklist PWA</span></div>
  </main></body></html>`;

  const w=window.open("","_blank");
  if(!w){alert("Allow pop-ups to generate the report."); return;}
  w.document.open(); w.document.write(report); w.document.close();
}

document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{
  document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));
  document.querySelectorAll(".panel").forEach(x=>x.classList.remove("active"));
  b.classList.add("active"); document.getElementById(b.dataset.target).classList.add("active");
});
["date","lead","shift"].forEach(id=>document.getElementById(id).addEventListener("change",save));
document.getElementById("saveBtn").onclick=()=>{save(); const b=document.getElementById("saveBtn"); const old=b.textContent;b.textContent="Saved ✓";setTimeout(()=>b.textContent=old,900)};
document.getElementById("resetBtn").onclick=()=>{
  if(confirm("Clear the current shift checklist?")){
    localStorage.removeItem(KEY); location.reload();
  }
};
document.getElementById("reportBtn").onclick=generateReport;

const sd=document.getElementById("settingsDialog");
document.getElementById("settingsBtn").onclick=()=>{
  const s=JSON.parse(localStorage.getItem(SETTINGS_KEY)||"{}"); document.getElementById("rollCountUrl").value=s.rollCountUrl||""; sd.showModal();
};
document.getElementById("saveSettings").onclick=()=>{
  localStorage.setItem(SETTINGS_KEY,JSON.stringify({rollCountUrl:document.getElementById("rollCountUrl").value.trim()}));
};

load(); renderSafety(); renderProductivity(); renderBlends(); renderEquipment(); renderInventory(); renderTrim(); updateProgress();
if("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(()=>{});
