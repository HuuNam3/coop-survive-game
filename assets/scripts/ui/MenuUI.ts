import {
  _decorator,
  Component,
  Node,
  Sprite,
  Color,
  director,
  EditBox,
  Button,
  Label,
  RichText,
} from "cc";
import { SocketManager } from "../managers/SocketManager";
import { BauCuaGame } from "../game/BauCuaGame";
import { AuthManager } from "../managers/AuthManager";
import { MathUtil } from "../utils/MathUtil";

const { ccclass, property } = _decorator;

@ccclass("MenuUI")
export class MenuUI extends Component {
  @property(EditBox)
  roomIdEditBox: EditBox = null!;

  @property(EditBox)
  roomPassEditBox: EditBox = null!;

  @property(Button)
  joinRoomButton: Button = null!;

  @property(Label)
  messageLabel: Label = null!;

  @property(RichText)
  richText: RichText = null!;

  @property
  // serverUrl: string = "http://localhost:4000";
  serverUrl: string = "https://backend-survive-game.onrender.com";

  private playerName: string = ""; // Display Name
  private userName: string = ""; // User Name (ID)

  async start() {
    // Đảm bảo socket được kết nối
    const res = await AuthManager.instance.getMe();

    if (res.success) {
      this.playerName = res.data.name;
      this.userName = res.data.userName;

      this.richText.string = `<color=#ff0000>Chào: <b>${res.data.name}</b></color><br/><color=#00ff00>Số tiền: <b>${MathUtil.formatNumber(
        res.data.money,
      )}</b></color>`;
    } else {
      director.loadScene("Login");
    }

    SocketManager.instance.connect(this.serverUrl);
    this.setActionButton();
  }

  async onJoinRoomClick() {
    const roomId = this.roomIdEditBox?.string;
    const roomPass = this.roomPassEditBox?.string;

    if (!roomId || !roomPass) {
      this.messageLabel.string = "Vui lòng nhập đầy đủ ID và Pass";
      return;
    }

    const socket = SocketManager.instance.getSocket();
    if (!socket) {
      this.messageLabel.string = "lỗi server!";
      return;
    }

    // Cấu trúc data mới khớp với Server
    const data = {
      id: roomId,
      password: roomPass,
      userName: this.userName,
      displayName: this.playerName,
    };

    this.joinRoomButton.interactable = false;

    socket.emit("joinRoom", data, (res: any) => {
      if (!this.isValid) return;
      this.joinRoomButton.interactable = true;
      this.messageLabel.string = "Đang vào phòng...";

      if (res && res.status === "success") {
        // Gán dữ liệu static
        BauCuaGame.roomId = roomId;
        BauCuaGame.roomPassword = roomPass;

        // Chuyển sang scene "Game"
        director.loadScene("Game");
      } else {
        const errorMsg = res?.message || "Không thể kết nối tới phòng";
        this.messageLabel.string = errorMsg;
      }
    });
  }

  onLogoutClick() {
    AuthManager.instance.logout();
    director.loadScene("Login");
  }

  // --- Các logic cũ giữ nguyên ---
  @property(Node)
  targetNode1: Node | null = null;
  @property(Node)
  targetNode2: Node | null = null;
  @property(Sprite)
  sprite1: Sprite | null = null;
  @property(Sprite)
  sprite2: Sprite | null = null;

  @property(Button)
  openButton1: Button = null!;
  @property(Button)
  openButton2: Button = null!;

  @property(Button)
  closeButton1: Button = null!;
  @property(Button)
  closeButton2: Button = null!;

  private selectedColor: Color = new Color(255, 255, 255, 255);
  private unselectedColor: Color = new Color(255, 255, 255, 160);

  onClickSprite1() {
    if (this.sprite1) {
      this.sprite1.color = this.selectedColor;
      if (this.sprite2) this.sprite2.color = this.unselectedColor;
      if (this.targetNode1) this.targetNode1.active = true;
      if (this.targetNode2) this.targetNode2.active = false;
    }
  }

  onClickSprite2() {
    if (this.sprite2) {
      this.sprite2.color = this.selectedColor;
      if (this.sprite1) this.sprite1.color = this.unselectedColor;
      if (this.targetNode1) this.targetNode1.active = false;
      if (this.targetNode2) this.targetNode2.active = true;
    }
  }

  setActionButton() {
    this.openButton1.node.on(Button.EventType.CLICK, this.onOpen1, this);
    this.openButton2.node.on(Button.EventType.CLICK, this.onOpen2, this);
    this.closeButton1.node.on(Button.EventType.CLICK, this.onClose1, this);
    this.closeButton2.node.on(Button.EventType.CLICK, this.onClose2, this);
  }

  onOpen1() {
    this.targetNode1.active = true;
    this.targetNode2.active = false;

    this.closeButton1.node.active = true;
    this.closeButton2.node.active = true;

    this.openButton1.node.active = false;
    this.openButton2.node.active = false;
  }

  onOpen2() {
    this.targetNode2.active = true;
    this.targetNode1.active = false;

    this.closeButton1.node.active = true;
    this.closeButton2.node.active = true;

    this.openButton1.node.active = false;
    this.openButton2.node.active = false;
  }

  onClose1() {
    this.targetNode1.active = false;

    this.closeButton1.node.active = false;
    this.closeButton2.node.active = false;

    this.openButton1.node.active = true;
    this.openButton2.node.active = true;
  }

  onClose2() {
    this.targetNode2.active = false;

    this.closeButton1.node.active = false;
    this.closeButton2.node.active = false;

    this.openButton1.node.active = true;
    this.openButton2.node.active = true;
  }
}
