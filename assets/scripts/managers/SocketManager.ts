import { _decorator } from "cc";
// Cách import này thường ổn định hơn trong Cocos Creator
import io from "socket.io-client/dist/socket.io.js";

export class SocketManager {
  private static _instance: SocketManager;
  private socket: any = null;

  public static get instance() {
    if (!this._instance) {
      this._instance = new SocketManager();
    }
    return this._instance;
  }

  public connect(url: string) {
    if (!this.socket) {
      console.log("Connecting to socket at:", url);
      this.socket = io(url, {
        transports: ["websocket"],
        forceNew: true,
      });

      this.socket.on("connect", () => {
        console.log("Socket connected successfully with ID:", this.socket.id);
      });

      this.socket.on("connect_error", (err) => {
        console.error("Socket connection error:", err);
      });
    }
    return this.socket;
  }

  public getSocket() {
    return this.socket;
  }
}
