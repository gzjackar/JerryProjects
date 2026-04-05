// ============================================
// 🐷 PIG DEFENSE MODE - 猪猪生存战
// ============================================

var pigDefense = {
  active: false,
  pig: null,
  obstacles: [],
  incomingBirds: [],
  miniBirds: [],
  survivalTime: 0,
  score: 0,
  obstaclesLeft: 5,
  lastBirdTime: 0,
  birdInterval: 3000,
  keys: {left: false, right: false},
  pigSpeed: 8
};

function startPigDefense() {
  pigDefense.active = true;
  pigDefense.survivalTime = 0;
  pigDefense.score = 0;
  pigDefense.obstaclesLeft = 5;
  pigDefense.lastBirdTime = Date.now();
  pigDefense.obstacles = [];
  pigDefense.incomingBirds = [];
  pigDefense.miniBirds = [];
  pigDefense.keys = {left: false, right: false};
  
  Composite.clear(engine.world);
  pigs = [];
  blocks = [];
  bird = null;
  miniBirds = [];
  boomerangBirds = [];
  
  var ground = Bodies.rectangle(W/2, GROUND_Y + 25, W, 50, {
    isStatic: true,
    render: { fillStyle: '#5D8233' },
    label: 'ground'
  });
  Composite.add(engine.world, ground);
  
  pigDefense.pig = Bodies.circle(W * 0.3, GROUND_Y - 30, 30, {
    render: { fillStyle: '#90EE90' },
    density: 0.001,
    friction: 0.5,
    label: 'pig',
    restitution: 0.3
  });
  Composite.add(engine.world, pigDefense.pig);
  
  createDefenseObstacle(W * 0.5, GROUND_Y - 40);
  createDefenseObstacle(W * 0.7, GROUND_Y - 40);
  
  gameState = 'pigDefense';
  updatePigDefenseUI();
  showPigDefenseHUD();
}

function createDefenseObstacle(x, y) {
  var types = ['wood', 'stone', 'glass'];
  var type = types[Math.floor(Math.random() * types.length)];
  var w = 60 + Math.random() * 40;
  var h = 15 + Math.random() * 10;
  
  var mat = MATERIALS[type];
  var obstacle = Bodies.rectangle(x, y, w, h, {
    isStatic: true,
    render: { fillStyle: mat.color },
    label: 'defenseBlock',
    friction: mat.friction,
    restitution: mat.restitution
  });
  obstacle.originalWidth = w;
  obstacle.originalHeight = h;
  obstacle.materialType = type;
  
  Composite.add(engine.world, obstacle);
  pigDefense.obstacles.push(obstacle);
}

function spawnDefenseBird() {
  if (!pigDefense.active || gameState !== 'pigDefense') return;
  
  var birdTypes = ['red', 'yellow', 'blue', 'black', 'white'];
  var type = birdTypes[Math.floor(Math.random() * birdTypes.length)];
  var def = BIRD_DEFS[type];
  
  var birdY = GROUND_Y - 50 - Math.random() * 150;
  var fbird = Bodies.circle(W + 50, birdY, def.radius, {
    render: { fillStyle: def.color },
    density: def.density,
    label: 'defenseBird',
    restitution: 0.4
  });
  
  // Store the bird type for ability handling
  fbird.birdType = type;
  fbird.flightTime = 0;
  fbird.hasSplit = false;
  fbird.willExplode = false;
  fbird.explosionTimer = null;
  
  // Black birds explode after 2 seconds of flight, not immediately
  if (type === 'black') {
    fbird.willExplode = true;
    fbird.explosionTimer = setTimeout(function() {
      if (pigDefense.active && fbird && !fbird.removed) {
        explodeDefenseBird(fbird);
      }
    }, 2000);
  }
  
  var speed = 8 + Math.random() * 4;
  Body.setVelocity(fbird, { x: -speed, y: (Math.random() - 0.5) * 4 });
  
  Composite.add(engine.world, fbird);
  pigDefense.incomingBirds.push(fbird);
  
  playSound('launch');
}

function splitDefenseBird(fbird) {
  if (fbird.hasSplit || fbird.removed) return;
  fbird.hasSplit = true;
  
  var type = fbird.birdType || 'blue';
  var def = BIRD_DEFS[type];
  
  for (var i = 0; i < 3; i++) {
    var mini = Bodies.circle(fbird.position.x, fbird.position.y, def.radius * 0.6, {
      render: { fillStyle: def.color },
      density: def.density * 0.5,
      label: 'defenseMiniBird',
      restitution: 0.4
    });
    
    var angle = (-60 + i * 60) * Math.PI / 180;
    var speed = 6 + Math.random() * 2;
    Body.setVelocity(mini, { 
      x: fbird.velocity.x * 0.5 + Math.cos(angle) * speed, 
      y: fbird.velocity.y * 0.5 + Math.sin(angle) * speed 
    });
    
    mini.flightTime = 0;
    mini.maxFlightTime = 120; // 2 seconds at 60fps
    mini.isMini = true;
    
    Composite.add(engine.world, mini);
    pigDefense.miniBirds.push(mini);
  }
  
  // Remove the parent blue bird after splitting
  Composite.remove(engine.world, fbird);
  pigDefense.incomingBirds = pigDefense.incomingBirds.filter(function(b) { return b !== fbird; });
}

function explodeDefenseBird(fbird) {
  if (!fbird || fbird.removed) return;
  
  var bx = fbird.position.x, by = fbird.position.y, r = 100;
  
  // Visual explosion
  for (var i = 0; i < 12; i++) {
    spawnParticles(bx, by, '#FF5722', 25);
  }
  
  playSound('skill');
  
  // Damage nearby obstacles
  pigDefense.obstacles.forEach(function(blk) {
    if (!blk.removed) {
      var dx = blk.position.x - bx, dy = blk.position.y - by;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d < r) {
        blk.hp = (blk.hp || 3) - 5;
        if (blk.hp <= 0) {
          blk.removed = true;
          Composite.remove(engine.world, blk);
        }
      }
    }
  });
  
  // Check if pig is in blast radius
  var pig = pigDefense.pig;
  if (pig) {
    var dx = pig.position.x - bx, dy = pig.position.y - by;
    var d = Math.sqrt(dx * dx + dy * dy);
    if (d < r) {
      endPigDefense();
      return;
    }
  }
  
  // Remove the bird
  fbird.removed = true;
  Composite.remove(engine.world, fbird);
  pigDefense.incomingBirds = pigDefense.incomingBirds.filter(function(b) { return b !== fbird; });
}

function updatePigDefense() {
  if (!pigDefense.active || gameState !== 'pigDefense') return;
  
  var pig = pigDefense.pig;
  if (!pig) return;
  
  // Move pig
  if (pigDefense.keys.left) {
    Body.setPosition(pig, { x: pig.position.x - pigDefense.pigSpeed, y: pig.position.y });
  }
  if (pigDefense.keys.right) {
    Body.setPosition(pig, { x: pig.position.x + pigDefense.pigSpeed, y: pig.position.y });
  }
  
  // Keep pig in bounds
  if (pig.position.x < 50) Body.setPosition(pig, { x: 50, y: pig.position.y });
  if (pig.position.x > W - 100) Body.setPosition(pig, { x: W - 100, y: pig.position.y });
  
  // Spawn birds periodically
  var now = Date.now();
  if (now - pigDefense.lastBirdTime > pigDefense.birdInterval) {
    spawnDefenseBird();
    pigDefense.lastBirdTime = now;
    // Speed up over time
    pigDefense.birdInterval = Math.max(1500, pigDefense.birdInterval - 50);
  }
  
  // Update mini birds - remove after maxFlightTime
  pigDefense.miniBirds = pigDefense.miniBirds.filter(function(mini) {
    if (!mini || mini.removed) return false;
    
    mini.flightTime++;
    
    // Remove mini birds after maxFlightTime
    if (mini.flightTime > mini.maxFlightTime || mini.position.x < -50 || mini.position.y > H + 50) {
      Composite.remove(engine.world, mini);
      return false;
    }
    return true;
  });
  
  // Update incoming birds
  pigDefense.incomingBirds = pigDefense.incomingBirds.filter(function(b) {
    if (!b || b.removed) return false;
    
    b.flightTime++;
    
    // Check collision with pig
    var dx = pig.position.x - b.position.x;
    var dy = pig.position.y - b.position.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist < 35) {
      endPigDefense();
      return false;
    }
    
    // Check collision with obstacles
    for (var i = 0; i < pigDefense.obstacles.length; i++) {
      var blk = pigDefense.obstacles[i];
      if (!blk || blk.removed) continue;
      
      var bx = b.position.x, by = b.position.y;
      var bDx = blk.position.x - bx, bDy = blk.position.y - by;
      var bDist = Math.sqrt(bDx * bDx + bDy * bDy);
      
      if (bDist < (b.circleRadius || 20) + 30) {
        // Bird hit obstacle - trigger ability
        var type = b.birdType || 'red';
        
        if (type === 'blue' && !b.hasSplit) {
          splitDefenseBird(b);
        } else if (type === 'black' && b.willExplode) {
          if (b.explosionTimer) clearTimeout(b.explosionTimer);
          explodeDefenseBird(b);
        } else {
          // Remove regular birds on impact
          b.removed = true;
          Composite.remove(engine.world, b);
        }
        return false;
      }
    }
    
    // Remove birds that went off screen
    if (b.position.x < -50 || b.position.y > H + 50) {
      if (b.explosionTimer) clearTimeout(b.explosionTimer);
      Composite.remove(engine.world, b);
      return false;
    }
    
    return true;
  });
  
  // Update survival time and score
  pigDefense.survivalTime += 1/60;
  pigDefense.score = Math.floor(pigDefense.survivalTime * 10);
  
  updatePigDefenseUI();
}

function createPigDefenseObstacle() {
  if (pigDefense.obstaclesLeft <= 0) return;
  
  var pig = pigDefense.pig;
  if (!pig) return;
  
  var x = pig.position.x + 80;
  var y = GROUND_Y - 30 - Math.random() * 50;
  
  createDefenseObstacle(x, y);
  pigDefense.obstaclesLeft--;
  
  playSound('block');
  updatePigDefenseUI();
}

function showPigDefenseHUD() {
  var ov = document.getElementById('overlay');
  var html = '<div style="text-align:center;color:white;padding:20px;">';
  html += '<h2 style="color:#90EE90;">🐷 猪猪生存战</h2>';
  html += '<p>← → 键移动猪猪</p>';
  html += '<p>空格键 创造障碍物</p>';
  html += '<p>存活越久分数越高！</p>';
  html += '<button class="btn" onclick="closePigDefenseHUD()" style="margin-top:20px;">开始游戏</button>';
  html += '</div>';
  ov.innerHTML = html;
  ov.classList.remove('hidden');
}

function closePigDefenseHUD() {
  document.getElementById('overlay').classList.add('hidden');
  document.getElementById('pigDefenseHUD').style.display = 'block';
  document.getElementById('birdsLeft').style.display = 'none';
}

function updatePigDefenseUI() {
  var hud = document.getElementById('pigDefenseHUD');
  if (!hud) return;
  hud.innerHTML = '<div style="color:white;text-align:center;font-size:16px;">⏱️ ' + Math.floor(pigDefense.survivalTime) + '秒 | 🏆 ' + pigDefense.score + '分 | 🧱 ' + pigDefense.obstaclesLeft + '个障碍物</div>';
}

function endPigDefense() {
  pigDefense.active = false;
  
  // Clear all explosion timers
  pigDefense.incomingBirds.forEach(function(b) {
    if (b.explosionTimer) clearTimeout(b.explosionTimer);
  });
  
  var finalScore = pigDefense.score;
  var finalTime = Math.floor(pigDefense.survivalTime);
  
  document.getElementById('pigDefenseHUD').style.display = 'none';
  document.getElementById('birdsLeft').style.display = 'flex';
  
  var ov = document.getElementById('overlay');
  var html = '<div style="text-align:center;color:white;padding:20px;">';
  html += '<h2 style="color:#FF6B6B;">💀 游戏结束</h2>';
  html += '<p>存活时间: <strong style="color:#FFD700">' + finalTime + '</strong> 秒</p>';
  html += '<p>最终得分: <strong style="color:#FFD700">' + finalScore + '</strong></p>';
  html += '<button class="btn" onclick="location.reload()" style="margin:5px;">返回菜单</button>';
  html += '<button class="btn" onclick="document.getElementById(\'overlay\').classList.add(\'hidden\');startPigDefense();" style="margin:5px;">再玩一次</button>';
  html += '</div>';
  ov.innerHTML = html;
  ov.classList.remove('hidden');
}

function onPigDefenseKeyDown(e) {
  if (!pigDefense.active || gameState !== 'pigDefense') return;
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') pigDefense.keys.left = true;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') pigDefense.keys.right = true;
  if (e.code === 'Space') { e.preventDefault(); createPigDefenseObstacle(); }
}

function onPigDefenseKeyUp(e) {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') pigDefense.keys.left = false;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') pigDefense.keys.right = false;
}

function showMenu() {
  var ov = document.getElementById('overlay');
  var h = '<h1 style="color:#FFD700;text-align:center;margin-bottom:30px;">🐦 愤怒的小鸟</h1>';
  h += '<div style="text-align:center;">';
  h += '<button class="btn" onclick="closeOverlay();startGame();" style="margin:10px;padding:15px 30px;font-size:18px;">🎮 经典模式</button>';
  h += '<br>';
  h += '<button class="btn" onclick="closeOverlay();startPigDefense