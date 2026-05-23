import standaloneSocketInit from "./standalone.js";
import {GameState, IsGameState, IsStoppedState} from "./common/common.js";
import {DrawGL2} from "./drawgl.js";
import Bot from "./bot-logic.js";
$(document).ready(() => {
  console.log("init");
  const socket = standaloneSocketInit();
  const bot = new Bot(socket);
  const container = document.getElementById("canvas_container");
  const canvas = document.getElementById("canvas");
  const autorestart = document.getElementById("autorestart");
  const ctx = canvas.getContext("webgl2");
  const start = document.getElementById("start");
  const score = document.getElementById("score");
  let lastVisibilityChangedTimestamp = 0;
  var resizeId;
  const drawObj = new DrawGL2(canvas, ctx, bot.isEnabled());
  let lastGameState = GameState.Stopped;
  let gameState = GameState.Stopped;
  startup();
  function startup() {
    drawObj.init();
    configureSocket();
    setTimeout(init, 25);
  }
  function draw() {
    drawObj.draw();
    setTimeout(draw, 16);
  }
  function init() {
    console.log("do init");
    drawObj.clearData();
    socket.emit("ast.init", window.innerWidth - 50, window.innerHeight - 50);
  }
  function configureSocket() {
    socket.on("ast.tick", (serverdata) => {
      gameState = serverdata.state;
      drawObj.setData(serverdata);
      bot.tick(serverdata, drawObj);
      if (IsGameState(gameState)) {
        score.textContent = serverdata.score + "";
      }
      if (gameState == GameState.Dead && lastGameState != GameState.Dead) {
        bot.dead();
        showRestart();
      }
      lastGameState = gameState;
    });
    socket.on("ast.error", (what) => {
      alert(what);
    });
    socket.on("ast.initialized", (width, height, scale_factor) => {
      console.log("game initialized " + width + "/" + height + "/" + scale_factor);
      canvas.width = width;
      canvas.height = height;
      const padding = (window.innerWidth - width - 10) / 2;
      canvas.style.left = padding + "px";
      score.style.left = canvas.style.left;
      start.style.left = (width - start.clientWidth) / 2 + padding + "px";
      start.style.top = (height - start.clientHeight) / 2 + "px";
      drawObj.clearData();
      if (gameState == GameState.Dead) {
        gameState = GameState.Stopped;
        setTimeout(() => {
          socket.emit("ast.start");
        }, 250);
      }
      draw();
      if (container.style.visibility != "visible") {
        container.style.visibility = "visible";
        start.style.visibility = "visible";
      }
    });
  }
  const allowedKeys = new Set();
  allowedKeys.add("ArrowUp");
  allowedKeys.add("ArrowRight");
  allowedKeys.add("ArrowDown");
  allowedKeys.add("ArrowLeft");
  allowedKeys.add("Space");
  $(window).keydown(function(event) {
    const key = event.code;
    if (!allowedKeys.has(key)) {
      return;
    }
    socket.emit("ast.keydown", key);
  });
  $(window).keyup(function(event) {
    const key = event.code;
    if (!allowedKeys.has(key)) {
      return;
    }
    socket.emit("ast.keyup", key);
  });
  $("#start").on("click", () => {
    $("#start").hide();
    if (gameState == GameState.Dead) {
      init();
    } else {
      socket.emit("ast.start");
    }
  });
  $("#bot").on("change", (e) => {
    bot.setEnabled(e.target.checked);
    drawObj.setDebug(e.target.checked);
  });
  function showRestart() {
    if (autorestart.checked) {
      start.innerText = "RESTARTING IN 2s...";
      setTimeout(() => start.click(), 2000);
    } else {
      start.innerText = "RESTART";
    }
    $("#start").show();
  }
});
