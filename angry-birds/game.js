var Matter,Engine,Render,Runner,Bodies,Body,Composite,Events;
var W,H,GROUND_Y,SLING_X,SLING_Y,MAX_PULL,LAUNCH_POWER,BIRDS_PER_LEVEL;
var engine,render,runner;
var bird=null,pigs=[],blocks=[];
var launched=false,isDragging=false;
var birdStillFrames=0,birdFlightTime=0;
var pullX=0,pullY=0;
var currentLevel=1,score=0,totalScore=0,birdsLeft=3;
var currentBirdIndex=0,totalBirds=0,currentBirdType='red',abilityUsed=false,nextBirdIndex=0;
var miniBirds=[],boomerangBirds=[];
var gameState='menu';
var particles=[],scorePopups=[];
var TYPES,LEVELS,BIRD_DEFS;
var audioCtx=null,musicOsc=null,musicGain=null;
var soundEnabled=true,musicEnabled=true;
var audioInitialized=false;
var unlockedLevel=1,highScores={};
var globalLeaderboard={}; // Shared leaderboard - stores top scores from all players
function loadProgress(){
  try{
    var d=localStorage.getItem('angryBirdsProgress');
    if(d){var p=JSON.parse(d);unlockedLevel=p.unlockedLevel||1;highScores=p.highScores||{};}
    var g=localStorage.getItem('angryBirdsLeaderboard');
    if(g){globalLeaderboard=JSON.parse(g);}else{globalLeaderboard={};}
  }catch(e){}
}
function saveProgress(){
  try{localStorage.setItem('angryBirdsProgress',JSON.stringify({unlockedLevel:unlockedLevel,highScores:highScores}));}catch(e){}
}
function saveLeaderboard(){
  try{localStorage.setItem('angryBirdsLeaderboard',JSON.stringify(globalLeaderboard));}catch(e){}
}
function submitScore(level,score){
  if(!globalLeaderboard[level]||score>globalLeaderboard[level]){
    globalLeaderboard[level]=score;
    saveLeaderboard();
    return true;
  }
  return false;
}
function showShareCard(){
  var c=document.createElement('canvas');
  c.width=600;c.height=400;
  var ctx=c.getContext('2d');
  // Background
  var grad=ctx.createLinearGradient(0,0,0,400);
  grad.addColorStop(0,'#1a1a2e');grad.addColorStop(1,'#16213e');
  ctx.fillStyle=grad;ctx.fillRect(0,0,600,400);
  // Title
  ctx.fillStyle='#FFD700';ctx.font='bold 36px sans-serif';ctx.textAlign='center';
  ctx.fillText('🐦 愤怒的小鸟',300,50);
  // Level
  ctx.fillStyle='#fff';ctx.font='24px sans-serif';
  ctx.fillText('第'+currentLevel+'关 - '+LEVELS[currentLevel-1].name,300,100);
  // Score
  ctx.fillStyle='#FFD700';ctx.font='bold 48px sans-serif';
  ctx.fillText(score,300,170);
  // Stars
  var st=getStars(score);
  ctx.font='40px sans-serif';
  ctx.fillText('⭐'.repeat(st),300,220);
  // Rank
  var rank=getMyRank(currentLevel,score);
  ctx.fillStyle='#4CAF50';ctx.font='20px sans-serif';
  ctx.fillText('你的排名: 第'+rank+'名',300,270);
  // QR hint
  ctx.fillStyle='#888';ctx.font='14px sans-serif';
  ctx.fillText('长按保存图片分享到微信群',300,330);
  ctx.fillText('和朋友比拼最高分！',300,355);
  ctx.fillText('扫码体验: http://192.168.10.54/angry_birds/',300,385);
  return c.toDataURL('image/png');
}
function getMyRank(level,score){
  var scores=Object.values(globalLeaderboard).sort(function(a,b){return b-a;});
  for(var i=0;i<scores.length;i++){if(scores[i]<=score)return i+1;}
  return scores.length+1;
}
function showLeaderboard(){
  var ov=document.getElementById('overlay');
  var h='<h1 style="color:#FFD700;text-align:center;margin-bottom:20px;">🏆 排行榜</h1>';
  h+='<div style="max-height:60vh;overflow-y:auto;text-align:center;">';
  for(var i=1;i<=10;i++){
    var lv=LEVELS[i-1];
    var topScore=globalLeaderboard[i]||0;
    var isMe=highScores[i]===topScore&&topScore>0;
    var rankIcon=['🥇','🥈','🥉','4','5','6','7','8','9','10'][i-1];
    h+='<div style="padding:10px;margin:5px 0;background:rgba(255,255,255,0.1);border-radius:10px;color:white;">';
    h+='<span style="font-size:24px;">'+rankIcon+'</span> ';
    h+='<span style="font-weight:bold;">第'+i+'关</span> - '+lv.name+' ';
    h+='<span style="color:#FFD700;">最高:'+topScore+'</span>';
    if(isMe)h+=' <span style="color:#4CAF50;">(你)</span>';
    h+='</div>';
  }
  h+='</div>';
  h+='<button class="btn" onclick="location.reload()" style="margin-top:15px;">返回</button>';
  ov.innerHTML=h;
  ov.classList.remove('hidden');
}
function downloadShareCard(){
  var imgData=showShareCard();
  var a=document.createElement('a');
  a.href=imgData;
  a.download='angrybirds_level'+currentLevel+'_'+score+'.png';
  a.click();
}
function showShareCard(){
  var c=document.createElement('canvas');
  c.width=600;c.height=400;
  var ctx=c.getContext('2d');
  var grad=ctx.createLinearGradient(0,0,0,400);
  grad.addColorStop(0,'#1a1a2e');grad.addColorStop(1,'#16213e');
  ctx.fillStyle=grad;ctx.fillRect(0,0,600,400);
  ctx.fillStyle='#FFD700';ctx.font='bold 36px sans-serif';ctx.textAlign='center';
  ctx.fillText('🐦 愤怒的小鸟',300,50);
  ctx.fillStyle='#fff';ctx.font='24px sans-serif';
  ctx.fillText('第'+currentLevel+'关 - '+LEVELS[currentLevel-1].name,300,100);
  ctx.fillStyle='#FFD700';ctx.font='bold 48px sans-serif';
  ctx.fillText(score,300,170);
  var st=getStars(score);
  ctx.font='40px sans-serif';
  ctx.fillText('⭐'.repeat(st),300,220);
  var rank=getMyRank(currentLevel,score);
  ctx.fillStyle='#4CAF50';ctx.font='20px sans-serif';
  ctx.fillText('你的排名: 第'+rank+'名',300,270);
  ctx.fillStyle='#888';ctx.font='14px sans-serif';
  ctx.fillText('长按保存图片分享到微信群',300,330);
  ctx.fillText('和朋友比拼最高分！',300,355);
  ctx.fillText('体验游戏: http://192.168.10.54/angry_birds/',300,385);
  return c.toDataURL('image/png');
}

function initAudio(){
  try{
    audioCtx=new(window.AudioContext||window.webkitAudioContext)();
    audioInitialized=true;
  }catch(e){soundEnabled=false;}
}
function resumeAudio(){
  if(!audioInitialized){
    initAudio();
  }
  if(audioCtx){
    if(audioCtx.state==='suspended'){
      audioCtx.resume().then(function(){
        var buf=audioCtx.createBuffer(1,1,22050);
        var src=audioCtx.createBufferSource();
        src.buffer=buf;
        src.connect(audioCtx.destination);
        src.start();
      });
    }
  }
}
function playSound(type){
  if(!soundEnabled||!audioCtx)return;
  var t=audioCtx.currentTime;
  if(type==='launch'){
    // Fun "boing" launch sound
    var osc=audioCtx.createOscillator();
    var gain=audioCtx.createGain();
    osc.connect(gain);gain.connect(audioCtx.destination);
    osc.type='sine';
    osc.frequency.setValueAtTime(300,t);
    osc.frequency.exponentialRampToValueAtTime(600,t+0.05);
    osc.frequency.exponentialRampToValueAtTime(400,t+0.15);
    gain.gain.setValueAtTime(0.25,t);
    gain.gain.exponentialRampToValueAtTime(0.01,t+0.2);
    osc.start(t);osc.stop(t+0.2);
  }else if(type==='hit'){
    // Soft satisfying "bonk" sound
    var osc=audioCtx.createOscillator();
    var gain=audioCtx.createGain();
    var filter=audioCtx.createBiquadFilter();
    osc.connect(filter);filter.connect(gain);gain.connect(audioCtx.destination);
    osc.type='sine';
    osc.frequency.setValueAtTime(200,t);
    osc.frequency.exponentialRampToValueAtTime(80,t+0.15);
    filter.type='lowpass';filter.frequency.value=800;
    gain.gain.setValueAtTime(0.3,t);
    gain.gain.exponentialRampToValueAtTime(0.01,t+0.2);
    osc.start(t);osc.stop(t+0.2);
  }else if(type==='pig'){
    // Happy squeak sound
    var osc=audioCtx.createOscillator();
    var gain=audioCtx.createGain();
    osc.connect(gain);gain.connect(audioCtx.destination);
    osc.type='sine';
    osc.frequency.setValueAtTime(600,t);
    osc.frequency.setValueAtTime(800,t+0.05);
    osc.frequency.setValueAtTime(600,t+0.1);
    osc.frequency.exponentialRampToValueAtTime(300,t+0.25);
    gain.gain.setValueAtTime(0.2,t);
    gain.gain.exponentialRampToValueAtTime(0.01,t+0.3);
    osc.start(t);osc.stop(t+0.3);
  }else if(type==='block'){
    // Satisfying crunch sound
    var noise=audioCtx.createBufferSource();
    var buf=audioCtx.createBuffer(1,audioCtx.sampleRate*0.1,audioCtx.sampleRate);
    var data=buf.getChannelData(0);
    for(var i=0;i<data.length;i++){data[i]=(Math.random()*2-1)*Math.exp(-i/(data.length*0.3));}
    noise.buffer=buf;
    var filter=audioCtx.createBiquadFilter();
    var gain=audioCtx.createGain();
    noise.connect(filter);filter.connect(gain);gain.connect(audioCtx.destination);
    filter.type='bandpass';filter.frequency.value=1000;filter.Q.value=1;
    gain.gain.setValueAtTime(0.15,t);
    noise.start(t);
  }else if(type==='win'){
    // Happy victory fanfare
    var notes=[523,659,784,1047,1319];
    notes.forEach(function(f,i){
      var o=audioCtx.createOscillator();
      var g=audioCtx.createGain();
      o.connect(g);g.connect(audioCtx.destination);
      o.type='sine';
      o.frequency.value=f;
      g.gain.setValueAtTime(0,t+i*0.12);
      g.gain.linearRampToValueAtTime(0.2,t+i*0.12+0.05);
      g.gain.exponentialRampToValueAtTime(0.01,t+i*0.12+0.4);
      o.start(t+i*0.12);o.stop(t+i*0.12+0.45);
    });
  }else if(type==='fail'){
    // Gentle "aww" sound
    var osc=audioCtx.createOscillator();
    var gain=audioCtx.createGain();
    osc.connect(gain);gain.connect(audioCtx.destination);
    osc.type='sine';
    osc.frequency.setValueAtTime(400,t);
    osc.frequency.exponentialRampToValueAtTime(200,t+0.4);
    gain.gain.setValueAtTime(0.2,t);
    gain.gain.exponentialRampToValueAtTime(0.01,t+0.5);
    osc.start(t);osc.stop(t+0.5);
  }else if(type==='skill'){
    // Magical sparkle whoosh
    var osc=audioCtx.createOscillator();
    var gain=audioCtx.createGain();
    var filter=audioCtx.createBiquadFilter();
    osc.connect(filter);filter.connect(gain);gain.connect(audioCtx.destination);
    osc.type='sine';
    osc.frequency.setValueAtTime(400,t);
    osc.frequency.exponentialRampToValueAtTime(1500,t+0.1);
    osc.frequency.exponentialRampToValueAtTime(800,t+0.2);
    filter.type='bandpass';filter.frequency.value=1000;
    gain.gain.setValueAtTime(0.2,t);
    gain.gain.linearRampToValueAtTime(0.25,t+0.1);
    gain.gain.exponentialRampToValueAtTime(0.01,t+0.25);
    osc.start(t);osc.stop(t+0.25);
  }
}
function startMusic(){
  if(!musicEnabled||!audioCtx)return;
  if(musicOsc){try{musicOsc.stop();}catch(e){}}
  musicGain=audioCtx.createGain();
  musicGain.gain.value=0.06;
  musicGain.connect(audioCtx.destination);
  // Fun upbeat melody - like a happy adventure tune
  var melody=[392,440,494,523,587,659,587,523,494,440,392,440,523,587,659,784];
  var bass=[196,196,220,220,247,247,220,220,196,196,220,220,262,262,247,247];
  var beatIdx=0;
  function playBeat(){
    if(!musicEnabled||gameState==='menu'||gameState==='win'||gameState==='fail'){
      if(musicOsc){try{musicOsc.stop();}catch(e){}musicOsc=null;}
      return;
    }
    var t=audioCtx.currentTime;
    // Melody note
    var mOsc=audioCtx.createOscillator();
    var mGain=audioCtx.createGain();
    mOsc.connect(mGain);mGain.connect(musicGain);
    mOsc.type='sine';
    mOsc.frequency.value=melody[beatIdx%melody.length];
    mGain.gain.setValueAtTime(0.12,t);
    mGain.gain.exponentialRampToValueAtTime(0.01,t+0.35);
    mOsc.start(t);mOsc.stop(t+0.4);
    // Bass note
    var bOsc=audioCtx.createOscillator();
    var bGain=audioCtx.createGain();
    bOsc.connect(bGain);bGain.connect(musicGain);
    bOsc.type='triangle';
    bOsc.frequency.value=bass[beatIdx%bass.length];
    bGain.gain.setValueAtTime(0.08,t);
    bGain.gain.exponentialRampToValueAtTime(0.01,t+0.4);
    bOsc.start(t);bOsc.stop(t+0.45);
    // Hi-hat sparkle on some beats
    if(beatIdx%4===0){
      var h=audioCtx.createOscillator();
      var hg=audioCtx.createGain();
      h.connect(hg);hg.connect(musicGain);
      h.type='sine';
      h.frequency.value=2000+Math.random()*500;
      hg.gain.setValueAtTime(0.03,t);
      hg.gain.exponentialRampToValueAtTime(0.001,t+0.05);
      h.start(t);h.stop(t+0.05);
    }
    beatIdx++;
    setTimeout(playBeat,350);
  }
  playBeat();
}
function stopMusic(){
  musicEnabled=false;
  if(musicOsc){try{musicOsc.stop();}catch(e){}musicOsc=null;}
}

async function lockLandscape(){
  try{
    if(screen.orientation&&screen.orientation.lock){
      await screen.orientation.lock('landscape');
    }
  }catch(e){}
}

function toggleFullscreen(){
  // iOS doesn't support canvas fullscreen - show instruction instead
  alert('iOS 请使用"添加到主屏幕"功能实现全屏：\n1. 点击分享按钮 ⬆️\n2. 选择"添加到主屏幕"\n3. 从主屏幕打开即可');
}
function launchIntoFullscreen(element){
  var rfs=element.requestFullscreen||element.webkitRequestFullscreen||element.mozRequestFullScreen||element.msRequestFullscreen;
  if(rfs)rfs.call(element);
}
function initGame(){
  initAudio();
  loadProgress();
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
  SLING_X=Math.min(140,W*0.12);
  SLING_Y=GROUND_Y-90;
  MAX_PULL=130;
  LAUNCH_POWER=0.28; // Increased from 0.18 for more power
  BIRDS_PER_LEVEL=3;
  
  // 5种鸟类定义 - 大幅增强威力
  BIRD_DEFS={
    red:{
      name:'红色小鸟',
      color:'#E53935',
      density:0.015, // Increased from 0.006
      radius:22, // Slightly bigger
      ability:'groundPound',
      desc:'💥 冲击：快速下坠击碎目标'
    },
    yellow:{
      name:'黄色小鸟',
      color:'#FDD835',
      density:0.012, // Increased from 0.003
      radius:20,
      ability:'speedBoost',
      desc:'⚡ 加速：点击加速冲刺'
    },
    blue:{
      name:'蓝色小鸟',
      color:'#1E88E5',
      density:0.010, // Increased from 0.002
      radius:18,
      ability:'split',
      desc:'🔱 分裂：点击分裂成3只'
    },
    black:{
      name:'黑色小鸟',
      color:'#212121',
      density:0.020, // Increased from 0.008
      radius:24, // Bigger
      ability:'explode',
      desc:'💣 爆炸：范围伤害'
    },
    white:{
      name:'白色小鸟',
      color:'#ECEFF1',
      density:0.004,
      radius:18,
      ability:'boomerang',
      desc:'🪃 回旋镖：返回攻击后方'
    }
  };

  TYPES={
    wood:{color:'#D2691E',density:0.015,friction:0.98,frictionStatic:1.0,hp:2,restitution:0.05,points:50},
    stone:{color:'#696969',density:0.04,friction:0.99,frictionStatic:1.0,hp:4,restitution:0.05,points:100},
    glass:{color:'rgba(173,216,230,0.8)',density:0.012,friction:0.95,frictionStatic:1.0,hp:1,restitution:0.03,points:30},
    metal:{color:'#78909C',density:0.06,friction:1.0,frictionStatic:1.0,hp:6,restitution:0.05,points:200}
  };

  // 10个关卡，难度递增
  LEVELS=[
    // 第1关：教学
    {
      name:'草地训练',
      birds:['red','red','yellow'],
      pigs:[{x:W*0.65,y:GROUND_Y-28,r:28},{x:W*0.78,y:GROUND_Y-25,r:22}],
      blocks:[
        {x:W*0.7,y:GROUND_Y-20,w:100,h:20,t:'wood'},
        {x:W*0.7,y:GROUND_Y-55,w:60,h:15,t:'wood'},
        {x:W*0.65,y:GROUND_Y-55,w:15,h:55,t:'wood'},
        {x:W*0.78,y:GROUND_Y-50,w:15,h:50,t:'wood'}
      ]
    },
    // 第2关：简单结构
    {
      name:'森林之桥',
      birds:['red','yellow','blue'],
      pigs:[{x:W*0.55,y:GROUND_Y-30,r:32},{x:W*0.7,y:GROUND_Y-28,r:28},{x:W*0.85,y:GROUND_Y-22,r:20}],
      blocks:[
        {x:W*0.6,y:GROUND_Y-25,w:80,h:20,t:'stone'},
        {x:W*0.6,y:GROUND_Y-65,w:60,h:15,t:'wood'},
        {x:W*0.6,y:GROUND_Y-105,w:40,h:15,t:'glass'},
        {x:W*0.7,y:GROUND_Y-25,w:15,h:50,t:'stone'},
        {x:W*0.7,y:GROUND_Y-60,w:15,h:50,t:'wood'},
        {x:W*0.85,y:GROUND_Y-25,w:15,h:50,t:'glass'}
      ]
    },
    // 第3关：多层结构
    {
      name:'猪猪城堡',
      birds:['yellow','blue','red'],
      pigs:[{x:W*0.5,y:GROUND_Y-35,r:35},{x:W*0.65,y:GROUND_Y-28,r:28},{x:W*0.8,y:GROUND_Y-28,r:28}],
      blocks:[
        {x:W*0.5,y:GROUND_Y-30,w:15,h:60,t:'stone'},
        {x:W*0.5,y:GROUND_Y-75,w:80,h:15,t:'stone'},
        {x:W*0.58,y:GROUND_Y-30,w:15,h:60,t:'wood'},
        {x:W*0.58,y:GROUND_Y-75,w:50,h:15,t:'glass'},
        {x:W*0.65,y:GROUND_Y-30,w:15,h:60,t:'stone'},
        {x:W*0.72,y:GROUND_Y-30,w:15,h:60,t:'wood'},
        {x:W*0.72,y:GROUND_Y-75,w:60,h:15,t:'wood'},
        {x:W*0.8,y:GROUND_Y-30,w:15,h:60,t:'glass'}
      ]
    },
    // 第4关：高塔挑战
    {
      name:'天空之塔',
      birds:['blue','blue','yellow'],
      pigs:[{x:W*0.6,y:GROUND_Y-28,r:26},{x:W*0.6,y:GROUND_Y-100,r:22},{x:W*0.6,y:GROUND_Y-172,r:18},{x:W*0.8,y:GROUND_Y-25,r:24}],
      blocks:[
        {x:W*0.6,y:GROUND_Y-20,w:20,h:40,t:'glass'},
        {x:W*0.6,y:GROUND_Y-55,w:80,h:15,t:'glass'},
        {x:W*0.6,y:GROUND_Y-75,w:20,h:40,t:'glass'},
        {x:W*0.6,y:GROUND_Y-110,w:80,h:15,t:'glass'},
        {x:W*0.6,y:GROUND_Y-130,w:20,h:40,t:'wood'},
        {x:W*0.6,y:GROUND_Y-165,w:80,h:15,t:'glass'},
        {x:W*0.6,y:GROUND_Y-185,w:20,h:40,t:'glass'},
        {x:W*0.8,y:GROUND_Y-20,w:20,h:40,t:'wood'},
        {x:W*0.8,y:GROUND_Y-55,w:60,h:15,t:'wood'}
      ]
    },
    // 第5关：石头堡垒
    {
      name:'黑色巢穴',
      birds:['red','black','black'],
      pigs:[{x:W*0.5,y:GROUND_Y-35,r:32},{x:W*0.65,y:GROUND_Y-28,r:28},{x:W*0.8,y:GROUND_Y-35,r:32},{x:W*0.72,y:GROUND_Y-80,r:22}],
      blocks:[
        {x:W*0.5,y:GROUND_Y-30,w:15,h:60,t:'stone'},
        {x:W*0.5,y:GROUND_Y-75,w:80,h:15,t:'stone'},
        {x:W*0.65,y:GROUND_Y-30,w:15,h:60,t:'stone'},
        {x:W*0.65,y:GROUND_Y-75,w:15,h:60,t:'stone'},
        {x:W*0.65,y:GROUND_Y-120,w:100,h:15,t:'stone'},
        {x:W*0.72,y:GROUND_Y-75,w:15,h:60,t:'wood'},
        {x:W*0.8,y:GROUND_Y-30,w:15,h:60,t:'stone'},
        {x:W*0.8,y:GROUND_Y-75,w:80,h:15,t:'stone'},
        {x:W*0.72,y:GROUND_Y-120,w:20,h:60,t:'glass'}
      ]
    },
    // 第6关：混合材料
    {
      name:'终极Boss',
      birds:['yellow','blue','black','red','yellow'],
      pigs:[{x:W*0.4,y:GROUND_Y-30,r:30},{x:W*0.5,y:GROUND_Y-30,r:26},{x:W*0.6,y:GROUND_Y-80,r:24},{x:W*0.72,y:GROUND_Y-35,r:28},{x:W*0.82,y:GROUND_Y-35,r:28},{x:W*0.75,y:GROUND_Y-140,r:20}],
      blocks:[
        {x:W*0.38,y:GROUND_Y-25,w:15,h:50,t:'stone'},
        {x:W*0.38,y:GROUND_Y-65,w:70,h:12,t:'stone'},
        {x:W*0.45,y:GROUND_Y-25,w:15,h:50,t:'wood'},
        {x:W*0.52,y:GROUND_Y-30,w:15,h:60,t:'stone'},
        {x:W*0.52,y:GROUND_Y-75,w:15,h:60,t:'wood'},
        {x:W*0.52,y:GROUND_Y-120,w:15,h:60,t:'glass'},
        {x:W*0.52,y:GROUND_Y-165,w:80,h:12,t:'glass'},
        {x:W*0.6,y:GROUND_Y-30,w:15,h:60,t:'stone'},
        {x:W*0.6,y:GROUND_Y-75,w:15,h:60,t:'glass'},
        {x:W*0.72,y:GROUND_Y-30,w:15,h:60,t:'stone'},
        {x:W*0.72,y:GROUND_Y-75,w:15,h:60,t:'wood'},
        {x:W*0.72,y:GROUND_Y-120,w:80,h:12,t:'wood'},
        {x:W*0.78,y:GROUND_Y-30,w:15,h:60,t:'glass'},
        {x:W*0.58,y:GROUND_Y-185,w:120,h:12,t:'stone'},
        {x:W*0.75,y:GROUND_Y-185,w:15,h:50,t:'glass'}
      ]
    },
    // 第7关：金属要塞
    {
      name:'钢铁防线',
      birds:['red','yellow','black','blue','white'],
      pigs:[
        {x:W*0.45,y:GROUND_Y-28,r:28},{x:W*0.55,y:GROUND_Y-28,r:28},
        {x:W*0.65,y:GROUND_Y-65,r:24},{x:W*0.65,y:GROUND_Y-130,r:20},
        {x:W*0.8,y:GROUND_Y-28,r:26},{x:W*0.8,y:GROUND_Y-100,r:22}
      ],
      blocks:[
        {x:W*0.4,y:GROUND_Y-20,w:20,h:40,t:'metal'},
        {x:W*0.5,y:GROUND_Y-20,w:20,h:40,t:'metal'},
        {x:W*0.4,y:GROUND_Y-55,w:80,h:12,t:'stone'},
        {x:W*0.5,y:GROUND_Y-90,w:15,h:60,t:'stone'},
        {x:W*0.6,y:GROUND_Y-20,w:20,h:40,t:'glass'},
        {x:W*0.6,y:GROUND_Y-55,w:80,h:12,t:'wood'},
        {x:W*0.65,y:GROUND_Y-90,w:15,h:60,t:'metal'},
        {x:W*0.7,y:GROUND_Y-20,w:20,h:40,t:'wood'},
        {x:W*0.75,y:GROUND_Y-55,w:60,h:12,t:'glass'},
        {x:W*0.8,y:GROUND_Y-90,w:15,h:60,t:'stone'},
        {x:W*0.65,y:GROUND_Y-120,w:100,h:12,t:'stone'},
        {x:W*0.65,y:GROUND_Y-145,w:20,h:50,t:'metal'},
        {x:W*0.8,y:GROUND_Y-130,w:15,h:80,t:'wood'}
      ]
    },
    // 第8关：金字塔
    {
      name:'沙漠金字塔',
      birds:['yellow','blue','white','black','red'],
      pigs:[
        {x:W*0.5,y:GROUND_Y-22,r:24},{x:W*0.58,y:GROUND_Y-22,r:24},{x:W*0.66,y:GROUND_Y-22,r:24},
        {x:W*0.54,y:GROUND_Y-65,r:22},{x:W*0.62,y:GROUND_Y-65,r:22},
        {x:W*0.58,y:GROUND_Y-110,r:20}
      ],
      blocks:[
        {x:W*0.45,y:GROUND_Y-20,w:15,h:40,t:'stone'},
        {x:W*0.5,y:GROUND_Y-20,w:15,h:40,t:'wood'},
        {x:W*0.55,y:GROUND_Y-20,w:15,h:40,t:'wood'},
        {x:W*0.6,y:GROUND_Y-20,w:15,h:40,t:'stone'},
        {x:W*0.65,y:GROUND_Y-20,w:15,h:40,t:'wood'},
        {x:W*0.48,y:GROUND_Y-55,w:15,h:40,t:'wood'},
        {x:W*0.54,y:GROUND_Y-55,w:15,h:40,t:'glass'},
        {x:W*0.6,y:GROUND_Y-55,w:15,h:40,t:'glass'},
        {x:W*0.66,y:GROUND_Y-55,w:15,h:40,t:'wood'},
        {x:W*0.52,y:GROUND_Y-90,w:15,h:40,t:'glass'},
        {x:W*0.58,y:GROUND_Y-90,w:15,h:40,t:'stone'},
        {x:W*0.64,y:GROUND_Y-90,w:15,h:40,t:'glass'},
        {x:W*0.56,y:GROUND_Y-125,w:12,h:40,t:'stone'},
        {x:W*0.62,y:GROUND_Y-125,w:12,h:40,t:'stone'},
        {x:W*0.59,y:GROUND_Y-160,w:12,h:40,t:'wood'}
      ]
    },
    // 第9关：铁索桥
    {
      name:'危机吊桥',
      birds:['blue','white','black','yellow','red'],
      pigs:[
        {x:W*0.4,y:GROUND_Y-45,r:26},{x:W*0.5,y:GROUND_Y-45,r:26},
        {x:W*0.6,y:GROUND_Y-90,r:22},{x:W*0.7,y:GROUND_Y-90,r:22},
        {x:W*0.8,y:GROUND_Y-45,r:26}
      ],
      blocks:[
        {x:W*0.35,y:GROUND_Y-20,w:15,h:40,t:'metal'},
        {x:W*0.4,y:GROUND_Y-55,w:15,h:50,t:'stone'},
        {x:W*0.45,y:GROUND_Y-20,w:15,h:40,t:'wood'},
        {x:W*0.5,y:GROUND_Y-55,w:15,h:50,t:'stone'},
        {x:W*0.55,y:GROUND_Y-20,w:15,h:40,t:'glass'},
        {x:W*0.6,y:GROUND_Y-55,w:15,h:50,t:'stone'},
        {x:W*0.6,y:GROUND_Y-90,w:80,h:12,t:'wood'},
        {x:W*0.65,y:GROUND_Y-20,w:15,h:40,t:'wood'},
        {x:W*0.7,y:GROUND_Y-55,w:15,h:50,t:'stone'},
        {x:W*0.75,y:GROUND_Y-20,w:15,h:40,t:'metal'},
        {x:W*0.8,y:GROUND_Y-55,w:15,h:50,t:'stone'},
        {x:W*0.85,y:GROUND_Y-20,w:15,h:40,t:'metal'},
        {x:W*0.8,y:GROUND_Y-90,w:15,h:50,t:'glass'}
      ]
    },
    // 第10关：最终决战
    {
      name:'最终决战',
      birds:['red','yellow','blue','black','white'],
      pigs:[
        {x:W*0.35,y:GROUND_Y-30,r:28},{x:W*0.45,y:GROUND_Y-30,r:28},
        {x:W*0.55,y:GROUND_Y-70,r:24},{x:W*0.55,y:GROUND_Y-130,r:22},
        {x:W*0.65,y:GROUND_Y-70,r:24},
        {x:W*0.75,y:GROUND_Y-30,r:28},{x:W*0.85,y:GROUND_Y-30,r:28},
        {x:W*0.65,y:GROUND_Y-170,r:18}
      ],
      blocks:[
        // 左边塔
        {x:W*0.3,y:GROUND_Y-20,w:20,h:40,t:'metal'},
        {x:W*0.35,y:GROUND_Y-55,w:20,h:50,t:'stone'},
        {x:W*0.4,y:GROUND_Y-20,w:20,h:40,t:'stone'},
        {x:W*0.35,y:GROUND_Y-90,w:15,h:60,t:'metal'},
        {x:W*0.42,y:GROUND_Y-55,w:15,h:50,t:'wood'},
        // 中间塔
        {x:W*0.5,y:GROUND_Y-20,w:20,h:40,t:'glass'},
        {x:W*0.5,y:GROUND_Y-55,w:20,h:50,t:'stone'},
        {x:W*0.55,y:GROUND_Y-90,w:15,h:60,t:'metal'},
        {x:W*0.55,y:GROUND_Y-140,w:80,h:12,t:'stone'},
        {x:W*0.6,y:GROUND_Y-20,w:20,h:40,t:'wood'},
        {x:W*0.6,y:GROUND_Y-55,w:20,h:50,t:'glass'},
        {x:W*0.55,y:GROUND_Y-180,w:15,h:50,t:'metal'},
        {x:W*0.62,y:GROUND_Y-90,w:15,h:60,t:'glass'},
        {x:W*0.62,y:GROUND_Y-140,w:15,h:60,t:'stone'},
        // 右边塔
        {x:W*0.7,y:GROUND_Y-20,w:20,h:40,t:'stone'},
        {x:W*0.75,y:GROUND_Y-55,w:20,h:50,t:'stone'},
        {x:W*0.8,y:GROUND_Y-20,w:20,h:40,t:'metal'},
        {x:W*0.75,y:GROUND_Y-90,w:15,h:60,t:'wood'},
        {x:W*0.85,y:GROUND_Y-55,w:20,h:50,t:'metal'},
        {x:W*0.88,y:GROUND_Y-20,w:15,h:40,t:'metal'},
        {x:W*0.82,y:GROUND_Y-90,w:15,h:60,t:'glass'}
      ]
    }
  ];

  engine=Engine.create({enableSleeping:false});
  engine.world.gravity.y=0.5;
  engine.timing.timeScale=1.0;
  engine.constraintIterations=8;
  engine.positionIterations=12;
  engine.velocityIterations=8;
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
  document.getElementById('startBtn').onclick=function(){resumeAudio();lockLandscape();showLevelSelect();};
  window.addEventListener('orientationchange',function(){setTimeout(function(){location.reload();},250);});
  updateUI();
}

function showLevelSelect(){
  var ov=document.getElementById('overlay');
  var h='<h1 style="color:#FFD700;text-align:center;margin-bottom:20px;">🎮 选择关卡</h1>';
  h+='<div style="background:linear-gradient(135deg,#1a1a2e,#16213e);padding:15px;border-radius:15px;margin-bottom:15px;text-align:center;color:#aaa;">';
  h+='<b style="color:#fff">5种鸟类：</b> ';
  Object.keys(BIRD_DEFS).forEach(function(k){h+='<span style="color:'+BIRD_DEFS[k].color+';font-size:18px;">●</span> ';});
  h+='</div>';
  h+='<div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;padding:10px;max-height:65vh;overflow-y:auto;">';
  LEVELS.forEach(function(lv,i){
    var lvl=i+1;
    var locked=lvl>unlockedLevel;
    var diff=['⭐','⭐⭐','⭐⭐⭐','⭐⭐⭐','⭐⭐⭐⭐','⭐⭐⭐⭐⭐','⭐⭐⭐⭐⭐','⭐⭐⭐⭐⭐','⭐⭐⭐⭐⭐','💀'][i];
    var bg=locked?'linear-gradient(135deg,#333,#222)':'linear-gradient(135deg,#2d3748,#4a5568)';
    var onclick=locked?'':'onclick="resumeAudio();startLevel('+lvl+')"';
    var lockIcon=locked?'🔒 ':'';
    var hs=highScores[lvl]?'<div style="font-size:11px;color:#FFD700;">最高:'+highScores[lvl]+'</div>':'';
    h+='<button '+onclick+' style="width:45%;padding:14px;background:'+bg+';color:white;border:none;border-radius:12px;font-size:14px;cursor:'+(locked?'default':'pointer')+';font-weight:bold;box-shadow:0 4px 6px rgba(0,0,0,0.3);opacity:'+(locked?'0.6':'1')+';"><div style="font-size:18px;margin-bottom:4px;">'+lockIcon+'第'+lvl+'关 '+diff+'</div><div style="font-size:12px;opacity:0.8;margin-bottom:6px;">'+lv.name+'</div>'+hs+'<div>';lv.birds.forEach(function(b){h+='<span style="color:'+BIRD_DEFS[b].color+';font-size:16px;">●</span>';});h+='</div></button>';
  });
  h+='</div>';
  var totalStars=Object.keys(highScores).reduce(function(s,l){return s+getStars(highScores[parseInt(l)]);},0);
  h+='<div style="text-align:center;margin-top:15px;color:#888;font-size:12px;">总星星: <span style="color:#FFD700;font-weight:bold;">'+totalStars+'</span> / '+(LEVELS.length*3)+' ⭐</div>';
  ov.innerHTML=h;
  ov.classList.remove('hidden');
}
function getStars(s){if(s>=3000)return 3;if(s>=2000)return 2;if(s>=1000)return 1;return 0;}
function drawEverything(){
  var ctx=render.context;
  ctx.clearRect(0,0,W,H);
  drawBackground(ctx);
  drawBlocks(ctx);
  drawPigs(ctx);
  drawBird(ctx);
  drawMiniBirds(ctx);
  drawBoomerangBirds(ctx);
  drawSlingshot(ctx);
  drawParticles(ctx);
  drawScorePopups(ctx);
  if(launched && bird && !abilityUsed) drawAbilityHint(ctx);
}

function drawAbilityHint(ctx){
  var ab=BIRD_DEFS[currentBirdType].ability;
  var names={groundPound:'💥冲击',speedBoost:'⚡加速',split:'🔱分裂',explode:'💣爆炸',boomerang:'🪃回旋'};
  ctx.save();
  ctx.font='bold 14px sans-serif';
  ctx.textAlign='center';
  ctx.fillStyle='rgba(0,0,0,0.6)';
  ctx.fillText('点击触发 '+names[ab]+'！',W/2,H-25);
  ctx.restore();
}

function drawMiniBirds(ctx){
  miniBirds.forEach(function(mb){
    if(!mb.body||mb.dead) return;
    var def=BIRD_DEFS[mb.type];
    ctx.save();
    ctx.translate(mb.body.position.x,mb.body.position.y);
    ctx.rotate(mb.body.angle);
    ctx.fillStyle=def.color;
    ctx.beginPath();
    ctx.arc(0,0,def.radius,0,Math.PI*2);
    ctx.fill();
    drawBirdEyes(ctx,def.radius,def.color);
    ctx.restore();
  });
}

function drawBoomerangBirds(ctx){
  boomerangBirds.forEach(function(bb){
    if(!bb.body||bb.dead) return;
    var def=BIRD_DEFS[bb.type];
    ctx.save();
    ctx.translate(bb.body.position.x,bb.body.position.y);
    ctx.rotate(bb.body.angle);
    // White bird with slight glow
    var grad=ctx.createRadialGradient(0,0,0,0,0,def.radius*1.5);
    grad.addColorStop(0,def.color);
    grad.addColorStop(0.7,def.color);
    grad.addColorStop(1,'rgba(250,250,250,0.3)');
    ctx.fillStyle=grad;
    ctx.beginPath();
    ctx.arc(0,0,def.radius,0,Math.PI*2);
    ctx.fill();
    // Spinning effect indicator
    ctx.strokeStyle='#90CAF9';
    ctx.lineWidth=2;
    ctx.beginPath();
    ctx.arc(0,0,def.radius*1.3,bb.spinAngle,bb.spinAngle+Math.PI);
    ctx.stroke();
    drawBirdEyes(ctx,def.radius,def.color);
    ctx.restore();
  });
}

function drawBirdEyes(ctx,radius,color){
  ctx.fillStyle='white';
  ctx.beginPath();
  ctx.arc(-radius*0.3,-radius*0.15,radius*0.22,0,Math.PI*2);
  ctx.arc(radius*0.1,-radius*0.15,radius*0.22,0,Math.PI*2);
  ctx.fill();
  ctx.fillStyle='#111';
  ctx.beginPath();
  ctx.arc(-radius*0.3,-radius*0.15,radius*0.1,0,Math.PI*2);
  ctx.arc(radius*0.1,-radius*0.15,radius*0.1,0,Math.PI*2);
  ctx.fill();
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
      var w=b.originalWidth||(b.bounds.max.x-b.bounds.min.x);
      var h=b.originalHeight||(b.bounds.max.y-b.bounds.min.y);
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
      } else if(b.blockType==='metal'){
        var metalGrad=ctx.createLinearGradient(-w/2,0,w/2,0);
        metalGrad.addColorStop(0,'#607D8B');
        metalGrad.addColorStop(0.3,'#90A4AE');
        metalGrad.addColorStop(0.5,'#B0BEC5');
        metalGrad.addColorStop(0.7,'#90A4AE');
        metalGrad.addColorStop(1,'#607D8B');
        ctx.fillStyle=metalGrad;
        ctx.fillRect(-w/2,-h/2,w,h);
        ctx.strokeStyle='#455A64';
        ctx.lineWidth=2;
        ctx.strokeRect(-w/2,-h/2,w,h);
        // Rivets
        ctx.fillStyle='#37474F';
        ctx.beginPath();
        ctx.arc(-w/2+5,-h/2+5,3,0,Math.PI*2);
        ctx.arc(w/2-5,-h/2+5,3,0,Math.PI*2);
        ctx.arc(-w/2+5,h/2-5,3,0,Math.PI*2);
        ctx.arc(w/2-5,h/2-5,3,0,Math.PI*2);
        ctx.fill();
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
  if(!bird) return;
  
  // Draw trail
  trail.push({x:bird.position.x,y:bird.position.y,r:15,life:15});
  trail.forEach(function(t){
    ctx.globalAlpha=t.life/15;
    ctx.fillStyle='#FF4444';
    ctx.beginPath();
    ctx.arc(t.x,t.y,t.r*t.life/15,0,Math.PI*2);
    ctx.fill();
  });
  ctx.globalAlpha=1;
  trail=trail.filter(function(t){t.life--;return t.life>0;});
  
  ctx.save();
  ctx.translate(bird.position.x,bird.position.y);
  ctx.rotate(bird.angle);
  var r=20;
  var def=BIRD_DEFS[currentBirdType];
  
  // Body
  ctx.fillStyle=def.color;
  ctx.beginPath();
  ctx.arc(0,0,r,0,Math.PI*2);
  ctx.fill();
  
  // Eyes
  drawBirdEyes(ctx,r,def.color);
  
  // Beak
  ctx.fillStyle='#B71C1C';
  ctx.beginPath();
  ctx.moveTo(0,r*0.1);
  ctx.quadraticCurveTo(r*0.4,r*0.5,0,r*0.6);
  ctx.quadraticCurveTo(-r*0.4,r*0.5,0,r*0.1);
  ctx.fill();
  
  // Wings
  ctx.save();
  ctx.translate(-r*0.5,-r*0.1);
  ctx.rotate(-0.5);
  ctx.fillStyle=currentBirdType==='black'?'#424242':def.color;
  ctx.beginPath();
  ctx.ellipse(0,0,r*0.8,r*0.38,0,0,Math.PI*2);
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.translate(r*0.5,-r*0.1);
  ctx.rotate(0.5);
  ctx.fillStyle=currentBirdType==='black'?'#424242':def.color;
  ctx.beginPath();
  ctx.ellipse(0,0,r*0.8,r*0.38,0,0,Math.PI*2);
  ctx.fill();
  ctx.restore();
  ctx.restore();
}

function drawSlingshot(ctx){
  // Draw pole - extending from below the Y-shape down to the ground
  var poleHeight = GROUND_Y - (SLING_Y + 10);
  ctx.fillStyle='#5D4037';
  ctx.fillRect(SLING_X-8,SLING_Y+10,16,poleHeight);
  // Draw Y-shape (the fork)
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

var worldStable=false;
function startLevel(n){
  currentLevel=n;
  document.getElementById('overlay').classList.add('hidden');
  gameState='playing';
  musicEnabled=true;
  startMusic();
  var lv=LEVELS[n-1];
  totalBirds=lv.birds.length;
  nextBirdIndex=0;
  currentBirdIndex=0;
  worldStable=false;
  loadLevel(n);
  // Make bird immediately available for firing (no delay)
  worldStable=true;
  if(birdsLeft>0) spawnBird();
}

function loadLevel(n){
  pigs.forEach(function(p){Composite.remove(engine.world,p);});
  blocks.forEach(function(b){Composite.remove(engine.world,b);});
  if(bird){Composite.remove(engine.world,bird);}
  miniBirds.forEach(function(mb){if(mb.body)Composite.remove(engine.world,mb.body);});
  boomerangBirds.forEach(function(bb){if(bb.body)Composite.remove(engine.world,bb.body);});
  pigs=[];blocks=[];bird=null;miniBirds=[];boomerangBirds=[];score=0;launched=false;birdStillFrames=0;birdFlightTime=0;pullX=0;pullY=0;trail=[];
  var lv=LEVELS[n-1];
  totalBirds=lv.birds.length;
  birdsLeft=totalBirds;
  lv.blocks.forEach(function(b){
    var type=TYPES[b.t];
    var blk=Bodies.rectangle(b.x,b.y,b.w,b.h,{
      render:{fillStyle:type.color},
      density:type.density,
      friction:type.friction,
      frictionStatic:type.frictionStatic||0.9,
      restitution:type.restitution||0.05,
      label:'block',
      blockType:b.t,
      hp:type.hp
    });
    blk.originalWidth=b.w;
    blk.originalHeight=b.h;
    blk.isStatic=true; // Make immovable until bird is launched
    blocks.push(blk);
    Composite.add(engine.world,blk);
  });
  lv.pigs.forEach(function(p){
    var pig=Bodies.circle(p.x,p.y,p.r,{
      render:{fillStyle:'#4CAF50'},
      density:0.005,
      label:'pig',
      restitution:0.1,
      friction:0.6,
      frictionStatic:0.8
    });
    pigs.push(pig);
    Composite.add(engine.world,pig);
  });
  currentBirdIndex=0;
  nextBirdIndex=0;
  currentBirdType=lv.birds[0]||'red';
  totalBirds=lv.birds.length;
  spawnBird();
  updateUI();
}

function spawnBird(){
  if(bird){Composite.remove(engine.world,bird);}
  var lv=LEVELS[currentLevel-1];
  if(nextBirdIndex>=totalBirds) return;
  currentBirdIndex=nextBirdIndex;
  currentBirdType=lv.birds[nextBirdIndex]||'red';
  var def=BIRD_DEFS[currentBirdType];
  bird=Bodies.circle(SLING_X,SLING_Y,def.radius,{
    render:{fillStyle:def.color},
    density:def.density,
    label:'bird',
    restitution:0.4
  });
  Body.setStatic(bird,true);
  Composite.add(engine.world,bird);
  launched=false;
  abilityUsed=false;
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
  birdFlightTime=0;
  birdsLeft--;
  nextBirdIndex++;
  updateUI();
  playSound('launch');
  // Make blocks movable when bird is launched
  blocks.forEach(function(blk){
    if(blk&&blk.originalWidth){
      Body.setStatic(blk,false);
    }
  });
  // Schedule next bird spawn - earlier to ensure it appears
  setTimeout(function(){
    if(gameState==='playing' && pigs.length>0 && birdsLeft>0 && nextBirdIndex < totalBirds){
      spawnBird();
    }
  },1000);
  // Check game state after each bird (prevents getting stuck if bird disappears without hitting anything)
  scheduleCheckState();
}

function scheduleCheckState(){
  clearTimeout(window._checkStateTimer);
  window._checkStateTimer=setTimeout(function(){
    if(gameState==='playing') checkState();
  },3000);
}

function onBoost(){
  if(!bird||!launched||abilityUsed) return;
  abilityUsed=true;
  triggerBirdAbility(bird);
}

function splitBird(){
  var def=BIRD_DEFS.blue;
  var angles=[-0.5,0,0.5];
  var dir=bird.velocity.x>=0?1:-1;
  var speed=Math.sqrt(bird.velocity.x*bird.velocity.x+bird.velocity.y*bird.velocity.y);
  angles.forEach(function(angle,i){
    var nb=Bodies.circle(bird.position.x+i*8,bird.position.y,def.radius,{
      render:{fillStyle:def.color},
      density:def.density,
      label:'bird',
      restitution:0.4
    });
    Body.setStatic(nb,false);
    Body.setVelocity(nb,{
      x:dir*speed*Math.cos(angle),
      y:-Math.abs(speed)*0.8 // Always go upward
    });
    Composite.add(engine.world,nb);
    miniBirds.push({body:nb,type:'blue',dead:false,flightTime:0});
  });
  Composite.remove(engine.world,bird);
  bird=null;
}

function explodeBird(){
  var bx=bird.position.x,by=bird.position.y,r=120; // Increased from 80 to 120
  for(var i=0;i<12;i++){spawnParticles(bx,by,'#FF5722',25);}
  Composite.remove(engine.world,bird);
  bird=null;
  blocks.forEach(function(blk){
    if(!blk.removed){
      var dx=blk.position.x-bx,dy=blk.position.y-by,d=Math.sqrt(dx*dx+dy*dy);
      if(d<r){blk.hp-=5;if(blk.hp<=0){blk.removed=true;killBlock(blk);}}
    }
  });
  pigs.forEach(function(p){
    if(!p.removed){
      var dx=p.position.x-bx,dy=p.position.y-by,d=Math.sqrt(dx*dx+dy*dy);
      if(d<r){p.removed=true;killPig(p);}
    }
  });
}

function activateBoomerang(){
  // White bird: creates a returning projectile
  var bx=bird.position.x,by=bird.position.y;
  var speed=Math.sqrt(bird.velocity.x*bird.velocity.x+bird.velocity.y*bird.velocity.y);
  var dir=bird.velocity.x>=0?1:-1;
  var nb=Bodies.circle(bx,by,BIRD_DEFS.white.radius,{
    render:{fillStyle:BIRD_DEFS.white.color},
    density:BIRD_DEFS.white.density,
    label:'boomerang',
    restitution:0.8
  });
  Body.setStatic(nb,false);
  Body.setVelocity(nb,{x:dir*speed*1.5,y:-Math.abs(speed)});
  Composite.add(engine.world,nb);
  boomerangBirds.push({body:nb,type:'white',dead:false,spinAngle:0,returnTimer:60,dir:dir,startX:bx});
  Composite.remove(engine.world,bird);
  bird=null;
}

function updateBoomerangBirds(){
  boomerangBirds.forEach(function(bb){
    if(bb.dead||!bb.body) return;
    bb.spinAngle+=0.3;
    bb.returnTimer--;
    // Check if should return
    var dx=bb.body.position.x-bb.startX;
    if((bb.dir>0&&dx>150)||(bb.dir<0&&dx<-150)||bb.returnTimer<=0){
      // Return towards slingshot
      var tx=SLING_X,ty=SLING_Y;
      var vx=(tx-bb.body.position.x)*0.05;
      var vy=(ty-bb.body.position.y)*0.05-2;
      Body.setVelocity(bb.body,{x:vx,y:vy});
    }
    // Check collision with blocks/pigs while returning
    if(bb.body.position.y>GROUND_Y-50){
      bb.dead=true;
      Composite.remove(engine.world,bb.body);
    }
  });
  boomerangBirds=boomerangBirds.filter(function(bb){return !bb.dead;});
}

function handleCollision(e){
  e.pairs.forEach(function(pair){
    var a=pair.bodyA,b=pair.bodyB;
    var spd=Math.hypot(a.velocity.x-b.velocity.x,a.velocity.y-b.velocity.y);
    if(spd<2) return;
    // Bird hits pig
    if((a.label==='bird'&&b.label==='pig')||(b.label==='bird'&&a.label==='pig')){
      var pig=a.label==='pig'?a:b;
      var brd=a.label==='bird'?a:b;
      if(!pig.removed){
        pig.removed=true;
        killPig(pig);
        // Trigger bird ability on hit
        if(!abilityUsed){
          abilityUsed=true;
          triggerBirdAbility(brd);
        }
      }
    }
    // Bird hits block
    if((a.label==='bird'&&b.label==='block')||(b.label==='bird'&&a.label==='block')){
      var blk=a.label==='block'?a:b;
      var brd=a.label==='bird'?a:b;
      if(spd>3&&!blk.removed&&blk.hp){
        playSound('hit');
        blk.hp-=2; // Increased damage from 1 to 2
        spawnParticles(blk.position.x,blk.position.y,TYPES[blk.blockType].color,6);
        if(blk.hp<=0){blk.removed=true;killBlock(blk);}
        // Trigger ability on impact (black bird explodes on block hit)
        if(!abilityUsed){
          abilityUsed=true;
          triggerBirdAbility(brd);
        }
      }
    }
    // Boomerang collisions
    if((a.label==='boomerang'&&b.label==='pig')||(b.label==='boomerang'&&a.label==='pig')){
      var pig=a.label==='pig'?a:b;
      if(!pig.removed){pig.removed=true;killPig(pig);}
    }
    if((a.label==='boomerang'&&b.label==='block')||(b.label==='boomerang'&&a.label==='block')){
      var blk=a.label==='block'?a:b;
      if(spd>3&&!blk.removed&&blk.hp){
        blk.hp--;
        if(blk.hp<=0){blk.removed=true;killBlock(blk);}
      }
    }
  });
}

function triggerBirdAbility(brd){
  playSound('skill');
  var ab=BIRD_DEFS[currentBirdType].ability;
  if(ab==='speedBoost'){
    Body.setVelocity(bird,{x:bird.velocity.x*2.0,y:bird.velocity.y*0.8});
    spawnParticles(bird.position.x,bird.position.y,'#FDD835',12);
  }
  else if(ab==='split'){
    // Don't split mini birds to prevent infinite recursion
    var isMini=false;
    miniBirds.forEach(function(mb){if(mb.body===brd)isMini=true;});
    if(!isMini) splitBird();
  }
  else if(ab==='explode'){
    explodeBird();
  }
  else if(ab==='groundPound'){
    Body.setVelocity(bird,{x:bird.velocity.x,y:Math.abs(bird.velocity.y)*2.2});
    spawnParticles(bird.position.x,bird.position.y,'#E53935',15);
  }
  else if(ab==='boomerang'){
    activateBoomerang();
  }
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
  playSound('pig');
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
  playSound('block');
}

function gameLoop(){
  if(!worldStable) return;
  updateBoomerangBirds();
  // Update miniBirds
  miniBirds.forEach(function(mb){
    if(mb.dead||!mb.body) return;
    mb.flightTime++;
    // Remove miniBird after 8 seconds or if goes off right side (more generous)
    if(mb.flightTime>480||mb.body.position.x>W+50){
      mb.dead=true;
      Composite.remove(engine.world,mb.body);
    }
  });
  miniBirds=miniBirds.filter(function(mb){return !mb.dead;});
  if(!bird||!launched) return;
  birdFlightTime++;
  var speed=Math.hypot(bird.velocity.x,bird.velocity.y);
  
  // Remove bird only if: off right side, OR hit very low AND very slow, OR very long flight
  // This is very permissive - only removes when clearly done
  var offRight = (bird.position.x > W + 100);
  var veryLow = (bird.position.y > H - 20); // Only remove if past bottom of screen
  var stopped = (speed < 0.3);
  var tooLong = (birdFlightTime > 720); // 12 seconds max (very generous)
  
  // ONLY remove when bird goes OFF RIGHT side of screen (most conservative)
  // This prevents any mid-flight disappearances
  if(bird.position.x > W + 100){
    Composite.remove(engine.world,bird);
    bird=null;
    birdStillFrames=0;
    birdFlightTime=0;
    // Immediate spawn if pigs remain and more birds available
    if(pigs.length>0&&birdsLeft>0){
      setTimeout(spawnBird,500);
    } else if(pigs.length>0){
      scheduleCheckState();
    }
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
  stopMusic();
  playSound('win');
  // Save high score and unlock next level
  var isNewRecord=!highScores[currentLevel]||score>highScores[currentLevel];
  if(!highScores[currentLevel]||score>highScores[currentLevel]){
    highScores[currentLevel]=score;
  }
  // Submit to leaderboard
  submitScore(currentLevel,score);
  var newUnlocked=currentLevel+1;
  if(newUnlocked>unlockedLevel&&newUnlocked<=LEVELS.length){
    unlockedLevel=newUnlocked;
  }
  saveProgress();
  var ov=document.getElementById('overlay');
  var st=getStars(score);
  var starsStr='⭐'.repeat(st);
  var bestScore=highScores[currentLevel]||score;
  var rank=getMyRank(currentLevel,score);
  var shareBtn='<button class="btn" onclick="downloadShareCard()" style="background:#4CAF50;margin:5px;">📤 分享成绩</button>';
  var rankBtn='<button class="btn" onclick="showLeaderboard()" style="background:#2196F3;margin:5px;">🏆 排行榜</button>';
  if(currentLevel>=LEVELS.length){
    ov.innerHTML='<h1>🎉 通关!</h1><p>得分: '+score+' '+starsStr+'</p><p style="color:#FFD700;">最高: '+bestScore+'</p>'+(isNewRecord?'<p style="color:#4CAF50;">🎉 新纪录!</p>':'<p style="color:#888;">排名: 第'+rank+'名</p>')+'<div style="margin-top:15px;">'+shareBtn+rankBtn+'</div><button class="btn" onclick="location.reload()" style="margin-top:10px;">再玩一次</button>';
  } else {
    ov.innerHTML='<h1>✅ 过关!</h1><p>得分: '+score+' '+starsStr+'</p><p style="color:#FFD700;">最高: '+bestScore+'</p>'+(isNewRecord?'<p style="color:#4CAF50;">🎉 新纪录!</p>':'<p style="color:#888;">排名: 第'+rank+'名</p>')+'<div style="margin-top:15px;">'+shareBtn+rankBtn+'</div><button class="btn btn-blue" onclick="nextLevel()" style="margin-top:10px;">下一关</button><button class="btn" onclick="location.reload()">选关</button>';
  }
  ov.classList.remove('hidden');
}

function levelFail(){
  if(gameState!=='playing') return;
  gameState='fail';
  stopMusic();
  playSound('fail');
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
  document.getElementById('levelName').textContent='第 '+currentLevel+' 关 - '+LEVELS[currentLevel-1].name;
  document.getElementById('score').textContent='得分: '+score;
  var container=document.getElementById('birdsLeft');
  container.innerHTML='';
  var lv=LEVELS[currentLevel-1];
  for(var i=0;i<totalBirds;i++){
    var div=document.createElement('div');
    div.className='bird-icon'+(i>=birdsLeft?' used':'');
    var birdType=lv.birds[i];
    div.style.background=BIRD_DEFS[birdType].color;
    container.appendChild(div);
  }
}

window.onload=initGame;
