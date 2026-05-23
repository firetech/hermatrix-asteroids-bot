import SocketEmulator from "./common/socketemul.js";
import {Wrapper as AsteroidsServer} from "./common/main.js";
import {GameState, IsGameState, IsStoppedState} from './common/common.js';
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

function startup() {
  socket = new SocketEmulator();
  new AsteroidsServer(socket);
  bot = new Bot(socket);
  configureSocket();
  setTimeout(init, 25);
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
