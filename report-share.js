(function(){
"use strict";

const D = window.REPORT_DATA || {};
const COLORS={
  navy:"#0f3557",ink:"#1a2530",muted:"#687686",line:"#c7d3dc",soft:"#eaf0f5",
  green:"#176b38",greenBg:"#eff8f2",yellow:"#946200",yellowBg:"#fff7dd",
  red:"#aa2929",redBg:"#fff0f0"
};
let preparedPdfBlob=null;
const CO2_TANK_TABLE=[
  {inch:5,gal:30,pct:0.4},{inch:20,gal:377,pct:5.1},{inch:35,gal:835,pct:11.2},{inch:50,gal:1327,pct:17.8},
  {inch:65,gal:1820,pct:24.4},{inch:80,gal:2313,pct:31.0},{inch:95,gal:2805,pct:37.7},{inch:110,gal:3298,pct:44.3},
  {inch:130,gal:3955,pct:53.1},{inch:150,gal:4612,pct:61.9},{inch:170,gal:5268,pct:70.7},{inch:190,gal:5925,pct:79.5},
  {inch:210,gal:6582,pct:88.4},{inch:225,gal:7075,pct:95.0},{inch:236,gal:7450,pct:100.0}
];
function fmtNum(v,max=2){const n=Number(v);return Number.isFinite(n)?n.toLocaleString("en-US",{maximumFractionDigits:max}):"—"}
function calcCo2Tank(reading){const n=Number(reading);if(!Number.isFinite(n))return null;for(const row of CO2_TANK_TABLE){if(Math.abs(row.inch-n)<1e-9)return{inch:n,gal:row.gal,pct:row.pct,exact:true}}if(n<=CO2_TANK_TABLE[0].inch)return{inch:n,gal:CO2_TANK_TABLE[0].gal,pct:CO2_TANK_TABLE[0].pct,exact:false};if(n>=CO2_TANK_TABLE[CO2_TANK_TABLE.length-1].inch)return{inch:n,gal:CO2_TANK_TABLE[CO2_TANK_TABLE.length-1].gal,pct:CO2_TANK_TABLE[CO2_TANK_TABLE.length-1].pct,exact:false};for(let i=0;i<CO2_TANK_TABLE.length-1;i++){const a=CO2_TANK_TABLE[i],b=CO2_TANK_TABLE[i+1];if(n>a.inch&&n<b.inch){const t=(n-a.inch)/(b.inch-a.inch);return{inch:n,gal:a.gal+(b.gal-a.gal)*t,pct:a.pct+(b.pct-a.pct)*t,exact:false}}}return null}
function co2TankReportText(reading){const d=calcCo2Tank(reading);return d?`${fmtNum(d.inch)} in. WC | ${fmtNum(d.gal)} gal | ${fmtNum(d.pct,1)}%`:"—"}

function ctext(ctx,text,x,y,opt={}){
  ctx.font=(opt.bold?"700 ":"400 ")+(opt.size||18)+"px Arial";
  ctx.fillStyle=opt.color||COLORS.ink;
  ctx.textAlign=opt.align||"left";
  ctx.textBaseline="top";
  ctx.fillText(String(text??""),x,y);
}
function wrapLines(ctx,text,maxWidth){
  const words=String(text??"").split(/\s+/),lines=[];let line="";
  for(const word of words){
    const test=line?line+" "+word:word;
    if(ctx.measureText(test).width>maxWidth&&line){lines.push(line);line=word}else line=test;
  }
  if(line)lines.push(line);
  return lines.length?lines:[""];
}
function wrapped(ctx,text,x,y,maxWidth,lineH,opt={}){
  ctx.font=(opt.bold?"700 ":"400 ")+(opt.size||18)+"px Arial";
  ctx.fillStyle=opt.color||COLORS.ink;
  ctx.textAlign=opt.align||"left";
  ctx.textBaseline="top";
  const lines=wrapLines(ctx,text,maxWidth);
  lines.forEach((ln,i)=>ctx.fillText(ln,x,y+i*lineH));
  return lines.length*lineH;
}
function section(ctx,title,y){
  ctx.fillStyle=COLORS.soft;ctx.fillRect(46,y,1183,42);
  ctx.strokeStyle=COLORS.line;ctx.strokeRect(46,y,1183,42);
  ctext(ctx,title,64,y+9,{bold:true,size:22,color:COLORS.navy});
  return y+42;
}
function drawMeta(ctx,y,d){
  const xs=[46,405,990],ws=[340,565,239],labels=["DATE","SR. LEAD","SHIFT"],vals=[d.meta.date,d.meta.lead,d.meta.shift];
  for(let i=0;i<3;i++){
    ctx.strokeStyle=COLORS.line;ctx.strokeRect(xs[i],y,ws[i],82);
    ctext(ctx,labels[i],xs[i]+14,y+12,{bold:true,size:15,color:COLORS.muted});
    ctext(ctx,vals[i],xs[i]+14,y+38,{size:24});
  }
  return y+96;
}
function drawHeader(ctx,d,withMeta=true){
  ctx.fillStyle="#fff";ctx.fillRect(0,0,1275,1650);
  ctext(ctx,"EXTRUSION SR. LEAD DAILY CHECKLIST",46,42,{bold:true,size:34,color:COLORS.navy});
  ctext(ctx,"DCN TN-100-00003",46,86,{size:15,color:COLORS.muted});
  ctx.fillStyle=COLORS.navy;ctx.fillRect(46,122,1183,6);
  return withMeta?drawMeta(ctx,148,d):156;
}
function drawSummary(ctx,y,items){
  if(!items.length)return y;
  const h=42+items.length*30;
  ctx.fillStyle=COLORS.yellowBg;ctx.fillRect(46,y,1183,h);
  ctx.fillStyle="#c98900";ctx.fillRect(46,y,7,h);
  ctext(ctx,"⚠ "+items.length+" item(s) need attention",67,y+10,{bold:true,size:19});
  items.forEach((p,i)=>ctext(ctx,"• "+p,78,y+45+i*30,{bold:true,size:16,color:COLORS.ink}));
  return y+54+items.length*30;
}
function rowHeight(ctx,cells,widths,size=17,minH=42){
  ctx.font="400 "+size+"px Arial";let max=1;
  cells.forEach((c,i)=>{max=Math.max(max,wrapLines(ctx,c?.text??c,widths[i]-18).length)});
  return Math.max(minH,max*(size+5)+16);
}
function table(ctx,x,y,widths,rows,opt={}){
  const size=opt.size||17;let cy=y;
  for(const row of rows){
    const h=rowHeight(ctx,row,widths,size,opt.minH||42);let cx=x;
    row.forEach((cell,i)=>{
      cell=typeof cell==="object"?cell:{text:cell};
      ctx.fillStyle=cell.bg||"#fff";ctx.fillRect(cx,cy,widths[i],h);
      ctx.strokeStyle=COLORS.line;ctx.strokeRect(cx,cy,widths[i],h);
      const align=cell.align||"left";
      const tx=align==="center"?cx+widths[i]/2:align==="right"?cx+widths[i]-9:cx+9;
      wrapped(ctx,cell.text??"",tx,cy+8,widths[i]-18,size+5,{size,bold:!!cell.bold,color:cell.color||COLORS.ink,align});
      cx+=widths[i];
    });
    cy+=h;
  }
  return cy;
}
function statusCell(value,status){
  let bg="#fff",color=COLORS.ink;
  if(status==="status-ok"){bg=COLORS.greenBg;color=COLORS.green}
  else if(status==="status-warn"){bg=COLORS.yellowBg;color=COLORS.yellow}
  else if(status==="status-bad"){bg=COLORS.redBg;color=COLORS.red}
  return{text:value||"—",align:"center",bg,color,bold:!!status};
}
function siloColor(v){
  const n=Number(v);
  if(!Number.isFinite(n))return{stroke:"#7b8995",fill:"#edf1f4",cone:"#cbd5dd",text:"#5e6b77"};
  if(n>100000)return{stroke:"#2f8a5b",fill:"#ddf3e6",cone:"#9fd9b7",text:COLORS.green};
  if(n>=50000)return{stroke:"#c18a12",fill:"#fff1bd",cone:"#f0cc6a",text:COLORS.yellow};
  return{stroke:"#bd3d3d",fill:"#ffe1e1",cone:"#e99898",text:COLORS.red};
}
function roundRectPath(ctx,x,y,w,h,r){
  r=Math.min(r,w/2,h/2);
  ctx.beginPath();
  ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();
}
function drawSilo(ctx,cx,y,label,value){
  const c=siloColor(value),w=100,left=cx-w/2;
  ctx.strokeStyle=c.stroke;ctx.lineWidth=5;ctx.fillStyle=c.fill;
  roundRectPath(ctx,left,y,w,90,16);ctx.fill();ctx.stroke();
  ctx.fillStyle=c.cone;ctx.beginPath();ctx.moveTo(left+18,y+90);ctx.lineTo(left+w-18,y+90);ctx.lineTo(cx,y+126);ctx.closePath();ctx.fill();
  ctx.fillStyle=c.stroke;ctx.fillRect(left+25,y+124,6,28);ctx.fillRect(left+w-31,y+124,6,28);
  ctext(ctx,label,cx,y+34,{bold:true,size:17,color:c.text,align:"center"});
  const t=(value!==""&&value!=null&&!Number.isNaN(Number(value)))?Number(value).toLocaleString("en-US",{maximumFractionDigits:2})+" lb":"—";
  ctext(ctx,t,cx,y+160,{bold:true,size:18,color:c.text,align:"center"});
}
function makeCanvas(){const c=document.createElement("canvas");c.width=1275;c.height=1650;return c}
function renderPdfPages(d){
  const pages=[];

  let c=makeCanvas(),ctx=c.getContext("2d"),y=drawHeader(ctx,d,true);
  y=drawSummary(ctx,y,d.problems||[]);
  y=section(ctx,"SAFETY / FORK TRUCK / QUALITY / HOUSEKEEPING",y+10);
  const srows=(d.safety||[]).map((r,i)=>[
    {text:r.cat,bold:true},
    {text:r.done?"✓":"",align:"center",color:r.done?COLORS.green:COLORS.red,bold:true},
    {text:r.label},
    {text:(d.times?.safety&&d.times.safety[r.key])?new Date(d.times.safety[r.key]).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"}):"—",align:"center",color:COLORS.muted}
  ]);
  table(ctx,46,y,[235,60,748,140],srows,{size:16,minH:50});
  pages.push(c);

  c=makeCanvas();ctx=c.getContext("2d");y=drawHeader(ctx,d,false);y=section(ctx,"PRODUCTIVITY / BLENDS",y);
  const widths=[300,300,146,146,146,145];
  let prows=[[{text:"Productivity",bold:true},{text:"Plan",bold:true},{text:"EXT1",bold:true,align:"center"},{text:"EXT2",bold:true,align:"center"},{text:"EXT3",bold:true,align:"center"},{text:"EXT4",bold:true,align:"center"}]];
  prows.push([{text:"Line Status",bold:true},{text:"—",align:"center"},...["EXT1","EXT2","EXT3","EXT4"].map(l=>({text:d.lineStatus?.[l]||"RUNNING",align:"center",bg:d.lineStatus?.[l]==="DOWN"?"#eef1f4":COLORS.greenBg,color:d.lineStatus?.[l]==="DOWN"?"#5c6874":COLORS.green,bold:true}))]);
  (d.productivity||[]).forEach(r=>prows.push([{text:r.label,bold:true},{text:r.plan,align:"center"},...r.values.map(v=>statusCell(v.value,v.status))]));
  (d.gas||[]).forEach(r=>prows.push([{text:r.label,bold:true},{text:r.unit,align:"center"},...r.values.map(v=>({text:v||"—",align:"center"}))]));
  prows.push([{text:"CO2 %",bold:true},{text:"CO2 / (Butane + CO2)",align:"center"},...(d.co2Pct||[]).map((p,i)=>{const l=["EXT1","EXT2","EXT3","EXT4"][i];if(d.lineStatus?.[l]==="DOWN")return{text:"—",align:"center"};return{text:p==null?"—":p.toFixed(2)+"%",align:"center",bg:p==null?"#fff":p>=15?COLORS.greenBg:COLORS.yellowBg,color:p==null?COLORS.ink:p>=15?COLORS.green:COLORS.yellow,bold:p!=null}})]);
  y=table(ctx,46,y,widths,prows,{size:15,minH:42});y+=16;
  const brows=[[{text:"Blends",bold:true},{text:"Plan",bold:true},{text:"EXT1",bold:true,align:"center"},{text:"EXT2",bold:true,align:"center"},{text:"EXT3",bold:true,align:"center"},{text:"EXT4",bold:true,align:"center"}]];
  (d.blends||[]).forEach(r=>brows.push([{text:r.label,bold:true},{text:"—",align:"center"},...r.values.map(v=>({text:v||"—",align:"center"}))]));
  table(ctx,46,y,widths,brows,{size:15,minH:42});
  pages.push(c);

  c=makeCanvas();ctx=c.getContext("2d");y=drawHeader(ctx,d,false);y=section(ctx,"EQUIPMENT INSPECTION",y);
  const ewidth=[700,121,121,121,120];
  let erows=[[{text:"Item",bold:true},{text:"EXT1",bold:true,align:"center"},{text:"EXT2",bold:true,align:"center"},{text:"EXT3",bold:true,align:"center"},{text:"EXT4",bold:true,align:"center"}]];
  (d.equipment||[]).forEach(r=>erows.push([{text:r.label,bold:true},...r.values.map((v,i)=>{
    const l=["EXT1","EXT2","EXT3","EXT4"][i],ts=d.times?.equipment?.[l]?.[r.key];
    const tm=ts?new Date(ts).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"}):"";
    return{text:(v||"—")+(tm?"\n"+tm:""),align:"center",bg:!v?"#fff":v===r.good?COLORS.greenBg:COLORS.redBg,color:!v?COLORS.ink:v===r.good?COLORS.green:COLORS.red,bold:!!v};
  })]));
  y=table(ctx,46,y,ewidth,erows,{size:15,minH:40});y+=10;
  y=table(ctx,46,y,[560,60,420,143],[
    [{text:"Pump Room Inspected",bold:true},{text:d.common?.pumpRoom||"—",align:"center"},{text:"Time",bold:true},{text:d.common?.pumpTime||"—",align:"center"}],
    [{text:"Mechanical Room Blower Powder Barrel Checked",bold:true},{text:d.common?.mechanicalBlower||"—",align:"center"},{text:"All screen packs clean and accounted",bold:true},{text:d.common?.screenPacks||"—",align:"center"}]
  ],{size:15,minH:48});

  y=section(ctx,"INVENTORY LEVELS",y+18);
  const centers=[155,395,635,875,1115];
  for(let i=0;i<5;i++)drawSilo(ctx,centers[i],y+24,"SILO "+(i+1),d.inventory?.["silo"+(i+1)]);
  y+=225;

  const t=Number(d.inventory?.talcBoxes),hasTalc=d.inventory?.talcBoxes!==""&&Number.isFinite(t);
  const talcBg=hasTalc?(t<14?COLORS.redBg:COLORS.greenBg):"#fff";
  const talcColor=hasTalc?(t<14?COLORS.red:COLORS.green):COLORS.ink;
  y=table(ctx,46,y,[850,333],[
    [{text:"Talc (14 Boxes Minimum)",bold:true},{text:hasTalc?d.inventory.talcBoxes+" boxes":"—",align:"center",bg:talcBg,color:talcColor,bold:hasTalc}],
    [{text:"Butane Tank",bold:true},{text:d.inventory?.butane!==""?d.inventory.butane+" %":"—",align:"center"}],
    [{text:"CO2 Tank Level",bold:true},{text:co2TankReportText(d.inventory?.co2),align:"center"}]
  ],{size:16,minH:44});

  y=section(ctx,"NOTES",y+18);
  ctx.strokeStyle=COLORS.line;ctx.strokeRect(46,y,1183,190);
  wrapped(ctx,d.notes||"",62,y+14,1150,24,{size:17});
  ctext(ctx,"DCN TN-100-00003",46,1605,{size:14,color:COLORS.muted});
  pages.push(c);

  return pages;
}
function dataUrlBytes(url){
  const b64=url.split(",")[1],bin=atob(b64),a=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++)a[i]=bin.charCodeAt(i);
  return a;
}
function pdfFromCanvases(canvases){
  const imgs=canvases.map(c=>({bytes:dataUrlBytes(c.toDataURL("image/jpeg",0.9)),w:c.width,h:c.height}));
  const enc=new TextEncoder(),chunks=[],offsets=[0];let total=0;
  const pushStr=s=>{const b=enc.encode(s);chunks.push(b);total+=b.length};
  const pushBytes=b=>{chunks.push(b);total+=b.length};
  const pageRefs=imgs.map((_,i)=>5+i*3);

  pushStr("%PDF-1.4\n");
  offsets[1]=total;pushStr("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  offsets[2]=total;pushStr("2 0 obj\n<< /Type /Pages /Count "+imgs.length+" /Kids ["+pageRefs.map(n=>n+" 0 R").join(" ")+"] >>\nendobj\n");

  imgs.forEach((img,i)=>{
    const imageObj=3+i*3,contentObj=4+i*3,pageObj=5+i*3;
    offsets[imageObj]=total;
    pushStr(imageObj+" 0 obj\n<< /Type /XObject /Subtype /Image /Width "+img.w+" /Height "+img.h+" /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length "+img.bytes.length+" >>\nstream\n");
    pushBytes(img.bytes);pushStr("\nendstream\nendobj\n");

    const stream="q\n612 0 0 792 0 0 cm\n/Im0 Do\nQ\n";
    offsets[contentObj]=total;
    pushStr(contentObj+" 0 obj\n<< /Length "+enc.encode(stream).length+" >>\nstream\n"+stream+"endstream\nendobj\n");

    offsets[pageObj]=total;
    pushStr(pageObj+" 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /XObject << /Im0 "+imageObj+" 0 R >> >> /Contents "+contentObj+" 0 R >>\nendobj\n");
  });

  const xref=total,maxObj=2+imgs.length*3;
  pushStr("xref\n0 "+(maxObj+1)+"\n0000000000 65535 f \n");
  for(let i=1;i<=maxObj;i++)pushStr(String(offsets[i]||0).padStart(10,"0")+" 00000 n \n");
  pushStr("trailer\n<< /Size "+(maxObj+1)+" /Root 1 0 R >>\nstartxref\n"+xref+"\n%%EOF");
  return new Blob(chunks,{type:"application/pdf"});
}
async function prepareSharePdf(){
  const b=document.getElementById("shareBtn");
  try{
    preparedPdfBlob=pdfFromCanvases(renderPdfPages(D));
    b.disabled=false;b.textContent="Share Report";
  }catch(e){
    console.error(e);
    b.disabled=false;b.textContent="Share Report";
  }
}
async function shareReport(){
  const btn=document.getElementById("shareBtn");
  if(!preparedPdfBlob){btn.textContent="Preparing…";await prepareSharePdf()}
  if(!preparedPdfBlob){
    alert("Could not prepare the PDF. Use Print / Save PDF.");
    btn.textContent="Share Report";
    return;
  }

  const raw=D.meta?.dateRaw||"report",shift=D.meta?.shift||"";
  const file=new File([preparedPdfBlob],"Sr-Lead-Checklist_"+raw+"_Shift-"+shift+".pdf",{type:"application/pdf"});
  try{
    if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){
      await navigator.share({
        title:"Extrusion Sr. Lead Daily Checklist",
        text:(D.meta?.date||"")+" · Shift "+shift,
        files:[file]
      });
    }else{
      const url=URL.createObjectURL(preparedPdfBlob),a=document.createElement("a");
      a.href=url;a.download=file.name;document.body.appendChild(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),30000);
      alert("Sharing is not available in this browser, so the PDF was saved instead.");
    }
  }catch(e){
    if(e&&e.name!=="AbortError")alert("Could not share the report. Use Print / Save PDF.");
  }
}
window.SrLeadPdf={
  createBlob(data){return pdfFromCanvases(renderPdfPages(data||{}))}
};
const shareBtn=document.getElementById("shareBtn");
if(shareBtn){
  shareBtn.addEventListener("click",shareReport);
  setTimeout(prepareSharePdf,120);
}
})();
