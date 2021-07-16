import {io} from "./socket.io.js";
import {GameState, IsGameState, IsStoppedState} from "./common.js";
import {DrawGL2} from "./drawgl.js";
import Bot from "./bot-logic.js";
$(document).ready(() => {
  console.log("init");
  var socket;
  const container = document.getElementById("canvas_container");
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("webgl2");
  const start = document.getElementById("start");
  const score = document.getElementById("score");
  const gscore = document.getElementById("global_score");
  const qaStaHnuqjay = document.getElementById("qaStaHnuqjay");
  let qaStaHnuqjayData = "";
  let lastVisibilityChangedTimestamp = 0;
  var resizeId;
  const drawObj = new DrawGL2(canvas, ctx);
  let lastGameState = GameState.Stopped;
  let gameState = GameState.Stopped;
  let bot;
  startup();
  function startup() {
    drawObj.loadAsteroidTemplates();
    drawObj.init();
    getqaStaHnuqjay().done(() => {
      qaStaHnuqjay.textContent = qaStaHnuqjayData;
    });
    $.ajax({
      url: "https://hermatrix.net/asteroids/quota",
      async: true,
      success: (data) => {
        if (data.trim() == "allowed") {
          socket = io("https://hermatrix.net");
          bot = new Bot(socket);
          configureSocket();
          setTimeout(init, 25);
        } else {
          $("#quota_container").show();
        }
      },
      error: (_) => {
      }
    });
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
        gscore.textContent = serverdata.global_score + "";
        score.textContent = serverdata.score + "";
      }
      if (gameState == GameState.Dead && lastGameState != GameState.Dead) {
        bot.dead();
        showRestart();
      }
      lastGameState = gameState;
      if (serverdata.global_score <= 0 && qaStaHnuqjayData == "") {
        getqaStaHnuqjay().done(() => {
          qaStaHnuqjay.textContent = qaStaHnuqjayData;
        });
      }
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
      gscore.style.right = canvas.style.left;
      score.style.left = canvas.style.left;
      start.style.left = (width - start.clientWidth) / 2 + padding + "px";
      start.style.top = (height - start.clientHeight) / 2 + "px";
      qaStaHnuqjay.style.left = start.style.left;
      qaStaHnuqjay.style.top = (height - start.clientHeight) / 2 + start.clientHeight + 25 + "px";
      qaStaHnuqjay.style.width = start.clientWidth + "px";
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
        qaStaHnuqjay.textContent = qaStaHnuqjayData;
      }
    });
  }
  function getqaStaHnuqjay() {
    return $.ajax({
      url: "https://hermatrix.net/asteroids/qaStaHnuqjay",
      async: true,
      success: (data) => {
        qaStaHnuqjayData = data.trim();
        ;
      },
      error: (_) => {
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
  function showRestart() {
    start.innerText = "RESTART";
    $("#start").show();
  }
});
