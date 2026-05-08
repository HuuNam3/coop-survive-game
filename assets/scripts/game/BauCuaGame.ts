import {
  _decorator,
  Component,
  Button,
  RichText,
  Label,
  Color,
  Sprite,
  SpriteFrame,
  Node,
  v3,
  tween,
  Vec3,
  UIOpacity,
} from "cc";

import { MathUtil } from "../utils/MathUtil";
import { SocketManager } from "../managers/SocketManager";
import { AuthManager } from "../managers/AuthManager";

const { ccclass, property } = _decorator;

@ccclass("BauCuaGame")
export class BauCuaGame extends Component {
  @property(RichText)
  moneyText: RichText = null!;

  @property([Button])
  betButtons: Button[] = [];

  @property([Button])
  resultButtons: Button[] = [];

  @property([SpriteFrame])
  animalSprites: SpriteFrame[] = [];

  @property(SpriteFrame)
  unknownSprite: SpriteFrame = null!;

  @property([Button])
  betValueButtons: Button[] = [];

  @property(Button)
  replayButton: Button = null!;

  @property(RichText)
  timerText: RichText = null!;

  @property(RichText)
  countPlayerText: RichText = null!;

  // =========================
  public static roomId: string = "";
  public static roomPassword: string = "";

  private socket: any = null;
  private money: number = 0;
  private playerName: string = ""; // Tên hiển thị
  private userName: string = "";   // Định danh chuẩn trong DB
  private currentBetValue: number = 1000;

  private bets: number[] = [0, 0, 0, 0, 0, 0];
  private totalBets: number[] = [0, 0, 0, 0, 0, 0]; // Tổng cược của tất cả người chơi
  private results: number[] = [-1, -1, -1];
  private openedResults: boolean[] = [false, false, false];

  private selectedBetIndex: number = 0;
  private isBetPhase: boolean = true;
  private countdown: number = 0;
  private isClicking: boolean = false; // Chống spam click

  // =========================
  async start() {
    await this.getMe();
    
    this.socket = SocketManager.instance.getSocket();
    if (!this.socket) {
      console.error("Socket chưa được khởi tạo!");
      return;
    }

    this.setupEventListeners();
    this.syncRoomState();

    this.initBetButtons();
    this.initResultButtons();
    this.initBetValueButtons();
    this.replayButton.interactable = false;
  }

  async getMe() {
    const res = await AuthManager.instance.getMe();
    if (res.success && res.data) {
      this.money = res.data.money;
      this.playerName = res.data.name;
      this.userName = res.data.userName;
      this.updateMoneyUI();
    }
  }

  setupEventListeners() {
    this.socket.on(
      "roomUpdate",
      (data: { countdown: number; phase: string }) => {
        this.countdown = data.countdown;
        
        if (this.isBetPhase === false && data.phase === "betting") {
            this.onReplay();
        }
        
        this.isBetPhase = data.phase === "betting";
        // Cập nhật trạng thái nút theo phase
        this.setBetButtonsInteractable(this.isBetPhase);
        
        this.updateTimerUI();
      }
    );

    this.socket.on("userJoined", (data: { userName: string; displayName: string; playerCount: number }) => {
      this.updatePlayerCountUI(data.playerCount);
    });

    this.socket.on("userLeft", (data: { playerCount: number }) => {
      this.updatePlayerCountUI(data.playerCount);
    });

    this.socket.on("playerCountUpdate", (data: { count: number }) => {
      this.updatePlayerCountUI(data.count);
    });

    this.socket.on(
      "gameResult",
      (data: { result: number[]; payouts: any[] }) => {
        this.results = data.result;
        this.startResultPhase(data.payouts);
      }
    );

    this.socket.on("betsUpdate", (data: { bets: any }) => {
      // Tính toán tổng cược từ tất cả người chơi
      const newTotalBets = [0, 0, 0, 0, 0, 0];
      for (const userNameInRoom in data.bets) {
        const userBets = data.bets[userNameInRoom];
        for (let i = 0; i < 6; i++) {
          newTotalBets[i] += userBets[i];
        }
      }
      this.totalBets = newTotalBets;

      // Cập nhật cược của bản thân
      if (this.userName && data.bets[this.userName]) {
        this.bets = data.bets[this.userName];
      }
      
      this.updateAllBetButtons();
    });
  }

  setBetButtonsInteractable(interactable: boolean) {
    this.betButtons.forEach(btn => {
        btn.interactable = interactable;
    });
    this.betValueButtons.forEach(btn => {
        btn.interactable = interactable;
    });
  }

  updatePlayerCountUI(count: number) {
    if (this.countPlayerText) {
      this.countPlayerText.string = `<color=#00ff00>Online: <b>${count}</b></color>`;
    }
  }

  syncRoomState() {
    if (!this.userName) return;

    const data = {
      id: BauCuaGame.roomId,
      password: BauCuaGame.roomPassword,
      userName: this.userName,
      displayName: this.playerName,
    };

    this.socket.emit("joinRoom", data, (res: any) => {
      if (res.status === "success") {
        if (typeof res.money === 'number') {
            this.money = res.money;
            this.updateMoneyUI();
        }
        this.isBetPhase = res.phase === "betting";
        this.countdown = res.countdown;
        this.setBetButtonsInteractable(this.isBetPhase);
        this.updateTimerUI();
        this.updatePlayerCountUI(res.playerCount);
      }
    });
  }

  updateMoneyUI() {
    const formatted = MathUtil.formatNumber(this.money);
    this.moneyText.string = `<color=#FFFFFF>Tiền: </color><color=#FFD700>${formatted}</color>`;
  }

  initBetButtons() {
    this.betButtons.forEach((btn, index) => {
      this.updateBetButtonText(index);
      btn.node.on(Button.EventType.CLICK, () => this.placeBet(index));
    });
  }

  placeBet(index: number) {
    if (!this.isBetPhase || !this.userName || this.isClicking) return;
    
    if (this.money < this.currentBetValue) {
        console.warn("Không đủ tiền");
        return;
    }

    // Cooldown 150ms để chống spam click nhưng vẫn cảm thấy mượt
    this.isClicking = true;
    this.scheduleOnce(() => { this.isClicking = false; }, 0.15);

    // Optimistic Update
    this.money -= this.currentBetValue;
    this.bets[index] += this.currentBetValue;
    this.totalBets[index] += this.currentBetValue;
    
    this.updateMoneyUI();
    this.updateBetButtonText(index);
    this.showFloatingBetText(index, this.currentBetValue);

    this.socket.emit(
      "placeBet",
      {
        roomId: BauCuaGame.roomId,
        playerName: this.userName,
        betIndex: index,
        betAmount: this.currentBetValue,
      },
      (res: any) => {
        if (res.status !== "success") {
          console.error("Bet failed:", res.message);
          this.getMe(); 
        } else {
            this.money = res.money;
            this.updateMoneyUI();
        }
      },
    );
  }

  updateBetButtonText(index: number) {
    const label = this.betButtons[index].getComponentInChildren(Label);
    if (!label) return;

    const myBet = this.bets[index];
    const totalBet = this.totalBets[index];

    if (totalBet > 0) {
        const formattedTotal = MathUtil.formatNumber(totalBet);
        // Nếu có cược của bản thân thì hiển thị thêm bên cạnh
        const myBetStr = myBet > 0 ? ` (${MathUtil.formatNumber(myBet)})` : "";
        label.string = `${formattedTotal}${myBetStr}`;
    } else {
        label.string = "";
    }
  }

  showFloatingBetText(index: number, amount: number) {
    const btnNode = this.betButtons[index].node;
    
    // Tạo node mới cho text bay
    const floatingNode = new Node("FloatingBet");
    floatingNode.parent = btnNode; // Gắn vào nút để lấy tọa độ tương đối hoặc tuyệt đối
    floatingNode.setPosition(v3(0, 0, 0));

    const label = floatingNode.addComponent(Label);
    label.string = `+${MathUtil.formatNumber(amount)}`;
    label.fontSize = 40;
    label.color = Color.YELLOW;
    label.isBold = true;

    // Thêm hiệu ứng bay lên và mờ dần
    const opacity = floatingNode.addComponent(UIOpacity);
    
    tween(floatingNode)
      .parallel(
        tween(floatingNode).by(1, { position: v3(0, 150, 0) }, { easing: "sineOut" }),
        tween(opacity).to(1, { opacity: 0 }, { easing: "quadIn" })
      )
      .call(() => {
        floatingNode.destroy();
      })
      .start();
  }

  updateAllBetButtons() {
    for (let i = 0; i < 6; i++) this.updateBetButtonText(i);
  }

  initResultButtons() {
    this.resultButtons.forEach((btn) => {
      const sprite = btn.getComponent(Sprite);
      if (sprite) sprite.spriteFrame = this.unknownSprite;
    });
  }

  startResultPhase(payouts: any[]) {
    this.isBetPhase = false;
    this.setBetButtonsInteractable(false); // Vô hiệu hóa nút khi có kết quả
    
    this.scheduleOnce(() => this.openResult(0), 0.5);
    this.scheduleOnce(() => this.openResult(1), 1.5);
    this.scheduleOnce(() => this.openResult(2), 2.5);
    this.scheduleOnce(() => {
      const myPayout = payouts.find((p) => p.playerName === this.userName);
      if (myPayout) {
        this.money = myPayout.currentMoney;
        this.updateMoneyUI();
      }
    }, 3.5);
  }

  openResult(index: number) {
    const result = this.results[index];
    if (result === -1) return;
    this.openedResults[index] = true;
    const sprite = this.resultButtons[index].getComponent(Sprite);
    if (sprite) sprite.spriteFrame = this.animalSprites[result];
    const label = this.resultButtons[index].getComponentInChildren(Label);
    if (label) {
      const isWinner = this.bets[result] > 0;
      label.string = isWinner
        ? `+${MathUtil.formatNumber(this.bets[result])}`
        : "";
      label.color = isWinner ? Color.GREEN : Color.RED;
    }
  }

  updateTimerUI() {
    this.timerText.string = this.isBetPhase
      ? `<color=#00ffff>Đặt cược: </color><color=#FF0000>${this.countdown}s</color>`
      : `<color=#FFD700>Kết quả: </color><color=#FF0000>${this.countdown}s</color>`;
  }

  initBetValueButtons() {
    const values = [
      1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000, 500000, 1000000,
      2000000, 5000000,
    ];
    this.betValueButtons.forEach((btn, index) => {
      const value = values[index];
      const label = btn.getComponentInChildren(Label);
      if (label) label.string = MathUtil.formatNumber(value);
      btn.node.on(Button.EventType.CLICK, () => {
        if (!this.isBetPhase) return;
        this.currentBetValue = value;
        this.selectedBetIndex = index;
        this.updateBetValueUI();
      });
    });
    this.updateBetValueUI();
  }

  updateBetValueUI() {
    this.betValueButtons.forEach((btn, index) => {
      const label = btn.getComponentInChildren(Label);
      if (label)
        label.color =
          index === this.selectedBetIndex ? Color.YELLOW : Color.WHITE;
    });
  }

  onReplay() {
    this.bets = [0, 0, 0, 0, 0, 0];
    this.totalBets = [0, 0, 0, 0, 0, 0];
    this.updateAllBetButtons();
    this.results = [-1, -1, -1];
    this.openedResults = [false, false, false];
    this.resultButtons.forEach((btn) => {
      const sprite = btn.getComponent(Sprite);
      if (sprite) sprite.spriteFrame = this.unknownSprite;
      const label = btn.getComponentInChildren(Label);
      if (label) label.string = "";
    });
    
    this.setBetButtonsInteractable(true); // Bật lại nút khi ván mới bắt đầu
  }
}
