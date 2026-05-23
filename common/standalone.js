import SocketEmulator from "./socketemul.js";
import {Wrapper as AsteroidsServer} from "./main.js";

export default function standaloneSocketInit() {
  const socket = new SocketEmulator();

  new AsteroidsServer(socket);

  return socket;
}
