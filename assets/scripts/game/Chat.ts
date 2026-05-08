import {
  _decorator,
  Component,
  Node,
  EditBox,
  Prefab,
  instantiate,
  ScrollView,
  Label,
  RichText,
  Color,
} from "cc";
import { SocketManager } from "../managers/SocketManager";
import { AuthManager } from "../managers/AuthManager";
import { BauCuaGame } from "./BauCuaGame";

const { ccclass, property } = _decorator;

@ccclass("Chat")
export class Chat extends Component {
  @property(Node)
  chatContent: Node = null!;

  @property(EditBox)
  chatEditBox: EditBox = null!;

  @property(Prefab)
  boxRightPrefab: Prefab = null!;

  @property(Prefab)
  boxLeftPrefab: Prefab = null!;

  private socket: any = null;
  private userName: string = "";
  private playerName: string = "";

  async start() {
    await this.getMe();
    this.socket = SocketManager.instance.getSocket();

    if (this.socket) {
      this.setupEventListeners();
      this.initChat();
    } else {
      console.error("Chat: Socket is null!");
    }
  }

  async getMe() {
    const res = await AuthManager.instance.getMe();
    if (res.success && res.data) {
      this.userName = res.data.userName;
      this.playerName = res.data.name;
    }
  }

  setupEventListeners() {
    this.socket.on(
      "newMessage",
      (data: { userName: string; displayName: string; message: string }) => {
        this.addChatMessage(data);
      },
    );

    this.socket.on("userJoined", (data: { message: string }) => {
      this.addSystemMessage(data.message);
    });

    this.socket.on("userLeft", (data: { message: string }) => {
        this.addSystemMessage(data.message);
    });

    this.socket.on("gameResult", (data: { result: number[], payouts: any[] }) => {
        data.payouts.forEach(p => {
            if (p.totalWin > 0) {
                this.addSystemMessage(`Chúc mừng ${p.playerName} đã thắng ${p.totalWin.toLocaleString()}!`);
            }
        });
    });
  }

  initChat() {
    if (this.chatEditBox) {
      this.chatEditBox.node.on(
        EditBox.EventType.EDITING_RETURN,
        this.onChatReturn,
        this,
      );
    }
  }

  onChatReturn() {
    const message = this.chatEditBox.string.trim();
    if (message === "" || !this.userName) return;

    const data = {
      roomId: BauCuaGame.roomId, // Lấy roomId từ class tĩnh BauCuaGame
      userName: this.userName,
      displayName: this.playerName,
      message: message,
    };

    this.socket.emit("sendMessage", data);
    this.chatEditBox.string = ""; // Clear input
  }

  addChatMessage(data: {
    userName: string;
    displayName: string;
    message: string;
  }) {
    if (!this.chatContent || !this.boxRightPrefab || !this.boxLeftPrefab)
      return;

    const isMe = data.userName === this.userName;
    const prefab = isMe ? this.boxRightPrefab : this.boxLeftPrefab;
    const item = instantiate(prefab);
    item.parent = this.chatContent;

    // Cấu trúc prefab:
    // Child 0: Ảnh (Sprite) -> Child 0: mess (Label/RichText)
    // Child 1: name (Label)

    // 1. Set Name
    const nameNode = item.children[1];
    if (nameNode) {
      const nameLabel = nameNode.getComponent(Label);
      if (nameLabel) nameLabel.string = data.displayName;
    }

    // 2. Set Message
    const spriteNode = item.children[0];
    if (spriteNode && spriteNode.children[0]) {
      const messNode = spriteNode.children[0];
      const messLabel = messNode.getComponent(Label);
      const messRichText = messNode.getComponent(RichText);

      if (messLabel) messLabel.string = data.message;
      if (messRichText) messRichText.string = data.message;
    }

    this.scrollToBottom();
  }

  addSystemMessage(message: string) {
    if (!this.chatContent || !this.boxLeftPrefab) return;

    const item = instantiate(this.boxLeftPrefab);
    item.parent = this.chatContent;

    // 1. Set Name as "Hệ thống"
    const nameNode = item.children[1];
    if (nameNode) {
      const nameLabel = nameNode.getComponent(Label);
      if (nameLabel) {
          nameLabel.string = "Hệ thống";
          nameLabel.color = Color.RED;
      }
    }

    // 2. Set Message with RichText for coloring
    const spriteNode = item.children[0];
    if (spriteNode && spriteNode.children[0]) {
      const messNode = spriteNode.children[0];
      const messLabel = messNode.getComponent(Label);
      const messRichText = messNode.getComponent(RichText);

      const systemMsg = `<color=#ff0000>${message}</color>`;
      if (messLabel) messLabel.string = message;
      if (messRichText) messRichText.string = systemMsg;
    }

    this.scrollToBottom();
  }

  scrollToBottom() {
    this.scheduleOnce(() => {
      if (!this.chatContent) return;
      const scrollView =
        this.chatContent.parent?.parent?.getComponent(ScrollView);
      if (scrollView) {
        scrollView.scrollToBottom(0.1);
      }
    }, 0.1);
  }
}
