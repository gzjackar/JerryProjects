var Matter,Engine,Render,Runner,Bodies,Body,Composite,Events;
var W,H,GROUND_Y,SLING_X,SLING_Y,MAX_PULL,LAUNCH_POWER,BIRDS_PER_LEVEL;
var engine,render,runner;
var bird=null,pigs=[],blocks=[];
var launched=false,isDragging=false;
var birdStillFrames=0;
var pullX=0,pullY=0;
var currentLevel=1,score=0,totalScore=0,birdsLeft=3;
var gameState='menu';
var particles=[],scorePopups=[];
var TYPES,LEVELS;

async function lockLandscape(){
  try{
    if(screen.orientation&&screen.orientation.lock){
      await screen.orientation.lock('landscape');
    }
  }catch(e){}
}

function initGame(){
  Matter=window.Matter;
  Engine=Matter.Engine;
  Render=Matter.Render;
  Runner=Matter.Runner;
  Bodies=Matter.Bodies;
  Body=Matter.Body;
  Composite=Matter.Composite;
  Events=Matter.Events;
  W=window.innerWidth;
  H=window.innerHeight;
  GROUND_Y=H-60;
  SLING_X=Math.min(120,W*0.3);
  SLING_Y=GROUND_Y-50;
  MAX_PULL=120;
  LAUNCH_POWER=0.16;
  BIRDS_PER_LEVEL=3;
  TYPES={
    wood:{color:'#D2691E',density:0.003,friction:0.6,hp:1,points:50},
    stone:{color:'#696969',density:0.01,friction:0.8,hp:2,points:100},
    glass:{color:'rgba(173,216,230,0.8)',density:0.001,friction:0.4,hp:1,points:30}
  };
  LEVELS=[
    {name:'草地训练',pigs:[{x:W*0.65,y:GROUND_Y-28,r:28},{x:W*0.78,y:GROUND_Y-25,r:22}],blocks:[{x:W*0.7,y:GROUND_Y-20,w:100,h:20,t:'wood'},{x:W*0.7,y:GROUND_Y-55,w:60,h:15,t:'wood'},{x:W*0.65,y:GROUND_Y-55,w:15,h:55,t:'wood'},{x:W*0.78,y:GROUND_Y-50,w:15,h:50,t:'wood'}]},
    {name:'冰与火',pigs:[{x:W*0.55,y:GROUND_Y-30,r:32},{x:W*0.7,y:GROUND_Y-28,r:28},{x:W*0.85,y:GROUND_Y-22,r:20}],blocks:[{x:W*0.6,y:GROUND_Y-25,w:80,h:20,t:'stone'},{x:W*0.6,y:GROUND_Y-65,w:60,h:15,t:'wood'},{x:W*0.6,y:GROUND_Y-105,w:40,h:15,t:'glass'},{x:W*0.7,y:GROUND_Y-25,w:15,h:50,t:'stone'},{x:W*0.7,y:GROUND_Y-60,w:15,h:50,t:'wood'},{x:W*0.85,y:GROUND_Y-25,w:15,h:50,t:'glass'}]},
    {name:'猪猪城堡',pigs:[{x:W*0.5,y:GROUND_Y-35,r:35},{x:W*0.65,y:GROUND_Y-28,r:28},{x:W*0.8,y:GROUND_Y-28,r:28}],blocks:[{x:W*0.5,y:GROUND_Y-30,w:15,h:60,t:'stone'},{x:W*0.5,y:GROUND_Y-75,w:80,h:15,t:'stone'},{x:W*0.58,y:GROUND_Y-30,w:15,h:60,t:'wood'},{x:W*0.58,y:GROUND_Y-75,w:50,h:15,t:'glass'},{x:W*0.65,y:GROUND_Y-30,w:15,h:60,t:'stone'},{x:W*0.72,y:GROUND_Y-30,w:15,h:60,t:'wood'},{x:W*0.72,y:GROUND_Y-75,w:60,h:15,t:'wood'},{x:W*0.8,y:GROUND_Y-30,w:15,h:60,t:'glass'}]}
  ];
  engine=Engine.create({enableSleeping:false});
  engine.world.gravity.y=1.0;
  render=Render.create({canvas:document.getElementById('gameCanvas'),engine:engine,options:{width:W,height:H,wireframes:false,background:'#87CEEB'}});
  Composite.add(engine.world,Bodies.rectangle(W/2,GROUND_Y+30,W+200,60,{isStatic:true,render:{fillStyle:'#5D4037'},friction:0.9,label:'ground'}));
  runner=Runner.create();
  Runner.run(runner,engine);
  Render.run(render);
  Events.on(engine,'collisionStart',handleCollision);
  Events.on(engine,'afterUpdate',gameLoop);
  Events.on(render,'afterRender',drawEverything);
  var canvas=render.canvas;
  canvas.addEventListener('mousedown',onPointerDown);
  canvas.addEventListener('mousemove',onPointerMove);
  canvas.addEventListener('mouseup',onPointerUp);
  canvas.addEventListener('touchstart',function(e){e.preventDefault();onPointerDown(e.touches[0]);},{passive:false});
  canvas.addEventListener('touchmove',function(e){e.preventDefault();onPointerMove(e.touches[0]);},{passive:false});
  canvas.addEventListener('touchend',function(e){e.preventDefault();onPointerUp();},{passive:false});
  canvas.addEventListener('click',onBoost);
  document.getElementById('startBtn').onclick=function(){lockLandscape();startLevel(1);};
  window.addEventListener('orientationchange',function(){setTimeout(function(){location.reload();},250);});
  updateUI();
}

function drawEverything(){
  var ctx=render.context;
  ctx.clearRect(0,0,W,H);
  drawBackground(ctx);
  drawBlocks(ctx);
  drawPigs(ctx);
  drawBird(ctx);
  drawSlingshot(ctx);
  drawParticles(ctx);
  drawScorePopups(ctx);
}

var trail=[];
function drawBackground(ctx){
  var skyGrad=ctx.createLinearGradient(0,0,0,GROUND_Y);
  skyGrad.addColorStop(0,'#1a1a4e');
  skyGrad.addColorStop(0.3,'#4a90c9');
  skyGrad.addColorStop(1,'#87CEEB');
  ctx.fillStyle=skyGrad;
  ctx.fillRect(0,0,W,GROUND_Y);
  ctx.fillStyle='rgba(255,255,255,0.8)';
  drawCloud(ctx,W*0.1,H*0.1,30);
  drawCloud(ctx,W*0.5,H*0.08,40);
  drawCloud(ctx,W*0.85,H*0.15,25);
  drawCloud(ctx,W*0.3,H*0.2,20);
  ctx.fillStyle='#4a7c23';
  ctx.fillRect(0,GROUND_Y,W,15);
  ctx.fillStyle='#6B4226';
  ctx.fillRect(0,GROUND_Y+15,W,H-GROUND_Y-15);
  // Draw ground texture
  ctx.fillStyle='#5D4037';
  ctx.fillRect(0,GROUND_Y+15,W,10);
}

function drawCloud(ctx,x,y,size){
  ctx.beginPath();
  ctx.arc(x,y,size,0,Math.PI*2);
  ctx.arc(x+size*0.9,y-size*0.1,size*0.7,0,Math.PI*2);
  ctx.arc(x+size*1.6,y,size*0.55,0,Math.PI*2);
  ctx.fill();
}

function drawBlocks(ctx){
  blocks.forEach(function(b){
    if(!b.removed){
      var type=TYPES[b.blockType];
      ctx.save();
      ctx.translate(b.position.x,b.position.y);
      ctx.rotate(b.angle);
      var w=b.bounds.max.x-b.bounds.min.x;
      var h=b.bounds.max.y-b.bounds.min.y;
      if(b.blockType==='wood'){
        ctx.fillStyle='#D2691E';
        ctx.fillRect(-w/2,-h/2,w,h);
        ctx.fillStyle='#8B4513';
        ctx.fillRect(-w/2+3,-h/2+2,w-6,4);
        ctx.fillRect(-w/2+3,h/2-6,w-6,4);
        ctx.strokeStyle='#654321';
        ctx.lineWidth=2;
        ctx.strokeRect(-w/2,-h/2,w,h);
      } else if(b.blockType==='stone'){
        ctx.fillStyle='#696969';
        ctx.fillRect(-w/2,-h/2,w,h);
        ctx.fillStyle='#888888';
        ctx.fillRect(-w/2+2,-h/2+2,w-4,5);
        ctx.strokeStyle='#333';
        ctx.lineWidth=2;
        ctx.strokeRect(-w/2,-h/2,w,h);
      } else if(b.blockType==='glass'){
        ctx.fillStyle='rgba(173,216,230,0.8)';
        ctx.fillRect(-w/2,-h/2,w,h);
        ctx.strokeStyle='rgba(255,255,255,0.9)';
        ctx.lineWidth=2;
        ctx.strokeRect(-w/2,-h/2,w,h);
      }
      ctx.restore();
    }
  });
}

function drawPigs(ctx){
  pigs.forEach(function(p){
    if(!p.removed){
      ctx.save();
      ctx.translate(p.position.x,p.position.y);
      ctx.rotate(p.angle);
      var r=p.circleRadius||28;
      ctx.fillStyle='#4CAF50';
      ctx.beginPath();
      ctx.arc(0,0,r,0,Math.PI*2);
      ctx.fill();
      ctx.fillStyle='#81C784';
      ctx.beginPath();
      ctx.arc(-r*0.3,-r*0.2,r*0.15,0,Math.PI*2);
      ctx.arc(r*0.3,-r*0.2,r*0.15,0,Math.PI*2);
      ctx.fill();
      ctx.fillStyle='#2E7D32';
      ctx.beginPath();
      ctx.arc(0,r*0.15,r*0.5,0,Math.PI*2);
      ctx.fill();
      // Snout - small protruding nose
      ctx.fillStyle='#388E3C';
      ctx.beginPath();
      ctx.ellipse(0,r*0.38,r*0.28,r*0.18,0,0,Math.PI*2);
      ctx.fill();
      ctx.fillStyle='#2E7D32';
      ctx.beginPath();
      ctx.ellipse(-r*0.09,r*0.38,r*0.06,r*0.05,0,0,Math.PI*2);
      ctx.ellipse(r*0.09,r*0.38,r*0.06,r*0.05,0,0,Math.PI*2);
      ctx.fill();
      ctx.fillStyle='#1B5E20';
      ctx.beginPath();
      ctx.arc(0,0,r*1.08,0,Math.PI*2);
      ctx.strokeStyle='#2E7D32';
      ctx.lineWidth=3;
      ctx.stroke();
      ctx.restore();
    }
  });
}

function drawBird(ctx){
  // Draw trail
  if(bird&&launched){
    trail.push({x:bird.position.x,y:bird.position.y,r:15,life:15});
  }
  trail.forEach(function(t){
    ctx.globalAlpha=t.life/15;
    ctx.fillStyle='#FF4444';
    ctx.beginPath();
    ctx.arc(t.x,t.y,t.r*t.life/15,0,Math.PI*2);
    ctx.fill();
  });
  ctx.globalAlpha=1;
  trail=trail.filter(function(t){t.life--;return t.life>0;});
  
  if(!bird) return;
  ctx.save();
  ctx.translate(bird.position.x,bird.position.y);
  ctx.rotate(bird.angle);
  var r=20;
  ctx.fillStyle='#E53935';
  ctx.beginPath();
  ctx.arc(0,0,r,0,Math.PI*2);
  ctx.fill();
  ctx.fillStyle='white';
  ctx.beginPath();
  ctx.arc(-r*0.3,-r*0.15,r*0.22,0,Math.PI*2);
  ctx.arc(r*0.1,-r*0.15,r*0.22,0,Math.PI*2);
  ctx.fill();
  ctx.fillStyle='#111';
  ctx.beginPath();
  ctx.arc(-r*0.3,-r*0.15,r*0.1,0,Math.PI*2);
  ctx.arc(r*0.1,-r*0.15,r*0.1,0,Math.PI*2);
  ctx.fill();
  ctx.fillStyle='#B71C1C';
  ctx.beginPath();
  ctx.moveTo(0,r*0.1);
  ctx.quadraticCurveTo(r*0.4,r*0.5,0,r*0.6);
  ctx.quadraticCurveTo(-r*0.4,r*0.5,0,r*0.1);
  ctx.fill();
  ctx.fillStyle='#E53935';
  ctx.beginPath();
  ctx.ellipse(-r*0.8,r*0.1,r*0.25,r*0.15,-0.3,0,Math.PI*2);
  ctx.ellipse(r*0.8,r*0.1,r*0.25,r*0.15,0.3,0,Math.PI*2);
  ctx.fill();
  // Wings (flap when flying)
  // Wings (always spread out)
  ctx.save();
  ctx.translate(-r*0.5,-r*0.1);
  ctx.rotate(-0.5);
  ctx.fillStyle='#D32F2F';
  ctx.beginPath();
  ctx.ellipse(0,0,r*0.8,r*0.38,0,0,Math.PI*2);
  ctx.fill();
  ctx.strokeStyle='#B71C1C';
  ctx.lineWidth=2;
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.translate(r*0.5,-r*0.1);
  ctx.rotate(0.5);
  ctx.fillStyle='#D32F2F';
  ctx.beginPath();
  ctx.ellipse(0,0,r*0.8,r*0.38,0,0,Math.PI*2);
  ctx.fill();
  ctx.strokeStyle='#B71C1C';
  ctx.lineWidth=2;
  ctx.stroke();
  ctx.restore();
  ctx.restore();
}

function drawSlingshot(ctx){
  ctx.fillStyle='#5D4037';
  ctx.fillRect(SLING_X-8,SLING_Y+10,16,60);
  ctx.fillStyle='#4E342E';
  ctx.beginPath();
  ctx.moveTo(SLING_X-12,SLING_Y+10);
  ctx.lineTo(SLING_X,SLING_Y-5);
  ctx.lineTo(SLING_X+12,SLING_Y+10);
  ctx.closePath();
  ctx.fill();
  if(bird&&!launched){
    ctx.strokeStyle='#8B4513';
    ctx.lineWidth=5;
    ctx.lineCap='round';
    ctx.beginPath();
    ctx.moveTo(SLING_X-8,SLING_Y+5);
    ctx.lineTo(bird.position.x,bird.position.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(SLING_X+8,SLING_Y+5);
    ctx.lineTo(bird.position.x,bird.position.y);
    ctx.stroke();
  } else {
    ctx.strokeStyle='#8B4513';
    ctx.lineWidth=5;
    ctx.lineCap='round';
    ctx.beginPath();
    ctx.moveTo(SLING_X-8,SLING_Y+5);
    ctx.quadraticCurveTo(SLING_X,SLING_Y-5,SLING_X+8,SLING_Y+5);
    ctx.stroke();
  }
}

function drawParticles(ctx){
  particles.forEach(function(p){
    p.x+=p.vx;
    p.y+=p.vy;
    p.vy+=0.2;
    p.life--;
    ctx.globalAlpha=Math.max(0,p.life/p.maxLife);
    ctx.fillStyle=p.color;
    ctx.beginPath();
    ctx.arc(p.x,p.y,p.size,0,Math.PI*2);
    ctx.fill();
  });
  ctx.globalAlpha=1;
  particles=particles.filter(function(p){return p.life>0;});
}

function drawScorePopups(ctx){
  scorePopups.forEach(function(sp){
    sp.y-=1.5;
    sp.life--;
    ctx.globalAlpha=Math.max(0,sp.life/sp.maxLife);
    ctx.fillStyle=sp.color;
    ctx.font='bold '+sp.size+'px sans-serif';
    ctx.textAlign='center';
    ctx.strokeStyle='#000';
    ctx.lineWidth=3;
    ctx.strokeText(sp.text,sp.x,sp.y);
    ctx.fillText(sp.text,sp.x,sp.y);
  });
  ctx.globalAlpha=1;
  scorePopups=scorePopups.filter(function(sp){return sp.life>0;});
}

function spawnParticles(x,y,color,count){
  count=count||12;
  for(var i=0;i<count;i++){
    particles.push({x:x,y:y,vx:(Math.random()-0.5)*10,vy:(Math.random()-0.5)*10-3,size:Math.random()*5+2,color:color,life:25+Math.random()*15,maxLife:40});
  }
}

function showScorePopup(x,y,text,color){
  color=color||'#FFD700';
  scorePopups.push({x:x,y:y,text:text,color:color,size:24,life:40,maxLife:40});
}

function startLevel(n){
  currentLevel=n;
  document.getElementById('overlay').classList.add('hidden');
  gameState='playing';
  loadLevel(n);
}

function loadLevel(n){
  pigs.forEach(function(p){Composite.remove(engine.world,p);});
  blocks.forEach(function(b){Composite.remove(engine.world,b);});
  if(bird){Composite.remove(engine.world,bird);}
  pigs=[];blocks=[];bird=null;score=0;birdsLeft=BIRDS_PER_LEVEL;launched=false;birdStillFrames=0;pullX=0;pullY=0;trail=[];
  var lv=LEVELS[n-1];
  lv.blocks.forEach(function(b){
    var type=TYPES[b.t];
    var blk=Bodies.rectangle(b.x,b.y,b.w,b.h,{
      render:{fillStyle:type.color},
      density:type.density,
      friction:type.friction,
      label:'block',
      blockType:b.t,
      hp:type.hp
    });
    blocks.push(blk);
    Composite.add(engine.world,blk);
  });
  lv.pigs.forEach(function(p){
    var pig=Bodies.circle(p.x,p.y,p.r,{
      render:{fillStyle:'#4CAF50'},
      label:'pig',
      restitution:0.3,
      friction:0.5
    });
    pigs.push(pig);
    Composite.add(engine.world,pig);
  });
  spawnBird();
  updateUI();
}

function spawnBird(){
  if(bird){Composite.remove(engine.world,bird);}
  bird=Bodies.circle(SLING_X,SLING_Y,20,{
    render:{fillStyle:'#E53935'},
    label:'bird',
    restitution:0.4
  });
  Body.setStatic(bird,true);
  Composite.add(engine.world,bird);
  launched=false;
  birdStillFrames=0;
  pullX=0;pullY=0;
}

function onPointerDown(e){
  if(gameState!=='playing'||launched||birdsLeft<=0||!bird) return;
  var rect=render.canvas.getBoundingClientRect();
  var x=e.clientX-rect.left;
  var y=e.clientY-rect.top;
  if(Math.hypot(x-bird.position.x,y-bird.position.y)<50){
    isDragging=true;
  }
}

function onPointerMove(e){
  if(!isDragging||!bird) return;
  var rect=render.canvas.getBoundingClientRect();
  var x=e.clientX-rect.left;
  var y=e.clientY-rect.top;
  var dx=x-SLING_X,dy=y-SLING_Y;
  var d=Math.hypot(dx,dy);
  if(d>MAX_PULL){dx=dx/d*MAX_PULL;dy=dy/d*MAX_PULL;}
  pullX=dx;pullY=dy;
  Body.setPosition(bird,{x:SLING_X+dx,y:SLING_Y+dy});
}

function onPointerUp(){
  if(!isDragging) return;
  isDragging=false;
  var power=Math.hypot(pullX,pullY);
  if(power<10){
    Body.setPosition(bird,{x:SLING_X,y:SLING_Y});
    pullX=0;pullY=0;
    return;
  }
  Body.setStatic(bird,false);
  Body.setVelocity(bird,{x:-pullX*LAUNCH_POWER,y:-pullY*LAUNCH_POWER});
  launched=true;
  birdStillFrames=0;
  birdsLeft--;
  updateUI();
  setTimeout(checkState,4000);
}

function onBoost(){
  if(!bird||!launched) return;
  Body.setVelocity(bird,{x:bird.velocity.x*1.5,y:bird.velocity.y*1.5});
  spawnParticles(bird.position.x,bird.position.y,'#FFAA00',6);
}

function handleCollision(e){
  e.pairs.forEach(function(pair){
    var a=pair.bodyA,b=pair.bodyB;
    var spd=Math.hypot(a.velocity.x-b.velocity.x,a.velocity.y-b.velocity.y);
    if(spd<3) return;
    if((a.label==='bird'&&b.label==='pig')||(b.label==='bird'&&a.label==='pig')){
      var pig=a.label==='pig'?a:b;
      if(!pig.removed){pig.removed=true;killPig(pig);}
    }
    if((a.label==='bird'&&b.label==='block')||(b.label==='bird'&&a.label==='block')){
      var blk=a.label==='block'?a:b;
      if(spd>5&&!blk.removed&&blk.hp){
        blk.hp--;
        if(blk.hp<=0){blk.removed=true;killBlock(blk);}
        else{spawnParticles(blk.position.x,blk.position.y,TYPES[blk.blockType].color,4);}
      }
    }
  });
}

function killPig(p){
  if(!pigs.includes(p)) return;
  pigs=pigs.filter(function(x){return x!==p;});
  Composite.remove(engine.world,p);
  score+=500;
  spawnParticles(p.position.x,p.position.y,'#4CAF50',15);
  spawnParticles(p.position.x,p.position.y,'#81C784',10);
  showScorePopup(p.position.x,p.position.y,'+500','#FFEB3B');
  updateUI();
  if(pigs.length===0) setTimeout(levelWin,500);
}

function killBlock(b){
  if(!blocks.includes(b)) return;
  blocks=blocks.filter(function(x){return x!==b;});
  Composite.remove(engine.world,b);
  var pts=TYPES[b.blockType]?TYPES[b.blockType].points:50;
  score+=pts;
  spawnParticles(b.position.x,b.position.y,TYPES[b.blockType].color,10);
  showScorePopup(b.position.x,b.position.y,'+'+pts,'#FFF');
  updateUI();
}

function gameLoop(){
  if(!bird||!launched) return;

  var speed=Math.hypot(bird.velocity.x,bird.velocity.y);
  if(speed<0.8&&bird.position.y>GROUND_Y-120){
    birdStillFrames++;
  }else{
    birdStillFrames=0;
  }

  if(bird.position.x>W+80||bird.position.y>H+80||bird.position.x<-80||birdStillFrames>90){
    Composite.remove(engine.world,bird);
    bird=null;
    birdStillFrames=0;
    if(pigs.length>0&&birdsLeft>0) setTimeout(spawnBird,500);
    else if(pigs.length>0) setTimeout(checkFail,1200);
  }
}

function checkState(){
  if(gameState!=='playing') return;
  if(pigs.length>0&&birdsLeft<=0&&(!bird||bird.position.x>W)) levelFail();
}

function checkFail(){
  if(gameState!=='playing'||pigs.length===0) return;
  if(birdsLeft<=0&&(!bird||bird.position.x>W)) levelFail();
}

function levelWin(){
  if(gameState!=='playing') return;
  gameState='win';
  totalScore+=score;
  var ov=document.getElementById('overlay');
  if(currentLevel>=LEVELS.length){
    ov.innerHTML='<h1>🎉 通关!</h1><p>总得分: '+totalScore+'</p><button class="btn" onclick="location.reload()">再玩一次</button>';
  } else {
    ov.innerHTML='<h1>✅ 过关!</h1><p>得分: '+score+'</p><button class="btn btn-blue" onclick="nextLevel()">下一关</button><button class="btn" onclick="location.reload()">选关</button>';
  }
  ov.classList.remove('hidden');
}

function levelFail(){
  if(gameState!=='playing') return;
  gameState='fail';
  var ov=document.getElementById('overlay');
  ov.innerHTML='<h1>❌ 失败</h1><p>猪猪还有 '+(pigs.length>0?pigs.length:'?')+' 只!</p><button class="btn" onclick="restartLevel()">重试</button><button class="btn btn-blue" onclick="location.reload()">选关</button>';
  ov.classList.remove('hidden');
}

function nextLevel(){
  currentLevel++;
  gameState='playing';
  document.getElementById('overlay').classList.add('hidden');
  loadLevel(currentLevel);
}

function restartLevel(){
  score=0;
  gameState='playing';
  document.getElementById('overlay').classList.add('hidden');
  loadLevel(currentLevel);
}

function updateUI(){
  document.getElementById('levelName').textContent='第 '+currentLevel+' 关';
  document.getElementById('score').textContent='得分: '+score;
  var container=document.getElementById('birdsLeft');
  container.innerHTML='';
  for(var i=0;i<BIRDS_PER_LEVEL;i++){
    var div=document.createElement('div');
    div.className='bird-icon'+(i>=birdsLeft?' used':'');
    container.appendChild(div);
  }
}

window.onload=initGame;