export var GameState;
(function(GameState2) {
  GameState2[GameState2["Stopped"] = 0] = "Stopped";
  GameState2[GameState2["Dead"] = 1] = "Dead";
  GameState2[GameState2["Running"] = 16] = "Running";
  GameState2[GameState2["Paused"] = 17] = "Paused";
})(GameState || (GameState = {}));
export function IsStoppedState(gameState) {
  const i = gameState;
  return (i & 240) == 0;
}
export function IsGameState(gameState) {
  const i = gameState;
  return (i & 240) == 16;
}
