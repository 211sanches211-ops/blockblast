/* КРИСТАЛЛЫ — блоки в ряд. Механика в духе Block Blast, стиль интерфейса — как у «Самоцветов». */
'use strict';
const $=s=>document.querySelector(s);
const store={get(k,d){try{const v=localStorage.getItem(k);return v===null?d:v}catch(e){return d}},
set(k,v){try{localStorage.setItem(k,String(v))}catch(e){}},
del(k){try{localStorage.removeItem(k)}catch(e){}}};
let buzzOn=store.get('kb-buzz','1')!=='0';
const buzz=p=>{try{if(buzzOn)navigator.vibrate&&navigator.vibrate(p)}catch(e){}};

/* ---------- константы ---------- */
const N=8, LEVELS=30;
const SAVE_KEY='kb-save-v2', PROG_KEY='kb-prog-v1', LB_KEY='kb-lb-v1';
const THEMES=['Лазурный штрек','Изумрудный грот','Аметистовая пещера','Рубиновый штрек','Золотая галерея'];
const COLORS=[
{main:'#ff2e78',name:'Рубин'},
{main:'#ffc300',name:'Топаз'},
{main:'#06e6a0',name:'Изумруд'},
{main:'#00a8ff',name:'Сапфир'},
{main:'#b44cff',name:'Аметист'},
{main:'#00e5ff',name:'Аквамарин'}];
/* фигуры — массивы клеток [dx,dy] (наборы блоков, как в Block Blast) */
const SHAPES=[
[[0,0]],                                        /* 0  одиночный */
[[0,0],[1,0]],[[0,0],[0,1]],                     /* 1-2 домино */
[[0,0],[1,0],[2,0]],[[0,0],[0,1],[0,2]],         /* 3-4 трио */
[[0,0],[1,0],[2,0],[3,0]],[[0,0],[0,1],[0,2],[0,3]],     /* 5-6 */
[[0,0],[1,0],[2,0],[3,0],[4,0]],[[0,0],[0,1],[0,2],[0,3],[0,4]], /* 7-8 */
[[0,0],[1,0],[0,1],[1,1]],                       /* 9 квадрат 2x2 */
[[0,0],[1,0],[2,0],[0,1],[1,1],[2,1]],           /* 10 прямоугольник 3x2 */
[[0,0],[0,1],[1,0],[1,1],[2,0],[2,1]],           /* 11 прямоугольник 2x3 */
[[0,0],[1,0],[0,1]],[[1,0],[0,1],[1,1]],         /* 12-13 уголки малые */
[[0,0],[0,1],[1,1]],[[1,0],[0,1],[1,1]],         /* 14-15 уголки зеркальные */
[[0,0],[1,0],[2,0],[0,1]],[[0,0],[1,0],[2,0],[2,1]],   /* 16-17 Г-большие */
[[0,1],[1,1],[2,1],[0,0]],[[0,1],[1,1],[2,1],[2,0]],   /* 18-19 Г-перевёрнутые */
[[0,0],[1,0],[1,1],[2,1]],[[0,1],[1,1],[1,0],[2,0]],   /* 20-21 Z/S */
[[0,0],[1,0],[2,0],[1,1]],[[1,0],[0,1],[1,1],[2,1]],   /* 22-23 T */
[[0,0],[0,1],[0,2],[1,1]],[[1,0],[1,1],[1,2],[0,1]],   /* 24-25 стрела */
[[0,0],[1,0],[2,0],[0,1],[0,2]],[[0,0],[1,0],[2,0],[2,1],[2,2]], /* 26-27 большие углы */
[[0,0],[1,0],[2,0],[3,0],[0,1],[0,2]],[[0,0],[1,0],[2,0],[3,0],[3,1],[3,2]] /* 28-29 тяжёлые */
];
/* вариант 14 дублирует 13 — заменим на вертикальный уголок */
SHAPES[14]=[[0,0],[0,1],[1,1]];
SHAPES[15]=[[1,0],[1,1],[0,1]];
const EASY=[0,1,2,3,4,9],MID=[5,6,7,10,11,12,13,14,15,16,17,20,21,22,23],HARD=[8,18,19,24,25,26,27,28,29];
function poolForLevel(lv){
const t=(lv-1)/(LEVELS-1);
let p=EASY.slice();
if(t>.12)p=p.concat(MID.slice(0,Math.ceil((t-.12)/.88*MID.length)));
if(t>.45)p=p.concat(HARD.slice(0,Math.ceil((t-.45)/.55*HARD.length)));
return p;}
function shapeW(s){let m=0;for(const c of s)m=Math.max(m,c[0]+1);return m}
function shapeH(s){let m=0;for(const c of s)m=Math.max(m,c[1]+1);return m}
function goalForLevel(lv){return Math.round(350+lv*130+lv*lv*20)}

/* ---------- «порода» на поле: стартовые занятые клетки (как в Block Blast) ---------- */
const ROCK_COLORS=['#4a3b2a','#3d4a5c','#4e3f52','#37483d','#54432e'];
function rockTint(level){
  const t=(level-1)/(LEVELS-1);
  return [Math.round(6+t*8),Math.round(9+t*10),Math.round(13+t*10)];}
function fillRatio(level,mode_){
  if(mode_==='zen')return .07;
  const t=(level-1)/(LEVELS-1);
  return Math.min(.42,.10+t*.34);}
/* генерация застывшей породы: пятна + одиночные кристаллы-препятствия */
function makeRock(level,mode_){
  newBoard();
  const target=Math.round(N*N*fillRatio(level,mode_));
  let guard=0;
  while(countCells()<target&&guard++<500){
    const kind=Math.random();
    let sh;
    if(kind<.42)sh=[[0,0]];
    else if(kind<.68)sh=Math.random()<.5?[[0,0],[1,0]]:[[0,0],[0,1]];
    else if(kind<.86)sh=Math.random()<.5?[[0,0],[1,0],[0,1]]:[[0,0],[1,0],[2,0]];
    else sh=[[0,0],[1,0],[0,1],[1,1]];
    const w=shapeW(sh),h=shapeH(sh);
    const r=Math.floor(Math.random()*(N-h+1)),c=Math.floor(Math.random()*(N-w+1));
    if(!fits(sh,r,c))continue;
    const isGem=Math.random()<.35;
    for(const [dx,dy] of sh)
      board[r+dy][c+dx]=isGem
        ?{gem:true,col:Math.floor(Math.random()*COLORS.length),placeAt:performance.now()}
        :{rock:true,tint:Math.floor(Math.random()*ROCK_COLORS.length),placeAt:performance.now()};
  }
  /* не оставляем ловушек: если хоть одна фигура не встаёт — чистим центр */
  if(!hasAnyFitCell())clearSomeRock(6);
  if(!hasAnyFitCell())clearSomeRock(10);}
function countCells(){let n=0;for(let r=0;r<N;r++)for(let c=0;c<N;c++)if(board[r][c])n++;return n}
function hasAnyFitCell(){
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){
    if(board[r][c])continue;
    if(!board[r][c+1]||!board[r+1]?.[c]||c===0||r===0)return true;}
  return false;}
function clearSomeRock(k){
  const cells=[];
  for(let r=0;r<N;r++)for(let c=0;c<N;c++)if(board[r][c]&&(board[r][c].rock||board[r][c].gem))cells.push([r,c]);
  for(let i=0;i<k&&cells.length;i++){
    const idx=Math.floor(Math.random()*cells.length);
    const [r,c]=cells.splice(idx,1)[0];board[r][c]=null;}}

/* ---------- звук (WebAudio, тембры как в «Самоцветах») ---------- */
const snd={on:store.get('kb-sound','1')!=='0',ctx:null,
init(){if(!this.ctx){try{this.ctx=new (window.AudioContext||window.webkitAudioContext)()}catch(e){}}
if(this.ctx&&(this.ctx.state==='suspended'||this.ctx.state==='interrupted'))this.ctx.resume().catch(()=>{});},
bell(f,d,v){if(!this.on||!this.ctx)return;const t=this.ctx.currentTime;
const mk=(fr,gv)=>{const o=this.ctx.createOscillator(),g=this.ctx.createGain();
o.type='sine';o.frequency.setValueAtTime(fr,t);g.gain.setValueAtTime(0,t);
g.gain.linearRampToValueAtTime(gv,t+.004);g.gain.exponentialRampToValueAtTime(.0001,t+d);
o.connect(g).connect(this.ctx.destination);o.start(t);o.stop(t+d+.02);};
mk(f,v);mk(f*2.01,v*.35);mk(f*2.76,v*.12);},
noise(d,v,fc){if(!this.on||!this.ctx)return;const t=this.ctx.currentTime,
n=Math.floor(this.ctx.sampleRate*d),b=this.ctx.createBuffer(1,n,this.ctx.sampleRate),ch=b.getChannelData(0);
for(let i=0;i<n;i++)ch[i]=(Math.random()*2-1)*(1-i/n);
const s=this.ctx.createBufferSource(),f=this.ctx.createBiquadFilter(),g=this.ctx.createGain();
s.buffer=b;f.type='lowpass';f.frequency.value=fc;g.gain.value=v;
s.connect(f).connect(g).connect(this.ctx.destination);s.start(t);},
pick(){this.bell(520,.08,.08)},
place(){this.bell(300,.1,.1);this.noise(.06,.06,1200)},
bad(){this.bell(140,.2,.12);this.noise(.06,.05,900)},
pop(c){const sc=[0,2,4,7,9,12,14,16,19,21,24];
const f=392*Math.pow(2,sc[Math.min(c-1,sc.length-1)]/12);
this.bell(f,.22,.2);this.noise(.04,.06,3000);},
boom(){this.noise(.32,.28,900);this.bell(90,.35,.28)},
win(){[523,659,784,1046].forEach((f,i)=>setTimeout(()=>this.bell(f,.3,.18),i*110))},
lose(){[392,330,262,196].forEach((f,i)=>setTimeout(()=>this.bell(f,.35,.16),i*140))}};

/* ---------- состояние ---------- */
let board=null,pieces=[],used=[true,true,true],sel=-1,
mode='classic',level=1,score=0,placedCount=0,comboChain=0,maxCombo=1,
rushUntil=0,over=true,animating=false,wonFlag=false;
let parts=[];
let prog;try{prog=JSON.parse(store.get(PROG_KEY,''))||{unlocked:1,stars:{}}}catch(e){prog={unlocked:1,stars:{}}}
if(!prog||typeof prog!=='object')prog={unlocked:1,stars:{}};
if(!prog.stars)prog.stars={};if(!prog.unlocked)prog.unlocked=1;
function saveProg(){store.set(PROG_KEY,JSON.stringify(prog))}
function starsOf(l){return prog.stars[l]||0}
let bestC=+store.get('kb-best-classic','0')||0,bestZ=+store.get('kb-best-zen','0')||0;

/* ---------- canvas ---------- */
const cv=$('#board'),ctx=cv.getContext('2d');
let cell=48,pad=6,W=0,H=0;
function resize(){
const r=cv.getBoundingClientRect();if(!r.width)return;
const dpr=Math.min(2,window.devicePixelRatio||1);
cv.width=Math.round(r.width*dpr);cv.height=Math.round(r.height*dpr);
ctx.setTransform(dpr,0,0,dpr,0,0);
W=r.width;H=r.height;pad=W*.015;cell=(W-pad*2)/N;}
addEventListener('resize',()=>{resize()});

function rr(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);
ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
function shade(hex,k){const n=parseInt(hex.slice(1),16);
let r=(n>>16)&255,g=(n>>8)&255,b=n&255;
const cl=v=>Math.max(0,Math.min(255,Math.round(v*k)));
return `rgb(${cl(r)},${cl(g)},${cl(b)})`;}
function drawBlock(x,y,s,col,alpha,glow){
const g=ctx.createLinearGradient(x,y,x+s,y+s);
g.addColorStop(0,shade(col,1.3));g.addColorStop(.55,col);g.addColorStop(1,shade(col,.68));
ctx.globalAlpha=alpha;
if(glow){ctx.shadowColor=col;ctx.shadowBlur=s*.3}
rr(x,y,s,s,s*.22);ctx.fillStyle=g;ctx.fill();ctx.shadowBlur=0;
ctx.strokeStyle='rgba(255,255,255,.38)';ctx.lineWidth=Math.max(1,s*.05);
rr(x+s*.09,y+s*.09,s*.82,s*.82,s*.17);ctx.stroke();
ctx.fillStyle='rgba(255,255,255,.5)';
ctx.beginPath();ctx.ellipse(x+s*.34,y+s*.3,s*.14,s*.085,-.6,0,7);ctx.fill();
ctx.fillStyle='rgba(0,0,0,.2)';
rr(x+s*.14,y+s*.72,s*.72,s*.15,s*.08);ctx.fill();
ctx.globalAlpha=1;}
function drawRock(x,y,s,tint,seed){
  const base=ROCK_COLORS[tint];
  const g=ctx.createLinearGradient(x,y,x+s,y+s);
  g.addColorStop(0,shade(base,1.25));g.addColorStop(.6,base);g.addColorStop(1,shade(base,.55));
  rr(x+s*.03,y+s*.03,s*.94,s*.94,s*.2);ctx.fillStyle=g;ctx.fill();
  ctx.strokeStyle='rgba(0,0,0,.4)';ctx.lineWidth=Math.max(1,s*.045);ctx.stroke();
  /* трещинки-грани, стабильные для клетки */
  ctx.strokeStyle='rgba(0,0,0,.32)';ctx.lineWidth=Math.max(.8,s*.03);
  const h=(seed*733)%100/100;
  ctx.beginPath();
  ctx.moveTo(x+s*(.2+h*.2),y+s*.15);
  ctx.lineTo(x+s*(.45+h*.15),y+s*.55);
  ctx.lineTo(x+s*(.3+h*.2),y+s*.85);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x+s*.55,y+s*(.3+h*.2));
  ctx.lineTo(x+s*.85,y+s*(.5+h*.25));
  ctx.stroke();
  ctx.fillStyle='rgba(255,255,255,.10)';
  rr(x+s*.12,y+s*.12,s*.4,s*.16,s*.08);ctx.fill();}
function hasCell(sh,r,c){for(const q of sh)if(q[0]===c&&q[1]===r)return true;return false}
function draw(){
requestAnimationFrame(draw);
if(!W||!board)return;
ctx.clearRect(0,0,W,H);
for(let r=0;r<N;r++)for(let c=0;c<N;c++){
const x=pad+c*cell,y=pad+r*cell;
rr(x+1.5,y+1.5,cell-3,cell-3,cell*.18);
ctx.fillStyle=((r+c)%2)?'rgba(10,24,36,.75)':'rgba(14,31,45,.75)';ctx.fill();
ctx.strokeStyle='rgba(140,220,255,.07)';ctx.lineWidth=1;ctx.stroke();}
/* призрак перетаскиваемого блока + подсветка готовых линий */
if(drag.active&&drag.idx>=0&&pieces[drag.idx]){
const P=pieces[drag.idx],sh=P.sh;
if(drag.ok){
for(const [dx,dy] of sh)drawBlock(pad+(drag.c+dx)*cell+cell*.05,pad+(drag.r+dy)*cell+cell*.05,cell*.9,COLORS[P.col].main,.45,false);
const rowsF=[],colsF=[];
for(let r=0;r<N;r++){let f=true;for(let c=0;c<N;c++){if(!board[r][c]&&!hasCell(sh,r-drag.r,c-drag.c)){f=false;break}}if(f)rowsF.push(r)}
for(let c=0;c<N;c++){let f=true;for(let r=0;r<N;r++){if(!board[r][c]&&!hasCell(sh,r-drag.r,c-drag.c)){f=false;break}}if(f)colsF.push(c)}
ctx.fillStyle='rgba(255,214,107,.18)';
for(const r of rowsF){rr(pad+cell*.4,pad+r*cell+2,cell*N-cell*.8,cell-4,cell*.2);ctx.fill()}
for(const c of colsF){rr(pad+c*cell+2,pad+cell*.4,cell-4,cell*N-cell*.8,cell*.2);ctx.fill()}
}else{
ctx.globalAlpha=.22;ctx.fillStyle='#ff4d4d';
for(const [dx,dy] of sh){const r=drag.r+dy,c=drag.c+dx;
if(r<0||c<0||r>=N||c>=N)continue;
rr(pad+c*cell+cell*.08,pad+r*cell+cell*.08,cell*.84,cell*.84,cell*.2);ctx.fill();}
ctx.globalAlpha=1;}}
/* блоки на поле */
const now=performance.now();
for(let r=0;r<N;r++)for(let c=0;c<N;c++){
const b=board[r][c];if(!b)continue;
const x=pad+c*cell,y=pad+r*cell,s=cell*.9;
if(b.clear){const t=Math.min(1,(now-(b.clearAt||now))/260);
drawBlock(x+cell*.05-(s*t)/2,y+cell*.05-(s*t)/2,s*(1+t*.55),COLORS[b.col].main,1-t*.95,true);continue;}
const pt=b.placeAt?Math.min(1,(now-b.placeAt)/180):1;
const e=1-Math.pow(1-pt,3),sz=s*(.6+.4*e);
if(b.rock){drawRock(x+(s-sz)/2+cell*.05,y+(s-sz)/2+cell*.05,sz,b.tint||0,r*N+c);continue;}
drawBlock(x+(s-sz)/2+cell*.05,y+(s-sz)/2+cell*.05,sz,COLORS[b.col].main,1,!!b.gem);}
/* частицы */
for(const p of parts){ctx.globalAlpha=Math.max(0,p.l);ctx.fillStyle=p.c;
ctx.beginPath();ctx.arc(p.x,p.y,Math.max(.5,p.r*p.l),0,7);ctx.fill();}
ctx.globalAlpha=1;}
requestAnimationFrame(draw);

/* ---------- лоток ---------- */
function spawnTray(){
const pool=poolForLevel(mode==='zen'?16:level);
pieces=[];used=[false,false,false];
for(let i=0;i<3;i++){
const si=pool[Math.floor(Math.random()*pool.length)];
pieces.push({sh:SHAPES[si],col:Math.floor(Math.random()*COLORS.length)});}
sel=-1;
/* милосердие: если ни одна из трёх фигур не встаёт — перегенерируем (до 8 попыток) */
for(let t=0;t<8&&!canPlaceAny();t++){
for(let i=0;i<3;i++){
const si=pool[Math.floor(Math.random()*pool.length)];
pieces[i]={sh:SHAPES[si],col:Math.floor(Math.random()*COLORS.length)};}}
renderTray();}
function pieceSVG(P,scale){
const w=shapeW(P.sh),h=shapeH(P.sh),s=scale;let out='';
for(const [dx,dy] of P.sh){
const x=dx*s+1,y=dy*s+1,z=s-2,id='g'+Math.random().toString(36).slice(2,7);
out+=`<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${shade(COLORS[P.col].main,1.3)}"/><stop offset=".55" stop-color="${COLORS[P.col].main}"/><stop offset="1" stop-color="${shade(COLORS[P.col].main,.68)}"/></linearGradient></defs>`;
out+=`<rect x="${x}" y="${y}" width="${z}" height="${z}" rx="${(s*.2).toFixed(1)}" fill="url(#${id})" stroke="rgba(255,255,255,.35)" stroke-width="${(s*.05).toFixed(1)}"/>`;
out+=`<ellipse cx="${(x+z*.35).toFixed(1)}" cy="${(y+z*.3).toFixed(1)}" rx="${(s*.13).toFixed(1)}" ry="${(s*.08).toFixed(1)}" fill="rgba(255,255,255,.5)" transform="rotate(-30 ${(x+z*.35).toFixed(1)} ${(y+z*.3).toFixed(1)})"/>`;}
return `<svg width="${w*s+2}" height="${h*s+2}" viewBox="0 0 ${w*s+2} ${h*s+2}">${out}</svg>`;}
function renderTray(){
const tray=$('#tray');if(!tray)return;tray.innerHTML='';
for(let i=0;i<3;i++){
if(used[i]||!pieces[i]){const sp=document.createElement('div');sp.className='tpiece';
sp.style.cssText='width:clamp(40px,14vw,80px);height:clamp(40px,14vw,80px);opacity:.12;pointer-events:none';
tray.appendChild(sp);continue;}
const P=pieces[i],w=shapeW(P.sh),h=shapeH(P.sh);
const div=document.createElement('div');div.className='tpiece';div.dataset.i=i;
const scale=Math.max(14,Math.min(30,Math.floor(84/Math.max(w,h))));
div.innerHTML=pieceSVG(P,scale);
if(sel===i)div.classList.add('sel');
tray.appendChild(div);attachDrag(div,i);}}

/* ---------- размещение и очистка ---------- */
function fits(sh,r,c){
for(const [dx,dy] of sh){const r2=r+dy,c2=c+dx;
if(r2<0||c2<0||r2>=N||c2>=N)return false;if(board[r2][c2])return false;}
return true;}
function canPlaceAny(){
for(let i=0;i<3;i++){if(used[i])continue;
const sh=pieces[i].sh,w=shapeW(sh),h=shapeH(sh);
for(let r=0;r<=N-h;r++)for(let c=0;c<=N-w;c++)if(fits(sh,r,c))return true;}
return false;}
function spawnParts(r,c,col){
const x=pad+c*cell+cell/2,y=pad+r*cell+cell/2;
for(let i=0;i<5;i++)parts.push({x,y,vx:(Math.random()-.5)*4.6,vy:(Math.random()-.5)*4.6-1.4,
r:Math.random()*3+1.6,l:1,c:col});}
setInterval(()=>{for(let i=parts.length-1;i>=0;i--){const p=parts[i];
p.x+=p.vx;p.y+=p.vy;p.vy+=.12;p.l-=.03;if(p.l<=0)parts.splice(i,1);}},16);
function place(idx,r,c){
if(over||animating)return;
const P=pieces[idx];
for(const [dx,dy] of P.sh)board[r+dy][c+dx]={col:P.col,placeAt:performance.now()};
used[idx]=true;placedCount++;
const rows=[],cols=[];
for(let q=0;q<N;q++){
let fr=true,fc=true;
for(let k=0;k<N;k++){if(!board[q][k])fr=false;if(!board[k][q])fc=false}
if(fr)rows.push(q);if(fc)cols.push(q);}
const lines=rows.length+cols.length;
let gained=P.sh.length;
if(lines>0){
comboChain++;maxCombo=Math.max(maxCombo,comboChain);
const mult=comboChain;
if(comboChain>=2)rushUntil=performance.now()+12000;
const rush=performance.now()<rushUntil;
gained+=lines*N*10*mult*(rush?2:1);
const clearAt=performance.now()+80;
for(const r2 of rows)for(let cc=0;cc<N;cc++)if(board[r2][cc]){board[r2][cc].clear=true;board[r2][cc].clearAt=clearAt}
for(const cc of cols)for(let r2=0;r2<N;r2++)if(board[r2][cc]){board[r2][cc].clear=true;board[r2][cc].clearAt=clearAt}
animating=true;snd.boom();buzz([20,40,20]);
for(let q=0;q<lines;q++)setTimeout(()=>snd.pop(q+1),q*90);
if(lines>=2)setTimeout(()=>banner(lines>=3?'МЕГА-ВЗРЫВ!':'КОМБО ×'+lines,'teal'),120);
else if(comboChain>=2)setTimeout(()=>banner('ШТУРМ ×2','teal'),120);
setTimeout(()=>{
for(const r2 of rows)for(let cc=0;cc<N;cc++){if(board[r2][cc]){spawnParts(r2,cc,board[r2][cc].rock?'#8b7a5e':COLORS[board[r2][cc].col].main);board[r2][cc]=null}}
for(const cc of cols)for(let r2=0;r2<N;r2++){if(board[r2][cc]){spawnParts(r2,cc,board[r2][cc].rock?'#8b7a5e':COLORS[board[r2][cc].col].main);board[r2][cc]=null}}
animating=false;finishPlace(gained);},340);
}else{comboChain=0;snd.place();buzz(8);finishPlace(gained);}}
function finishPlace(gained){
score+=gained;bumpEl($('#score'));updateHUD();updateChips();
/* «Кирка»: разово пробить породу/кристалл в любой занятой клетке */
const tool=$('#toolRock');
if(tool&&!tool.hidden){tool.querySelector('.cnt').textContent=picksLeft;
tool.disabled=picksLeft<=0||!hasRockOnBoard();}
if(used.every(u=>u)&&!over)setTimeout(()=>{if(!over)spawnTray()},240);else renderTray();
saveGame();
checkLevelGoal();
if(!over)setTimeout(()=>{if(!over&&!animating&&!canPlaceAny())gameOver();},520);}
function hasRockOnBoard(){
for(let r=0;r<N;r++)for(let c=0;c<N;c++){const b=board[r][c];if(b&&(b.rock||b.gem))return true;}
return false;}
let rockMode=false;
function toggleRockMode(){
if(over||animating)return;
if(picksLeft<=0){snd.bad();banner('Кирки закончились!','bad');return}
if(!hasRockOnBoard()){snd.bad();return}
rockMode=!rockMode;
const t=$('#toolRock');
if(t)t.classList.toggle('on',rockMode);
if(rockMode){snd.pick();banner('Выбери породу для удара киркой','teal');}}
function pickRock(r,c){
const b=board[r][c];if(!b||!(b.rock||b.gem))return;
spawnParts(r,c,b.rock?'#8b7a5e':COLORS[b.col].main);
board[r][c]=null;
picksLeft--;
snd.noise(.1,.12,700);buzz(15);
rockMode=false;const t=$('#toolRock');if(t){t.classList.remove('on');
t.querySelector('.cnt').textContent=picksLeft;t.disabled=picksLeft<=0||!hasRockOnBoard()}
saveGame();}

/* ---------- HUD ---------- */
const fmt=n=>Math.round(n).toLocaleString('ru-RU');
function updateHUD(){
$('#score').textContent=fmt(score);
$('#best').textContent=fmt(mode==='zen'?bestZ:bestC);
if(mode==='classic'){$('#lblMid').textContent='Уровень';$('#mid').textContent=level;
const g=goalForLevel(level);
$('#lblRight').textContent='Породы';$('#moves').textContent=countCells()+' кл.';
$('#goalLbl').textContent='Прогресс уровня '+level;
$('#goalNum').textContent=fmt(Math.min(score,g))+' / '+fmt(g);
$('#barFill').style.width=Math.min(100,score/g*100)+'%';
}else{
$('#lblMid').textContent='Блоков';$('#mid').textContent=placedCount;
$('#lblRight').textContent='Комбо';$('#moves').textContent='×'+maxCombo;
$('#goalLbl').textContent='Дзен · цель не важна';
$('#goalNum').textContent='очки: '+fmt(score);
$('#barFill').style.width='100%';}
$('#chipZen').hidden=mode!=='zen';}
function updateChips(){
const now=performance.now(),rush=now<rushUntil;
$('#chipRush').hidden=!rush;
if(rush)$('#chipRushN').textContent=Math.ceil((rushUntil-now)/1000)+'с';
$('#chipCombo').hidden=comboChain<2;
$('#chipComboN').textContent=comboChain;}
setInterval(updateChips,500);
function bumpEl(el){el.classList.remove('bump');void el.offsetWidth;el.classList.add('bump')}
function banner(txt,cls){const b=$('#banner');b.textContent=txt;b.className='banner '+(cls||'');
void b.offsetWidth;b.classList.add('show');}

/* ---------- перетаскивание ---------- */
const drag={active:false,idx:-1,r:-99,c:-99,ok:false,toolPick:null};
/* тап по занятой породе/кристаллу в режиме кирки */
cv.addEventListener('pointerdown',e=>{
if(!rockMode||over||animating)return;
const rect=cv.getBoundingClientRect();
const c=Math.floor((e.clientX-rect.left-pad)/cell),r=Math.floor((e.clientY-rect.top-pad)/cell);
if(r<0||c<0||r>=N||c>=N)return;
pickRock(r,c);});
const ghost=$('#dragGhost');
function attachDrag(div,i){
div.addEventListener('pointerdown',e=>{
if(over||animating)return;
snd.init();e.preventDefault();
drag.active=true;drag.idx=i;sel=i;
document.querySelectorAll('.tpiece').forEach(el=>el.classList.toggle('sel',+el.dataset.i===i));
ghost.innerHTML=pieceSVG(pieces[i],Math.max(18,cell*.9));
ghost.style.display='block';snd.pick();
moveDrag(e.clientX,e.clientY);
const mv=ev=>moveDrag(ev.clientX,ev.clientY);
const up=()=>endDrag();
addEventListener('pointermove',mv);addEventListener('pointerup',up);
addEventListener('pointercancel',up);});}
function moveDrag(x,y){
const gw=ghost.offsetWidth,gh=ghost.offsetHeight;
ghost.style.left=(x-gw/2)+'px';ghost.style.top=(y-gh-cell*.6)+'px';
const rect=cv.getBoundingClientRect();
const sh=pieces[drag.idx].sh;
const gx=x-rect.left,gy=y-rect.top-cell*.6;
let c=Math.round((gx-pad)/cell-(shapeW(sh)-1)/2);
let r=Math.round((gy-pad)/cell-(shapeH(sh)-1)/2);
drag.r=r;drag.c=c;
drag.ok=fits(sh,r,c);}
function endDrag(){
drag.active=false;ghost.style.display='none';
if(drag.ok&&drag.idx>=0&&!over&&!animating){place(drag.idx,drag.r,drag.c);}
else{snd.bad();buzz(30);renderTray();}
drag.idx=-1;}

/* ---------- сохранение партии ---------- */
function saveGame(){
if(mode!=='classic'||over&&!wonFlag)return;
try{store.set(SAVE_KEY,JSON.stringify({level,score,board,pieces,used,placedCount,maxCombo,picksLeft,ts:Date.now()}));}catch(e){}}
function loadGame(){try{const d=JSON.parse(store.get(SAVE_KEY,'null'));
if(!d||!Array.isArray(d.board)||d.board.length!==N||!Array.isArray(d.pieces)||d.pieces.length!==3)return null;
/* совместимость со старыми сохранениями: у клеток должен быть хотя бы col */
for(let r=0;r<N;r++){if(!Array.isArray(d.board[r])||d.board[r].length!==N)return null;
for(let c=0;c<N;c++){const b=d.board[r][c];if(b&&b.col===undefined&&!(b.rock||b.gem))return null;}}
return d}catch(e){return null}}
function clearSave(){store.del(SAVE_KEY)}

/* ---------- уровни / победа / поражение ---------- */
function newBoard(){board=[];for(let r=0;r<N;r++)board.push(new Array(N).fill(null))}
let picksLeft=0;
function refreshTool(){const t=$('#toolRock');if(!t)return;
t.hidden=mode!=='classic'||over;
t.classList.toggle('off',picksLeft<=0);
t.disabled=picksLeft<=0||!hasRockOnBoard();}
function startClassic(lv){
mode='classic';level=Math.max(1,Math.min(LEVELS,lv||prog.unlocked||1));wonFlag=false;
score=0;comboChain=0;maxCombo=1;rushUntil=0;placedCount=0;over=false;animating=false;
picksLeft=2;rockMode=false;
makeRock(level,'classic');spawnTray();
$('#startOv').classList.add('hidden');$('#endOv').classList.add('hidden');$('#lvlOv').classList.add('hidden');
updateHUD();updateChips();refreshTool();saveGame();banner('УРОВЕНЬ '+level,'teal');}
function startZen(){
mode='zen';wonFlag=true;
score=0;comboChain=0;maxCombo=1;rushUntil=0;placedCount=0;over=false;animating=false;
picksLeft=0;rockMode=false;
makeRock(level,'zen');spawnTray();
$('#startOv').classList.add('hidden');$('#endOv').classList.add('hidden');
updateHUD();updateChips();refreshTool();banner('🧘 ДЗЕН','teal');}
function checkLevelGoal(){
if(mode!=='classic'||over||animating)return;
if(score>=goalForLevel(level))levelWin();}
function levelWin(){
over=true;wonFlag=true;rockMode=false;refreshTool();
const g=goalForLevel(level);
let st=1;if(score>=g*1.35)st=2;if(score>=g*1.7)st=3;
if(st>starsOf(level))prog.stars[level]=st;
if(level<LEVELS&&prog.unlocked<level+1)prog.unlocked=level+1;
saveProg();clearSave();
if(score>bestC){bestC=score;store.set('kb-best-classic',bestC)}
pushLb();snd.win();buzz([30,60,30,60,60]);
banner('УРОВЕНЬ ПРОЙДЕН!','teal');
setTimeout(()=>showEnd(true,st,false),950);}
function gameOver(){
if(over)return;over=true;wonFlag=false;rockMode=false;refreshTool();snd.lose();buzz([60,60,120]);
banner('НЕТ МЕСТА!','bad');
let rec=false;
if(mode==='classic'){if(score>bestC){bestC=score;store.set('kb-best-classic',bestC);rec=true}}
else{if(score>bestZ){bestZ=score;store.set('kb-best-zen',bestZ);rec=true}}
pushLb();clearSave();
setTimeout(()=>showEnd(false,0,rec),950);}
function showEnd(win,st,rec){
$('#endTitle').textContent=win?('Уровень '+level+' пройден!'):(mode==='zen'?'Дзен завершён':'Игра окончена');
$('#endStars').textContent=win?('⭐'.repeat(st)+'☆'.repeat(3-st)):'';
$('#endStars').style.display=win?'block':'none';
$('#endScore').textContent=fmt(score);
$('#endMidLbl').textContent=mode==='zen'?'Блоков':'Уровень';
$('#endMid').textContent=mode==='zen'?placedCount:level;
$('#endCombo').textContent='×'+maxCombo;
$('#endRec').classList.toggle('on',!!rec);
$('#btnNext').style.display=(win&&mode==='classic'&&level<LEVELS)?'':'none';
$('#endOv').classList.remove('hidden');}

/* ---------- рекорды ---------- */
let lastRunD=0;
function pushLb(){
if(score<=0)return;
try{const a=JSON.parse(store.get(LB_KEY,'[]'))||[];
const item={m:mode,s:Math.round(score),d:Date.now()};
a.push(item);a.sort((x,y)=>y.s-x.s);
store.set(LB_KEY,JSON.stringify(a.slice(0,20)));lastRunD=item.d;}catch(e){}}
function renderLb(){
let a=[];try{a=JSON.parse(store.get(LB_KEY,'[]'))||[]}catch(e){}
const list=$('#lbList');
if(!a.length){list.innerHTML='<li><span class="nm">Пока пусто — сыграй партию!</span></li>';return}
list.innerHTML=a.slice(0,10).map((r,i)=>
`<li${r.d===lastRunD?' class="me"':''}><span class="pos">${i+1}</span><span class="nm">${r.m==='zen'?'🧘 Дзен':'🏆 Классика'}</span><span class="sc">${fmt(r.s)}</span></li>`).join('');}

/* ---------- карта уровней ---------- */
function renderLevels(){
const map=$('#lvlMap');map.innerHTML='';
let done=0;
for(let l=1;l<=LEVELS;l++){
if(starsOf(l))done++;
const b=document.createElement('button');
const locked=l>prog.unlocked;
b.className='lvcell'+(locked?' locked':'')+(l===level&&!locked?' cur':'')+(starsOf(l)?' done':'');
b.innerHTML=`<span class="n">${l}</span><span class="st">${locked?'🔒':(starsOf(l)?'⭐'.repeat(starsOf(l)):'◆')}</span>`;
if(!locked)b.onclick=()=>{snd.init();startClassic(l)};
map.appendChild(b);}
$('#lvlSub').textContent=`Классика · пройдено ${done} из ${LEVELS}`;}

/* ---------- темы ---------- */
let theme=+store.get('kb-theme','0')||0;
function applyTheme(){document.body.dataset.theme=theme;$('#btnThemeSet').textContent=THEMES[theme]}

/* ---------- пылинки ---------- */
(function dust(){const box=$('#dust');
for(let i=0;i<24;i++){const s=document.createElement('span');
const sz=Math.random()*4+1.5;
s.style.cssText=`left:${(Math.random()*100).toFixed(1)}%;width:${sz}px;height:${sz}px;background:hsla(${(190+Math.random()*60)|0},80%,70%,${(.15+Math.random()*.3).toFixed(2)});animation-duration:${(9+Math.random()*14).toFixed(1)}s;animation-delay:${(-Math.random()*20).toFixed(1)}s`;
box.appendChild(s);}})();

/* ---------- кнопки ---------- */
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{
snd.init();
if(b.dataset.mode==='classic')startClassic(prog.unlocked);
else startZen();});
$('#btnContinue').onclick=()=>{
const d=loadGame();if(!d)return;snd.init();
mode='classic';level=d.level||1;score=d.score||0;board=d.board;pieces=d.pieces;used=d.used;
placedCount=d.placedCount||0;maxCombo=d.maxCombo||1;comboChain=0;rushUntil=0;over=false;wonFlag=false;
picksLeft=(typeof d.picksLeft==='number')?d.picksLeft:2;rockMode=false;
$('#startOv').classList.add('hidden');renderTray();updateHUD();updateChips();refreshTool();};
$('#btnHow').onclick=()=>$('#howOv').classList.remove('hidden');
$('#btnHowClose').onclick=()=>$('#howOv').classList.add('hidden');
$('#btnLb').onclick=()=>{renderLb();$('#lbOv').classList.remove('hidden')};
$('#btnLbClose').onclick=()=>$('#lbOv').classList.add('hidden');
$('#btnSettings').onclick=()=>$('#setOv').classList.remove('hidden');
$('#btnSetClose').onclick=()=>$('#setOv').classList.add('hidden');
$('#btnThemeSet').onclick=()=>{theme=(theme+1)%THEMES.length;store.set('kb-theme',theme);applyTheme()};
$('#btnSoundSet').onclick=()=>{snd.on=!snd.on;store.set('kb-sound',snd.on?'1':'0');syncSound()};
$('#btnBuzzSet').onclick=()=>{buzzOn=!buzzOn;store.set('kb-buzz',buzzOn?'1':'0');$('#btnBuzzSet').textContent=buzzOn?'Вкл':'Выкл'};
$('#btnSound').onclick=()=>{snd.on=!snd.on;store.set('kb-sound',snd.on?'1':'0');syncSound()};
function syncSound(){$('#btnSound').textContent=snd.on?'🔊':'🔇';
$('#btnSoundSet').textContent=snd.on?'Вкл':'Выкл';$('#btnSoundSet').classList.toggle('off',!snd.on)}
$('#btnMenu').onclick=()=>{refreshStart();$('#startOv').classList.remove('hidden')};
$('#btnRestart').onclick=()=>{if(mode==='zen')startZen();else startClassic(level)};
$('#btnLevels').onclick=()=>{renderLevels();$('#lvlOv').classList.remove('hidden')};
$('#toolRock').onclick=toggleRockMode;
$('#btnLvlClose').onclick=()=>$('#lvlOv').classList.add('hidden');
$('#btnAgain').onclick=()=>{if(mode==='zen')startZen();else startClassic(level)};
$('#btnNext').onclick=()=>{if(level<LEVELS)startClassic(level+1)};
$('#btnEndMenu').onclick=()=>{$('#endOv').classList.add('hidden');refreshStart();$('#startOv').classList.remove('hidden')};
function refreshStart(){
$('#btnContinue').hidden=!loadGame();
$('#best').textContent=fmt(mode==='zen'?bestZ:bestC);}

/* ---------- инициализация ---------- */
applyTheme();syncSound();
$('#btnBuzzSet').textContent=buzzOn?'Вкл':'Выкл';
newBoard();resize();updateHUD();refreshStart();
window.addEventListener('pointerdown',()=>snd.init(),{once:true});
setTimeout(resize,80); /* после загрузки шрифтов/вёрстки */
