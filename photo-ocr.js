(function(){
  "use strict";

  const CDN="https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
  let libraryPromise=null, workerPromise=null, progressSink=null;

  const SPECS={
    control:{
      outW:1152,outH:580,
      title:{x:.135,y:.055,w:.42,h:.055},
      fields:{
        differential:{x:.215,y:.438,w:.075,h:.055,min:0,max:2000,dec:false},
        diePressure:{x:.388,y:.365,w:.080,h:.060,min:500,max:5000,dec:false},
        dieMelt:{x:.495,y:.285,w:.065,h:.065,min:200,max:600,dec:false},
        primaryScrew:{x:.290,y:.635,w:.070,h:.070,min:0,max:300,dec:true},
        primaryLoad:{x:.290,y:.685,w:.070,h:.070,min:0,max:100,dec:true},
        secondaryScrew:{x:.470,y:.555,w:.075,h:.070,min:0,max:100,dec:true},
        secondaryLoad:{x:.470,y:.610,w:.075,h:.070,min:0,max:100,dec:true},
        lineSpeed:{x:.638,y:.405,w:.090,h:.070,min:0,max:1000,dec:true},
        butane:{x:.760,y:.268,w:.070,h:.065,min:0,max:250,dec:true},
        co2:{x:.895,y:.268,w:.070,h:.065,min:0,max:150,dec:true}
      }
    },
    blend:{
      outW:1152,outH:895,
      title:{x:.135,y:.047,w:.50,h:.055},
      fields:{
        virgin1:{x:.345,y:.335,w:.055,h:.060,min:0,max:100,dec:true},
        fluff:{x:.535,y:.335,w:.055,h:.060,min:0,max:100,dec:true},
        talc:{x:.728,y:.335,w:.062,h:.060,min:0,max:100,dec:true},
        virgin2:{x:.920,y:.335,w:.075,h:.060,min:0,max:100,dec:true}
      }
    }
  };

  function loadTesseract(){
    if(window.Tesseract)return Promise.resolve(window.Tesseract);
    if(libraryPromise)return libraryPromise;
    libraryPromise=new Promise((resolve,reject)=>{
      const s=document.createElement("script");
      s.src=CDN;s.async=true;s.crossOrigin="anonymous";
      s.onload=()=>window.Tesseract?resolve(window.Tesseract):reject(new Error("OCR library did not initialize."));
      s.onerror=()=>reject(new Error("Could not load the OCR engine. Internet access is needed the first time the photo reader is used."));
      document.head.appendChild(s);
    });
    return libraryPromise;
  }

  async function getWorker(onProgress){
    progressSink=onProgress||null;
    if(workerPromise)return workerPromise;
    workerPromise=(async()=>{
      const T=await loadTesseract();
      const worker=await T.createWorker("eng",1,{logger:m=>{
        if(progressSink&&m&&m.status){
          const pct=Number.isFinite(m.progress)?Math.round(m.progress*100):null;
          progressSink(m.status,pct);
        }
      }});
      return worker;
    })();
    try{return await workerPromise}catch(e){workerPromise=null;throw e}
  }

  function imageFromFile(file){
    return new Promise((resolve,reject)=>{
      const url=URL.createObjectURL(file),img=new Image();
      img.onload=()=>{resolve({img,url})};
      img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error("Could not open this photo."))};
      img.src=url;
    });
  }

  function solve(A,b){
    const n=b.length,M=A.map((row,i)=>row.slice().concat([b[i]]));
    for(let col=0;col<n;col++){
      let pivot=col;
      for(let r=col+1;r<n;r++)if(Math.abs(M[r][col])>Math.abs(M[pivot][col]))pivot=r;
      if(Math.abs(M[pivot][col])<1e-10)throw new Error("The selected frame is too distorted. Adjust the four corners and try again.");
      [M[col],M[pivot]]=[M[pivot],M[col]];
      const d=M[col][col];for(let c=col;c<=n;c++)M[col][c]/=d;
      for(let r=0;r<n;r++)if(r!==col){const f=M[r][col];for(let c=col;c<=n;c++)M[r][c]-=f*M[col][c]}
    }
    return M.map(r=>r[n]);
  }

  function homography(dst,src){
    const A=[],b=[];
    for(let i=0;i<4;i++){
      const u=dst[i].x,v=dst[i].y,x=src[i].x,y=src[i].y;
      A.push([u,v,1,0,0,0,-u*x,-v*x]);b.push(x);
      A.push([0,0,0,u,v,1,-u*y,-v*y]);b.push(y);
    }
    return solve(A,b);
  }

  function warpCanvas(img,points,kind){
    const spec=SPECS[kind],sw=img.naturalWidth,sh=img.naturalHeight;
    const srcPts=points.map(p=>({x:p.x*sw,y:p.y*sh}));
    const W=spec.outW,H=spec.outH;
    const dstPts=[{x:0,y:0},{x:W-1,y:0},{x:W-1,y:H-1},{x:0,y:H-1}];
    const h=homography(dstPts,srcPts);

    const source=document.createElement("canvas");source.width=sw;source.height=sh;
    const sctx=source.getContext("2d",{willReadFrequently:true});sctx.drawImage(img,0,0);
    const sdata=sctx.getImageData(0,0,sw,sh).data;
    const out=document.createElement("canvas");out.width=W;out.height=H;
    const octx=out.getContext("2d",{willReadFrequently:true});const id=octx.createImageData(W,H),d=id.data;

    for(let v=0;v<H;v++){
      for(let u=0;u<W;u++){
        const den=h[6]*u+h[7]*v+1;
        let x=(h[0]*u+h[1]*v+h[2])/den,y=(h[3]*u+h[4]*v+h[5])/den;
        if(x<0||y<0||x>=sw-1||y>=sh-1)continue;
        const x0=Math.floor(x),y0=Math.floor(y),dx=x-x0,dy=y-y0;
        const i00=(y0*sw+x0)*4,i10=i00+4,i01=i00+sw*4,i11=i01+4,o=(v*W+u)*4;
        for(let c=0;c<3;c++){
          const a=sdata[i00+c]*(1-dx)+sdata[i10+c]*dx;
          const b0=sdata[i01+c]*(1-dx)+sdata[i11+c]*dx;
          d[o+c]=Math.round(a*(1-dy)+b0*dy);
        }
        d[o+3]=255;
      }
    }
    octx.putImageData(id,0,0);return out;
  }

  function crop(canvas,r,pad=.12){
    const x=Math.max(0,Math.round((r.x-r.w*pad)*canvas.width));
    const y=Math.max(0,Math.round((r.y-r.h*pad)*canvas.height));
    const w=Math.min(canvas.width-x,Math.round(r.w*(1+2*pad)*canvas.width));
    const h=Math.min(canvas.height-y,Math.round(r.h*(1+2*pad)*canvas.height));
    const c=document.createElement("canvas");c.width=Math.max(1,w);c.height=Math.max(1,h);
    c.getContext("2d").drawImage(canvas,x,y,w,h,0,0,w,h);return c;
  }

  function otsu(hist,total){
    let sum=0;for(let i=0;i<256;i++)sum+=i*hist[i];
    let sumB=0,wB=0,max=0,thr=128;
    for(let t=0;t<256;t++){
      wB+=hist[t];if(!wB)continue;const wF=total-wB;if(!wF)break;
      sumB+=t*hist[t];const mB=sumB/wB,mF=(sum-sumB)/wF,between=wB*wF*(mB-mF)*(mB-mF);
      if(between>max){max=between;thr=t}
    }return thr;
  }

  function preprocessNumeric(raw,binary=true){
    const scale=Math.max(3,Math.min(6,Math.round(105/raw.height))),W=Math.max(220,raw.width*scale),H=Math.max(90,raw.height*scale);
    const c=document.createElement("canvas");c.width=W+28;c.height=H+28;const ctx=c.getContext("2d",{willReadFrequently:true});
    ctx.fillStyle="#fff";ctx.fillRect(0,0,c.width,c.height);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";ctx.drawImage(raw,0,0,raw.width,raw.height,14,14,W,H);
    const im=ctx.getImageData(0,0,c.width,c.height),p=im.data,hist=new Array(256).fill(0);let sum=0,count=0;
    for(let i=0;i<p.length;i+=4){const g=Math.round(.2126*p[i]+.7152*p[i+1]+.0722*p[i+2]);p[i]=p[i+1]=p[i+2]=g;hist[g]++;sum+=g;count++}
    if(binary){const thr=otsu(hist,count),avg=sum/count,invert=avg<125;for(let i=0;i<p.length;i+=4){const g=p[i],white=g>thr;let v=white?255:0;if(invert)v=255-v;p[i]=p[i+1]=p[i+2]=v}}
    else{for(let i=0;i<p.length;i+=4){let g=p[i];g=(g-128)*1.55+128;g=Math.max(0,Math.min(255,g));p[i]=p[i+1]=p[i+2]=g}}
    ctx.putImageData(im,0,0);return c;
  }


  function preprocessClean(raw){
    const scale=Math.max(5,Math.min(9,Math.round(150/Math.max(1,raw.height))));
    const W=Math.max(260,Math.round(raw.width*scale)),H=Math.max(110,Math.round(raw.height*scale));
    const c=document.createElement("canvas");c.width=W+36;c.height=H+36;
    const ctx=c.getContext("2d",{willReadFrequently:true});ctx.fillStyle="#fff";ctx.fillRect(0,0,c.width,c.height);
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";ctx.drawImage(raw,0,0,raw.width,raw.height,18,18,W,H);
    const im=ctx.getImageData(0,0,c.width,c.height),p=im.data,hist=new Array(256).fill(0);
    for(let i=0;i<p.length;i+=4){const g=Math.round(.2126*p[i]+.7152*p[i+1]+.0722*p[i+2]);hist[g]++}
    const total=c.width*c.height;let acc=0,lo=0,hi=255;
    for(let i=0;i<256;i++){acc+=hist[i];if(acc>=total*.015){lo=i;break}}
    acc=0;for(let i=255;i>=0;i--){acc+=hist[i];if(acc>=total*.015){hi=i;break}}
    const span=Math.max(35,hi-lo);
    for(let i=0;i<p.length;i+=4){let g=Math.round(.2126*p[i]+.7152*p[i+1]+.0722*p[i+2]);g=Math.max(0,Math.min(255,(g-lo)*255/span));p[i]=p[i+1]=p[i+2]=g;p[i+3]=255}
    ctx.putImageData(im,0,0);return c;
  }

  function normalizeText(s){
    return String(s||"").replace(/,/g,"").replace(/[Oo]/g,"0").replace(/[Il|]/g,"1").replace(/[—–]/g,"-").replace(/\s+/g,"");
  }
  function candidates(s){
    const t=normalizeText(s);return (t.match(/-?\d+(?:\.\d+)?/g)||[]).map(Number).filter(Number.isFinite);
  }
  function validCandidate(vals,spec){
    for(const n of vals)if(n>=spec.min&&n<=spec.max)return n;
    if(spec.dec){
      for(const n of vals){for(const div of [10,100]){const x=n/div;if(x>=spec.min&&x<=spec.max)return x}}
    }
    return null;
  }
  function confidenceName(n){return n>=75?"high":n>=50?"medium":"low"}

  async function recognizeNumber(worker,raw,spec){
    const tries=[
      {canvas:preprocessClean(raw),psm:8,bonus:8},
      {canvas:preprocessNumeric(raw,false),psm:8,bonus:4},
      {canvas:preprocessNumeric(raw,true),psm:8,bonus:0},
      {canvas:preprocessClean(raw),psm:7,bonus:0}
    ];
    let best=null;
    for(let i=0;i<tries.length;i++){
      const t=tries[i];
      await worker.setParameters({
        tessedit_char_whitelist:"0123456789.-",
        tessedit_pageseg_mode:t.psm,
        preserve_interword_spaces:"0",
        user_defined_dpi:"300"
      });
      const res=await worker.recognize(t.canvas);
      const text=res?.data?.text||"",value=validCandidate(candidates(text),spec),conf=Number(res?.data?.confidence||0);
      if(value!==null){
        const score=conf+t.bonus,item={value:String(value),score,confidence:confidenceName(score),raw:String(text).trim()};
        if(!best||item.score>best.score)best=item;
        if(score>=78)break;
      }
    }
    return best;
  }

  async function recognizeTitle(worker,warped,spec){
    const raw=crop(warped,spec.title,.05);const c=preprocessNumeric(raw,false);
    await worker.setParameters({tessedit_char_whitelist:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 -",tessedit_pageseg_mode:7});
    const r=await worker.recognize(c);const text=String(r?.data?.text||"").trim();
    const m=text.match(/Extruder\s*([1-4])/i);return {text,line:m?Number(m[1]):null,confidence:Number(r?.data?.confidence||0)};
  }

  async function read(file,kind,points,onProgress){
    if(!SPECS[kind])throw new Error("Unknown EPIC photo type.");
    if(!Array.isArray(points)||points.length!==4)throw new Error("Four screen corners are required.");
    onProgress?.("Preparing photo",5);
    const {img,url}=await imageFromFile(file);
    try{
      const warped=warpCanvas(img,points,kind);onProgress?.("Screen aligned",12);
      const worker=await getWorker(onProgress);const spec=SPECS[kind];
      const title=await recognizeTitle(worker,warped,spec);onProgress?.("Reading values",20);
      const fields={};const entries=Object.entries(spec.fields);let idx=0;
      for(const [key,fs] of entries){
        const raw=crop(warped,fs,.055);const r=await recognizeNumber(worker,raw,fs);if(r)fields[key]=r;
        idx++;onProgress?.(`Reading ${idx} of ${entries.length}`,20+Math.round(idx/entries.length*78));
      }
      onProgress?.("Done",100);return{fields,title,warpedCanvas:warped};
    }finally{URL.revokeObjectURL(url)}
  }

  window.EpicPhotoOCR={read,specs:SPECS};
})();
