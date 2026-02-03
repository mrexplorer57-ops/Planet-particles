const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const video = document.getElementById("video");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

const cx = () => canvas.width/2;
const cy = () => canvas.height/2;

let particles = [];
let textTargets = [];
let extraStars = [];
let mode = "planet";
let lastGestureTime = 0;

// ---------------- PARTICLE ----------------
class Particle {
  constructor(angle,radius,color){
    this.angle = angle;
    this.radius = radius;
    this.color = color || `hsl(${Math.random()*360},80%,70%)`;
    this.x = cx() + Math.cos(angle)*radius;
    this.y = cy() + Math.sin(angle)*radius;
    this.tx = this.x;
    this.ty = this.y;
    this.size = Math.random()*2+1;
    this.speed = 0.002 + Math.random()*0.003;
  }
  update(){
    if(mode==="planet"){
      this.angle += this.speed;
      this.x = cx() + Math.cos(this.angle)*this.radius;
      this.y = cy() + Math.sin(this.angle)*this.radius;
    } else if(mode==="text"){
      this.x += (this.tx - this.x)*0.08;
      this.y += (this.ty - this.y)*0.08;
    }
  }
  draw(){
    ctx.fillStyle = this.color;
    ctx.globalAlpha = 0.4 + Math.random()*0.6;
    ctx.beginPath();
    ctx.arc(this.x,this.y,this.size,0,Math.PI*2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

// ---------------- EXTRA STAR ----------------
class Star{
  constructor(x,y){
    this.x = x + (Math.random()*20-10);
    this.y = y + (Math.random()*20-10);
    this.size = Math.random()*2+1;
    this.life = 0;
    this.maxLife = 30 + Math.random()*20;
    this.color = `hsl(${Math.random()*360},90%,80%)`;
  }
  update(){ this.life++; }
  draw(){
    ctx.globalAlpha = 1 - this.life/this.maxLife;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x,this.y,this.size,0,Math.PI*2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

// ---------------- INIT PLANET ----------------
function initPlanet(){
  particles = [];
  const R = 140;
  for(let i=0;i<800;i++){
    const a = Math.random()*Math.PI*2;
    const r = R + Math.random()*40;
    particles.push(new Particle(a,r));
  }
}
initPlanet();

// ---------------- TEXT MORPH + SPARKLE ----------------
function morphToText(text){
  const temp = document.createElement("canvas");
  temp.width = canvas.width;
  temp.height = canvas.height;
  const tctx = temp.getContext("2d");

  tctx.clearRect(0,0,temp.width,temp.height);
  tctx.font = "bold 64px Arial";
  tctx.textAlign = "center";
  tctx.textBaseline = "middle";
  tctx.fillStyle = "white";
  tctx.fillText(text, cx(), cy());

  const data = tctx.getImageData(0,0,temp.width,temp.height).data;
  textTargets = [];
  for(let y=0;y<temp.height;y+=6){
    for(let x=0;x<temp.width;x+=6){
      const idx = (y*temp.width+x)*4+3;
      if(data[idx]>150) textTargets.push({x,y});
    }
  }

  particles.forEach((p,i)=>{
    const t = textTargets[i % textTargets.length];
    p.tx = t.x;
    p.ty = t.y;
  });

  // create extra sparkle stars
  extraStars = [];
  for(let i=0;i<60;i++){
    const t = textTargets[Math.floor(Math.random()*textTargets.length)];
    extraStars.push(new Star(t.x,t.y));
  }

  mode="text";

  // linger 3.5 sec then back to planet
  setTimeout(()=>{mode="planet";initPlanet();},3500);
}

// ---------------- GESTURE DETECTION ----------------
function detectGesture(lm){
  const iUp = lm[8].y < lm[6].y - 0.03;
  const mUp = lm[12].y < lm[10].y - 0.03;
  const rUp = lm[16].y < lm[14].y - 0.03;

  if(iUp && mUp && !rUp) return "v";
  if(iUp && mUp && rUp) return "open";
  if(!iUp && !mUp && !rUp) return "fist";
  return "";
}

// ---------------- MEDIAPIPE ----------------
const hands = new Hands({ locateFile: f=>`https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}` });
hands.setOptions({ maxNumHands:1, modelComplexity:0, minDetectionConfidence:0.6, minTrackingConfidence:0.6 });

hands.onResults(results=>{
  if(!results.multiHandLandmarks.length) return;
  const g = detectGesture(results.multiHandLandmarks[0]);
  const now = Date.now();
  if(g && now - lastGestureTime > 1500){
    lastGestureTime = now;
    if(g==="v") morphToText("You’re kinda special ✨");
    if(g==="open") morphToText("Hey… smile 😊");
    if(g==="fist") morphToText("This is for you ❤️");
  }
});

const cameraMP = new Camera(video,{
  onFrame: async()=>await hands.send({image:video}),
  width:640,height:480
});
cameraMP.start();

// ---------------- ANIMATION ----------------
function animate(){
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // planet glow
  const grad = ctx.createRadialGradient(cx(),cy(),60,cx(),cy(),180);
  grad.addColorStop(0,"rgba(120,200,255,0.4)");
  grad.addColorStop(1,"transparent");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx(),cy(),180,0,Math.PI*2);
  ctx.fill();

  // draw particles
  particles.forEach(p=>{p.update();p.draw();});

  // draw extra stars
  extraStars.forEach((s,i)=>{
    s.update();
    s.draw();
    if(s.life>s.maxLife) extraStars.splice(i,1);
  });

  requestAnimationFrame(animate);
}
animate();
