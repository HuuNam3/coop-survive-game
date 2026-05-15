import {
  _decorator,
  Component,
  Label,
  Node,
  Prefab,
  instantiate,
  Sprite,
  Button,
} from "cc";
import { ResourceManager } from "../managers/ResourceManager";

const { ccclass, property } = _decorator;

@ccclass("CardUI")
export class CardUI extends Component {
  @property(Sprite)
  targetSprite: Sprite = null!;

  @property(Label)
  hpLabel: Label = null!;

  @property(Label)
  atkLabel: Label = null!;

  @property(Label)
  defLabel: Label = null!;

  @property(Label)
  spdLabel: Label = null!;

  @property(Label)
  critLabel: Label = null!;

  @property(Label)
  crdLabel: Label = null!;

  @property(Label)
  passiveLabel: Label = null!;

  @property(Label)
  basicLabel: Label = null!;

  @property(Label)
  skillLabel: Label = null!;

  @property(Node)
  content: Node = null!;

  @property(Prefab)
  cardPrefab: Prefab = null!;

  async start() {
    // Tự gọi load và đợi từ ResourceManager
    await ResourceManager.instance.loadCardData();
    await ResourceManager.instance.loadSprites();

    this.initCardList();
    this.showById(1);
  }

  public async initCardList() {
    const list = ResourceManager.instance.getCardList();
    const spriteMap = ResourceManager.instance.getAllSprites();
    this.content.removeAllChildren();

    list.forEach((card) => {
      console.log("Initializing card UI for ID:", card.id);
      const node = instantiate(this.cardPrefab);
      node.parent = this.content;
      // Set Sprite
      const sprite = node.getComponent(Sprite);
      if (sprite) {
        const spriteFrame = spriteMap.get(card.id);
        console.log(
          "Card ID:",
          card.id,
          "Sprite Frame:",
          spriteFrame ? "Loaded" : "NOT FOUND",
        );
        if (spriteFrame) {
          sprite.spriteFrame = spriteFrame;
        }
      }

      // Add Click Event
      const button = node.getComponent(Button) || node.addComponent(Button);
      node.on(Button.EventType.CLICK, () => {
        this.showById(card.id);
      });
    });
  }

  // truyền id vào
  public showById(id: number) {
    const data = ResourceManager.instance.getCardById(id);

    if (!data) {
      console.error("Không tìm thấy card id:", id);
      return;
    }

    this.hpLabel.string = data.hp.toString();

    this.atkLabel.string = `${data.atk} (${data.dmgType})`;

    this.defLabel.string = `${data.pdef}/${data.mdef}`;

    this.spdLabel.string = data.spd.toString();

    this.critLabel.string = data.crit + "%";

    this.crdLabel.string = data.crd + "%";

    this.passiveLabel.string = data.passive;

    this.basicLabel.string = data.basicAttack;

    this.skillLabel.string = data.skill;

    // Cập nhật ảnh chính
    const spriteFrame = ResourceManager.instance.getSpriteById(id);
    if (spriteFrame && this.targetSprite) {
      this.targetSprite.spriteFrame = spriteFrame;
    }
  }
}
