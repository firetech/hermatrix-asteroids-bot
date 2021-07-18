import {io} from 'socket.io-client';
import https from 'https';
import {GameState, IsGameState, IsStoppedState} from './common.js';
import Bot from "./bot-logic.js";


console.log('init');
let socket;
let bot;
let lastGameState = GameState.Stopped;
let gameState = GameState.Stopped;
let lastScore = -1;
let topScore = 0;
startup();


process.on('SIGINT', () => {
  console.log('exiting...');
  if (socket) {
    socket.close();
  }
  process.exit();
});

function httpget(url) {
  return new Promise((resolve, reject) => {
    https.get(`https://hermatrix.net${url}`, (resp) => {
      let data = '';

      resp.on('data', (chunk) => {
        data += chunk;
      });

      resp.on('end', () => {
        resolve(data);
      });

    }).on('error', (err) => {
      reject(err);
    });
  });
}
function startup() {
  getqaStaHnuqjay();
  httpget('/asteroids/quota')
    .then((data) => {
      console.log(data);
      if (data.trim() == 'allowed') {
        socket = io('https://hermatrix.net', {
          transports: [ 'websocket' ],
        });
        bot = new Bot(socket);
        socket.io.on('error', (err) => {
          console.error(err);
          process.exit();
        });
        configureSocket();
        setTimeout(init, 25);
      }
    });
}
function init() {
  console.log('do init');
  socket.emit('ast.init', 1184, 666);
}

function configureSocket() {
  socket.on('ast.tick', (serverdata) => {
    gameState = serverdata.state;
    if (IsGameState(gameState)) {
      bot.tick(serverdata);
      if (serverdata.score != lastScore) {
        if (serverdata.score > topScore) {
          topScore = serverdata.score;
        }
        console.log(`Score: ${serverdata.score} (${topScore})`);
        lastScore = serverdata.score;
      }
    }
    if (gameState == GameState.Dead && lastGameState != GameState.Dead) {
      console.log('RIP');
      bot.dead();
      lastScore = -1;
      setTimeout(init, 5000);
    }
    lastGameState = gameState;
    if (serverdata.global_score <= 0 && qaStaHnuqjayData == '') {
      getqaStaHnuqjay();
    }
  });
  socket.on("ast.error", (what) => {
    console.error(what);
    process.exit();
  });
  socket.on('ast.initialized', (width, height, scale_factor) => {
    console.log('game initialized ' + width + '/' + height + '/' + scale_factor);
    if (gameState == GameState.Dead || gameState == GameState.Stopped) {
      gameState = GameState.Stopped;
      setTimeout(() => {
        socket.emit('ast.start');
      }, 250);
    }
  });
}
function getqaStaHnuqjay() {
  return httpget('/asteroids/qaStaHnuqjay').then((data) => {
    console.log(`qaStaHnuqjay: ${data}`);
  });
}
