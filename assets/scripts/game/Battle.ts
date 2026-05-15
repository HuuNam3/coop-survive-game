import {
  _decorator,
  Component,
  Node,
  Sprite,
  Label,
  Prefab,
  instantiate,
  tween,
  Vec3,
  Color,
  Widget,
  director,
} from "cc";
import { ResourceManager } from "../managers/ResourceManager";
import { BattleUnit, HandleBattle } from "./HandleBattle";

const { ccclass, property } = _decorator;

@ccclass("Battle")
export class Battle extends Component {
  @property(Node)
  playerFloor: Node = null;

  @property(Node)
  enemyFloor: Node = null;

  @property(Prefab)
  damageTextPrefab: Prefab = null;

  @property(Label)
  turnLabel: Label = null;

  @property(Label)
  resultLabel: Label = null;

  @property(Node)
  btnBack: Node = null;

  private playerTeam: BattleUnit[] = [];
  private enemyTeam: BattleUnit[] = [];
  private turnQueue: BattleUnit[] = [];

  start() {
    this.initBattle();
  }

  private async initBattle() {
    if (this.resultLabel) this.resultLabel.node.active = false;
    if (this.turnLabel) this.turnLabel.string = "0/30";
    if (this.btnBack) this.btnBack.active = false;

    await ResourceManager.instance.loadCardData();
    await ResourceManager.instance.loadCharacters();

    this.playerTeam = [];
    this.enemyTeam = [];

    let playerConfigs = [
      { id: 1, pos: 1 },
      { id: 4, pos: 2 },
      { id: 5, pos: 3 },
      { id: 2, pos: 4 },
      { id: 3, pos: 5 },
    ];

    const savedTeam = localStorage.getItem("player_team");
    if (savedTeam) {
      try {
        playerConfigs = JSON.parse(savedTeam);
      } catch (e) {
        console.error("Failed to parse saved team", e);
      }
    }

    playerConfigs.forEach((config) => {
      const pData = ResourceManager.instance.getCardById(config.id);
      if (pData)
        this.playerTeam.push(new BattleUnit(pData, "player", config.pos));
    });

    const enemyConfigs = [
      { id: 1, pos: 1 },
      { id: 4, pos: 2 },
      { id: 3, pos: 4 },
      { id: 2, pos: 5 },
      { id: 5, pos: 7 },
    ];

    enemyConfigs.forEach((config) => {
      const eData = ResourceManager.instance.getCardById(config.id);
      if (eData)
        this.enemyTeam.push(new BattleUnit(eData, "enemy", config.pos));
    });

    this.updateVisuals();
    this.runBattleSimulation();
  }

  private updateVisuals() {
    [this.playerFloor, this.enemyFloor].forEach((floor) => {
      floor?.children.forEach((child) => {
        child.active = true;
        const sprite = child.getComponent(Sprite);
        if (sprite) sprite.enabled = false;
      });
    });

    const setupTeam = (team: BattleUnit[], floor: Node) => {
      team.forEach((unit) => {
        let node =
          floor?.getChildByName(unit.gridIndex.toString()) ||
          floor?.children[unit.gridIndex - 1];
        if (node) {
          unit.node = node;
          const sprite = node.getComponent(Sprite);
          if (sprite) {
            const frame = ResourceManager.instance.getSpriteById(unit.data.id);
            if (frame) {
              sprite.enabled = true;
              sprite.spriteFrame = frame;
            }
          }
        }
      });
    };

    setupTeam(this.playerTeam, this.playerFloor);
    setupTeam(this.enemyTeam, this.enemyFloor);
    this.playerTeam
      .concat(this.enemyTeam)
      .forEach((unit) => this.updateUnitBars(unit));
  }

  private async runBattleSimulation() {
    let round = 1;
    const maxRounds = 30;

    while (!this.isBattleOver() && round <= maxRounds) {
      if (this.turnLabel) this.turnLabel.string = `${round}/${maxRounds}`;

      this.turnQueue = HandleBattle.getTurnQueue(
        this.playerTeam,
        this.enemyTeam,
      );

      for (const currentUnit of this.turnQueue) {
        if (currentUnit.isDead || this.isBattleOver()) continue;

        if (currentUnit.node) {
          tween(currentUnit.node)
            .to(0.2, { scale: new Vec3(1.2, 1.2, 1.2) })
            .to(0.2, { scale: new Vec3(1, 1, 1) })
            .start();
        }

        await this.wait(1000);
        currentUnit.updateEffects();

        if (currentUnit.currentCast < currentUnit.data.cast) {
          this.executeAction(currentUnit, "basic");
          currentUnit.currentCast++;
        } else {
          this.executeAction(currentUnit, "skill");
          currentUnit.currentCast = 0;
        }

        this.updateUnitBars(currentUnit);
        await this.wait(500);
      }
      round++;
    }
    this.showBattleResult();
  }

  private isBattleOver(): boolean {
    return (
      !this.playerTeam.some((u) => !u.isDead) ||
      !this.enemyTeam.some((u) => !u.isDead)
    );
  }

  private showBattleResult() {
    const playerWin = this.playerTeam.some((u) => !u.isDead);
    if (this.resultLabel) {
      this.resultLabel.node.active = true;
      this.resultLabel.string = playerWin ? "CHIẾN THẮNG!" : "THẤT BẠI!";
      this.resultLabel.color = playerWin ? Color.GREEN : Color.RED;
    }
    if (this.btnBack) this.btnBack.active = true;
  }

  public onBackToHome() {
    director.loadScene("Home");
  }

  private executeAction(attacker: BattleUnit, type: "basic" | "skill") {
    const targetType =
      type === "basic" ? attacker.data.basicTarget : attacker.data.skillTarget;
    const skillType =
      type === "basic" ? attacker.data.basicType : attacker.data.skillType;
    const isHeal = skillType && skillType.indexOf("heal") !== -1;

    const targets = HandleBattle.findTargets(
      attacker,
      this.playerTeam,
      this.enemyTeam,
      targetType,
    );

    targets.forEach((target) => {
      // Chỉ gây sát thương nếu không phải là chiêu hồi máu và mục tiêu là kẻ địch
      if (!isHeal && target.teamSide !== attacker.teamSide) {
        const { damage, isCrit } = HandleBattle.calculateDamage(
          attacker,
          target,
          type,
        );

        target.takeDamage(damage);
        this.showPopupText(
          target,
          isCrit ? `Crit! -${damage}` : `-${damage}`,
          Color.RED,
          isCrit,
        );

        if (target.isDead) {
          const energyGain = HandleBattle.handleOnKill(attacker);
          if (energyGain > 0) {
            this.showPopupText(attacker, `+${energyGain} Energy`, Color.YELLOW);
          }
        }
      }

      // Luôn cập nhật hiệu ứng phụ (bao gồm hồi máu)
      const effects = HandleBattle.applySideEffects(attacker, target, type);
      if (effects.heal) {
        this.showPopupText(target, `+${effects.heal}`, Color.GREEN);
      }

      this.updateUnitBars(target);
      this.updateUnitBars(attacker);
    });
  }

  private updateUnitBars(unit: BattleUnit) {
    if (!unit.node) return;
    const sprite = (unit.node as Node).getComponent(Sprite);
    if (sprite && unit.isDead) sprite.enabled = false;

    const hpBar = (unit.node as Node).getChildByName("HpBar");
    const castBar = (unit.node as Node).getChildByName("CastBar");

    if (hpBar) {
      hpBar.active = !unit.isDead;
      const hpFill = hpBar.getChildByName("hp")?.getComponent(Widget);
      if (hpFill) {
        const percent = Math.max(0, unit.currentHP / unit.maxHP);
        const newTop = 4 + (1 - percent) * 92;
        const proxy = { top: hpFill.top };
        tween(proxy)
          .to(
            0.3,
            { top: newTop },
            {
              easing: "sineOut",
              onUpdate: () => {
                hpFill.top = proxy.top;
                hpFill.updateAlignment();
              },
            },
          )
          .start();
      }
    }

    if (castBar) {
      castBar.active = !unit.isDead;
      const castFill = castBar.getChildByName("cast")?.getComponent(Widget);
      if (castFill) {
        const percent = Math.min(1, unit.currentCast / unit.data.cast);
        const newTop = 96 - percent * 92;
        const proxy = { top: castFill.top };
        tween(proxy)
          .to(
            0.3,
            { top: newTop },
            {
              easing: "sineOut",
              onUpdate: () => {
                castFill.top = proxy.top;
                castFill.updateAlignment();
              },
            },
          )
          .start();
      }
    }
  }

  private showPopupText(
    unit: BattleUnit,
    text: string,
    color: Color,
    isCrit: boolean = false,
  ) {
    if (!this.damageTextPrefab || !unit.node) return;
    const node = instantiate(this.damageTextPrefab);
    const parent = (unit.node as Node).parent?.parent || this.node;
    parent.addChild(node);
    node.setWorldPosition((unit.node as Node).worldPosition);
    node.setScale(isCrit ? new Vec3(1.5, 1.5, 1.5) : new Vec3(1, 1, 1));
    const label =
      node.getComponent(Label) || node.getComponentInChildren(Label);
    if (label) {
      label.string = text;
      label.color = color;
    }
    tween(node)
      .parallel(
        tween().by(
          1.0,
          { position: new Vec3(0, 100, 0) },
          { easing: "sineOut" },
        ),
        tween().to(
          1.0,
          { scale: new Vec3(0.5, 0.5, 0.5) },
          { easing: "sineIn" },
        ),
      )
      .call(() => node.destroy())
      .start();
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
