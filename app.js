const fs = require('fs');
const {ipcRenderer} = require('electron');
const tf = require('@tensorflow/tfjs-node');
const posenet = require('@tensorflow-models/posenet');
const OSC = require('osc-js');

var osc;

const Stats = require('stats.js');
var stats = new Stats();
stats.showPanel( 0 );
document.body.appendChild( stats.dom );

var settings = JSON.parse(fs.readFileSync("settings.json", "utf8"));

function openOSC(){
  osc = new OSC({ plugin: new OSC.DatagramPlugin({
    send:{
      host: settings.host,
      port: settings.port,
    }
  }) });
  osc.open();
}

openOSC(settings.host,settings.port)



var camera = document.getElementById('camera');
var inputCanvas = document.createElement("canvas");
var debugCanvas = document.createElement("canvas");
var messageDiv = document.createElement("div");

document.body.appendChild(debugCanvas);

camera.style.position = "absolute";
camera.style.left = "0px";
camera.style.top = "0px";

debugCanvas.style.position = "absolute";
debugCanvas.style.left = "0px";
debugCanvas.style.top = "0px";

messageDiv.style.width = "100%";
messageDiv.style.position = "absolute";
messageDiv.style.left = "0px";
messageDiv.style.bottom = "0px";
messageDiv.style.backgroundColor = "rgba(0,0,0,0.4)";
messageDiv.style.color = "white";
messageDiv.style.fontFamily = "monospace"
document.body.appendChild(messageDiv);


var audio = document.createElement("audio");
audio.controls = "controls";
audio.loop = "loop";
audio.autoplay = "autoplay";
audio.volume = "0.001";
var source = document.createElement("source");
source.src = "https://www.w3schools.com/html/horse.mp3";
audio.appendChild(source);
audio.style.position = "absolute";
audio.style.left = "200px";
audio.style.top = "0px";
audio.style.display = "none";
document.body.appendChild(audio);

var net = undefined;

var testImage = undefined;
var testImageUrl = "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Rembrandt_-_The_Anatomy_Lesson_of_Dr_Nicolaes_Tulp.jpg/637px-Rembrandt_-_The_Anatomy_Lesson_of_Dr_Nicolaes_Tulp.jpg";
var frameCount = 0;

navigator.mediaDevices.getUserMedia({video: true})
  .then(function(stream) {
    camera.srcObject = stream;
  }).catch(function() {
    alert('could not connect stream');
});

function generateGUI(){
  var div = document.createElement("div");
  div.style.color="white";
  div.style.fontFamily="monospace";
  var d = document.createElement("div");
  d.innerHTML = "SETTINGS";
  d.style.backgroundColor = "rgba(0,0,0,0.3)"
  div.appendChild(d);

  for (var k in settings){
    var d = document.createElement("div")
    var lbl = document.createElement("span");
    lbl.innerHTML = k;

    if (typeof(settings[k]) == 'boolean'){
      var cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = settings[k];
      
      ;(function(){
        var _k = k;
        var _cb = cb;
        _cb.onclick = function(){
          settings[_k] = _cb.checked;
        }
      })();
      d.appendChild(cb);
      d.appendChild(lbl);
    }else if (typeof (settings[k]) == 'string'){
      var inp = document.createElement("input");
      inp.value = settings[k];
      inp.style.backgroundColor = "rgba(0,0,0,0.3)";
      inp.style.color = "white";
      inp.style.fontFamily = "monospace";
      inp.style.border = "1px solid black";

      ;(function(){
        var _k = k;
        var _inp = inp;
        _inp.onkeypress = function(){
          if (event.key == "Enter"){
            settings[_k] = _inp.value;
          }
        }
      })();
      d.appendChild(lbl);
      d.appendChild(inp);
    }
    
    d.style.borderBottom = "1px solid black";
    div.appendChild(d);
  }
  document.body.appendChild(div);
  div.style.position = "absolute";
  div.style.left = "0px";
  div.style.top = "50px";
  div.style.backgroundColor = "rgba(0,0,0,0.5)"
}

generateGUI();

function drawPose(pose,color="white"){
  var ctx = debugCanvas.getContext('2d');
  for (var i = 0; i < pose.keypoints.length; i++){
    var p = pose.keypoints[i].position
    ctx.fillStyle=color;
    ctx.fillRect(p.x-5,p.y-5,10,10);
    ctx.fillStyle="yellow";
    ctx.fillText(("0"+i).substr(-2)+" "+pose.keypoints[i].part,p.x+5,p.y-5);
  }
  const adj = [
    [0,1],[0,2],[1,3],[2,4],        //face
    [5,6],[11,12],[5,11],[6,12],    //body
    [5,7],[7,9],[6,8],[8,10],       //arms
    [11,13],[13,15],[12,14],[14,16],//legs
  ]
  const minConf = 0.5
  adj.forEach(([i,j]) => {
    if (pose.keypoints[i] < minConf || pose.keypoints[j] < minConf ){
      return;
    }
    ctx.beginPath();
    ctx.moveTo(pose.keypoints[i].position.x, pose.keypoints[i].position.y);
    ctx.lineTo(pose.keypoints[j].position.x, pose.keypoints[j].position.y);
    ctx.lineWidth = 2;
    ctx.strokeStyle = color;
    ctx.stroke();
  });
}

function sendPosesADDR(poses){
  osc.send(new OSC.Message('/videoWidth',camera.videoWidth));
  osc.send(new OSC.Message('/videoHeight',camera.videoHeight));
  osc.send(new OSC.Message('/nPoses',poses.length));
  for (var i = 0; i < poses.length; i++){
    osc.send(new OSC.Message('/poses/'+i+"/score",poses[i].score))
    for (var j = 0; j < poses[i].keypoints.length; j++){
      var kpt = poses[i].keypoints[j];
      var pth = '/poses/'+i+"/keypoints/"+kpt.part+"/";
      osc.send(new OSC.Message(pth+"position",kpt.position.x,kpt.position.y));
      osc.send(new OSC.Message(pth+"score",kpt.score));
    }
  }
}

function sendPosesXML(poses){
  function rd(n){
    return Math.round(n*100)/100
  }
  var result = `<poses videoWidth="${camera.videoWidth}" videoHeight="${camera.videoHeight}" nPoses="${poses.length}">`;
  for (var i = 0; i < poses.length; i++){
    result += `<pose score="${rd(poses[i].score)}">`
    for (var j = 0; j < poses[i].keypoints.length; j++){
      var kpt = poses[i].keypoints[j];
      result += `<keypoint part="${kpt.part}" x="${rd(kpt.position.x)}" y="${rd(kpt.position.y)}" score="${rd(kpt.score)}"/>`
    }
    result += "</pose>"
  }
  result += `</poses>`

  osc.send(new OSC.Message("/poses/xml",result));
}

function sendPosesJSON(poses){
  osc.send(new OSC.Message("/poses/json",JSON.stringify(poses)));
}


async function estimateFrame() {
  stats.begin();
  if (osc.options.plugin.options.send.host != settings.host
    ||osc.options.plugin.options.send.port != settings.port){
    openOSC();
  }

  if (settings.audioHack && audio.paused){
    audio.play();
  }
  if (!settings.audioHack && !audio.paused){
    audio.pause();
  }

  var ictx = inputCanvas.getContext('2d');
  var dctx = debugCanvas.getContext('2d');
  dctx.clearRect(0,0,dctx.canvas.width,dctx.canvas.height);
  
  if (settings.useTestImage){
    if (!testImage){
      testImage = new Image;
      testImage.src = testImageUrl;
    }
    if (testImage.complete){
      var x = Math.sin(frameCount*0.1)*20
      ictx.drawImage(testImage,x,0);
      dctx.drawImage(testImage,x,0);
    }
  }else{
    ictx.drawImage(camera,0,0);
  }
  var poses = [];
  if (settings.multiplePoses){
    poses = await net.estimateMultiplePoses(inputCanvas, {
      flipHorizontal: false
    });
  }else{
    poses[0]= await net.estimateSinglePose(inputCanvas, {
      flipHorizontal: false
    });
  }

  if (settings.format == "XML"){
    sendPosesXML(poses);
  }else if (settings.format == "JSON"){
    sendPosesJSON(poses);
  }else if (settings.format == "ADDR"){
    sendPosesADDR(poses);
  }

  messageDiv.innerHTML = ["/","-","\\","|"][frameCount%4]+" Detected "+poses.length+" pose(s), sending to "
    +osc.options.plugin.options.send.host+":"
    +osc.options.plugin.options.send.port;

  poses.forEach((pose,i)=>{
    drawPose(pose,["white","cyan","magenta","yellow"][i%5]);
  })

  stats.end();

  // setTimeout(estimateFrame,1);
  // requestAnimationFrame(estimateFrame);
  frameCount++;
}

messageDiv.innerHTML = "Initializing app..."
camera.onloadeddata = function(){
  messageDiv.innerHTML = "Camera loaded. Loading PoseNet..."
  var [w,h] = [camera.videoWidth, camera.videoHeight];

  console.log(w,h);

  inputCanvas.width = w;
  inputCanvas.height = h;

  debugCanvas.width = w;
  debugCanvas.height = h;

  ipcRenderer.send('resize', w, h);

  posenet.load(settings.poseNetConfig).then(function(_net){
    messageDiv.innerHTML = "All loaded."
    net = _net;
    setInterval(estimateFrame,5);
  });
}

document.body.addEventListener("keypress", function(){
  if (event.key == 'x'){
    ipcRenderer.send('float');
  }
})
