var audioCtx;

const DRONE_NUM = 3;
const SOUND_NUM = 2;
var soundReady = false;
var soundLoadedNum = 0;
var sound1Req, sound1Buf;
var sound2Req, sound2Buf;
var srcNode = new Array(DRONE_NUM);
var gainNode = new Array(DRONE_NUM);
var panNode = new Array(DRONE_NUM);

const READ_INTERVAL = 10;

var elmById = function (id) {
  return document.getElementById(id);
}

var init = function () {
  setInterval(readGamepads, READ_INTERVAL);
}

var start = function () {
  // audio
  window.AudioContext = window.AudioContext || window.webkitAudioContext;
  audioCtx = new AudioContext();
  loadAudio();
  // input
  var elms = document.querySelectorAll('[type=range]');
  for (var i = 0; i < elms.length; i++) {
    elms[i].addEventListener("input", guiUpdated, false);
  }
  // try to start
  elmById('start').style.display = 'none';
  elmById('stop').style.display = 'inline';
  elmById('loading').style.display = 'inline';
  startAudio();
}

var loadAudio = function () {
  console.log('loadAudio');
  // sound for roll/pitch/yaw
  sound1Req = new XMLHttpRequest();
  sound1Req.responseType = 'arraybuffer';
  sound1Req.onload = function () {
    var res = sound1Req.response;
    audioCtx.decodeAudioData(res, function (buf) {
      sound1Buf = buf;
      soundLoadedNum++;
      console.log('sound1 loaded');
      if (soundLoadedNum == SOUND_NUM) {
        routeAudio();
      }
    });
  };
  sound1Req.open('GET', 'media/sound1.wav', true);
  sound1Req.send();
  // sound for throttle
  sound2Req = new XMLHttpRequest();
  sound2Req.responseType = 'arraybuffer';
  sound2Req.onload = function () {
    var res = sound2Req.response;
    audioCtx.decodeAudioData(res, function (buf) {
      sound2Buf = buf;
      soundLoadedNum++;
      console.log('sound2 loaded');
      if (soundLoadedNum == SOUND_NUM) {
        routeAudio();
      }
    });
  };
  sound2Req.open('GET', 'media/sound2.wav', true);
  sound2Req.send();
}

var routeAudio = function () {
  console.log('routeAudio');
  for (var i = 0; i < DRONE_NUM; i++) {
    srcNode[i] = [];
    gainNode[i] = [];
    panNode[i] = [];
    for (var j = 0; j < SOUND_NUM; j++) {
      // pan
      panNode[i][j] = audioCtx.createPanner();
      panNode[i][j].setPosition(0, 0, 0);
      panNode[i][j].connect(audioCtx.destination);
      // gain
      gainNode[i][j] = audioCtx.createGain();
      gainNode[i][j].gain.value = 0;
      gainNode[i][j].connect(panNode[i][j]);
      // source
      srcNode[i][j] = audioCtx.createBufferSource();
      if (j == 0) {
        srcNode[i][j].buffer = sound1Buf;
      } else {
        srcNode[i][j].buffer = sound2Buf;
      }
      srcNode[i][j].loop = true;
      srcNode[i][j].playbackRate.value = 1;
      srcNode[i][j].connect(gainNode[i][j]);
    }
  }
  soundReady = true;
}

var startAudio = function () {
  console.log('startAudio');
  if (soundReady == false) {
    console.log('..retry');
    setTimeout(startAudio, 100);
    return;
  }
  elmById('loading').style.display = 'none';
  // audio
  for (var i = 0; i < DRONE_NUM; i++) {
    for (var j = 0; j < SOUND_NUM; j++) {
      srcNode[i][j].start();
    }
  }
}

var readGamepads = function () {
  var list = navigator.getGamepads();
   for (var i = 0; i < list.length; i++) {
    var pad = list[i];
    if (pad == null || pad.axes == null) {
      continue;
    }
    var s1val = 0;
    var s2val = 0;
    for (var j = 0; j < pad.axes.length; j++) {
      switch (j) {
      case 0:
        // roll
        s2val = Math.max(s2val, Math.abs(pad.axes[j]));
        updateSlider(i, 0, pad.axes[j]);
        break;
      case 1:
        // pitch
        s2val = Math.max(s2val, Math.abs(pad.axes[j]));
        updateSlider(i, 1, pad.axes[j]);
        break;
      case 2:
        // throttle
        s1val = (pad.axes[j] + 1) / 2;
        updateSlider(i, 2, pad.axes[j]);
        break;
      case 4:
        // yaw (not 3)
        s2val = Math.max(s2val, Math.abs(pad.axes[j]));
        updateSlider(i, 3, pad.axes[j]);
        break;
      }
    }
    updateSound(i, 0, s1val);
    updateSound(i, 1, s2val);
  }
}

var updateSlider = function (pad, axe, val) {
  elmById(pad + '-' + axe).value = val;
}

var updateSound = function (pad, snd, val) {
  if (soundReady == false || pad >= DRONE_NUM) {
    return;
  }
  if (snd == 0) {
    // throttle
    srcNode[pad][0].playbackRate.value = 1 + (val * 8);
    gainNode[pad][0].gain.value = (val < 0.1) ? 0 : val;
  } else {
    // roll, pitch, yaw
    srcNode[pad][1].playbackRate.value = 1 + (val * 4);
    gainNode[pad][1].gain.value = (val < 0.1) ? 0 : val;
  }
}

var guiUpdated = function () {
  if (soundReady == false) {
    return;
  }
  for (var i = 0; i < DRONE_NUM; i++) {
    var s1val = 0;
    var s2val = 0;
    var tmp = 0;
    // roll
    tmp = parseFloat(elmById(i + '-' + 0).value);
    s2val = Math.max(s2val, Math.abs(tmp));
    // pitch
    tmp = parseFloat(elmById(i + '-' + 1).value);
    s2val = Math.max(s2val, Math.abs(tmp));
    // throttle
    tmp = parseFloat(elmById(i + '-' + 2).value);
    s1val = (tmp + 1) / 2;
    // yaw
    tmp = parseFloat(elmById(i + '-' + 3).value);
    s2val = Math.max(s2val, tmp);
    updateSound(i, 0, s1val);
    updateSound(i, 1, s2val);
  }
}