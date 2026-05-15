import {
  _decorator,
  Component,
  Node,
  Prefab,
  instantiate,
  Sprite,
  Button,
  UITransform,
  EventTouch,
  Vec3,
  Vec2,
  Layout,
} from "cc";
import { ResourceManager } from "../managers/ResourceManager";

const { ccclass, property } = _decorator;

@ccclass("TeamUI")
export class TeamUI extends Component {
  @property(Node)
  content: Node = null!;

  @property(Prefab)
  cardPrefab: Prefab = null!;

  @property(Node)
  slotContent: Node = null!;

  // Map lưu trữ: Key là vị trí (vị trí chọn), Value là Card ID
  private teamData: Map<number, number> = new Map();


  // Biến tạm để lưu vị trí bắt đầu kéo
  private sourceSlotIndex: number = -1;
  private originalPos: Vec3 = new Vec3();
  private originalSiblingIndex: number = -1;
  private slotNodes: Node[] = [];
  private dragOffset: Vec2 = new Vec2();
  private cardButtons: Map<number, Button> = new Map();

  async start() {
    // Đảm bảo dữ liệu đã được load từ ResourceManager
    await ResourceManager.instance.loadCardData();
    await ResourceManager.instance.loadSprites();

    this.loadTeam();
    this.initTeamList();
    this.initSlotEvents();
    this.refreshAllSlots();
  }

  public async initTeamList() {
    const list = ResourceManager.instance.getCardList();
    const spriteMap = ResourceManager.instance.getAllSprites();

    // Xóa các item cũ
    this.content.removeAllChildren();
    this.cardButtons.clear();

    const excludeIds = [4, 5, 9, 10, 14, 15];
    list.forEach((card) => {
      if (excludeIds.indexOf(card.id) !== -1) return;
      const node = instantiate(this.cardPrefab);
      node.parent = this.content;

      const sprite = node.getComponent(Sprite);
      if (sprite) {
        const spriteFrame = spriteMap.get(card.id);
        if (spriteFrame) sprite.spriteFrame = spriteFrame;
      }

      const button = node.getComponent(Button) || node.addComponent(Button);
      this.cardButtons.set(card.id, button);

      node.on(Button.EventType.CLICK, () => {
        this.onCardClicked(card.id, button);
      }, this);
    });

    this.updateInventoryInteractions();
  }
  private onCardClicked(id: number, button: Button) {
    // Nếu đã đủ 5 người thì không làm gì thêm
    if (this.teamData.size >= 5) return;

    // Kiểm tra nhân vật này đã có trong team chưa
    for (let selectedId of this.teamData.values()) {
      if (selectedId === id) return;
    }

    // Tìm ô trống đầu tiên trong khoảng 1-5
    let targetPos = -1;
    for (let i = 1; i <= 5; i++) {
      if (!this.teamData.has(i)) {
        targetPos = i;
        break;
      }
    }

    if (targetPos === -1) return;

    // Lưu vào Map
    this.teamData.set(targetPos, id);

    // Cập nhật hiển thị lên Slot
    this.updateSlotView(targetPos, id);

    // Cập nhật trạng thái các thẻ trong danh sách
    this.updateInventoryInteractions();
    this.saveTeam();
  }

  /**
   * Cập nhật hiển thị ảnh nhân vật lên Slot tương ứng
   */
  private updateSlotView(pos: number, id: number) {
    if (!this.slotContent) {
      return;
    }

    // Lấy node con theo vị trí (pos 1->5, children 0->4)
    const slotNode = this.slotContent.children[pos - 1];
    if (slotNode) {
      
      // Bật node và đảm bảo component Sprite cũng được bật
      slotNode.active = true;
      
      const sprite = slotNode.getComponent(Sprite);
      if (sprite) {
        sprite.enabled = true;
        const spriteFrame = ResourceManager.instance.getSpriteById(id);
        if (spriteFrame) {
          sprite.spriteFrame = spriteFrame;
        }
      }
    }
  }

  /**
   * Tắt khả năng tương tác của tất cả các thẻ nhân vật
   */
  private disableAllCardClicks() {
    const buttons = this.content.getComponentsInChildren(Button);
    buttons.forEach((btn) => {
      btn.interactable = false;
    });
  }

  /**
   * Khởi tạo sự kiện touch cho các ô Slot để kéo thả
   */
  private initSlotEvents() {
    if (!this.slotContent) return;
    
    // Lưu lại danh sách node theo thứ tự ban đầu để không bị ảnh hưởng bởi siblingIndex
    this.slotNodes = [...this.slotContent.children];

    this.slotNodes.forEach((slotNode, index) => {
      // Bắt đầu chạm
      slotNode.on(Node.EventType.TOUCH_START, (event: EventTouch) => {
        // Chỉ cho phép kéo nếu ô này có nhân vật
        if (!this.teamData.has(index + 1)) return;

        this.sourceSlotIndex = index;

        // Lưu vị trí và thứ tự hiển thị gốc
        this.originalPos.set(slotNode.position);
        this.originalSiblingIndex = slotNode.getSiblingIndex();

        // Tính toán offset để tránh việc thẻ bị "giật" về tâm khi bắt đầu kéo
        const touchPos = event.getUILocation();
        const worldNodePos = slotNode.getComponent(UITransform)!.convertToWorldSpaceAR(new Vec3(0, 0, 0));
        this.dragOffset.set(worldNodePos.x - touchPos.x, worldNodePos.y - touchPos.y);
        
        // Hiệu ứng nhấc lên: Tăng scale
        slotNode.setScale(1.15, 1.15, 1);
        slotNode.setSiblingIndex(this.slotContent.children.length - 1);

        // Tắt Layout của parent (nếu có) để không bị cưỡng ép vị trí khi kéo
        const layout = this.slotContent.getComponent(Layout);
        if (layout) layout.enabled = false;
        
        event.propagationStopped = true;
      }, this);

      // Đang kéo
      slotNode.on(Node.EventType.TOUCH_MOVE, (event: EventTouch) => {
        if (this.sourceSlotIndex !== index) return;

        const touchPos = event.getUILocation();
        const parentTransform = this.slotContent.getComponent(UITransform);
        if (parentTransform) {
          // Tính toán vị trí thế giới mới dựa trên offset, sau đó chuyển về local của parent
          const targetWorldPos = new Vec3(touchPos.x + this.dragOffset.x, touchPos.y + this.dragOffset.y, 0);
          const localPos = parentTransform.convertToNodeSpaceAR(targetWorldPos);
          slotNode.setPosition(localPos);
        }
      }, this);

      // Kết thúc kéo
      slotNode.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
        if (this.sourceSlotIndex === index) {
          this.resetSlotEffect(slotNode);
          this.onSlotTouchEnd(event);
        }
      }, this);

      // Hủy kéo
      slotNode.on(Node.EventType.TOUCH_CANCEL, (event: EventTouch) => {
        if (this.sourceSlotIndex === index) {
          this.resetSlotEffect(slotNode);
          this.onSlotTouchEnd(event);
        }
      }, this);
    });
  }

  /**
   * Reset lại hiệu ứng của Slot về trạng thái ban đầu
   */
  private resetSlotEffect(slotNode: Node) {
    if (this.sourceSlotIndex === -1) return;
    
    slotNode.setScale(1, 1, 1);
    slotNode.setPosition(this.originalPos);
    slotNode.setSiblingIndex(this.originalSiblingIndex);

    // Bật lại Layout sau khi thả
    const layout = this.slotContent.getComponent(Layout);
    if (layout) layout.enabled = true;
  }

  /**
   * Xử lý khi kết thúc kéo thả trên Slot
   */
  private onSlotTouchEnd(event: EventTouch) {
    if (this.sourceSlotIndex === -1) return;

    const touchPos = event.getUILocation();
    let targetIndex = -1;

    // Duyệt qua tất cả slot để tìm điểm rơi
    this.slotNodes.forEach((node, idx) => {
      const transform = node.getComponent(UITransform);
      if (transform) {
        const bbox = transform.getBoundingBoxToWorld();
        if (bbox.contains(touchPos)) {
          targetIndex = idx;
        }
      }
    });

    if (targetIndex !== -1 && targetIndex !== this.sourceSlotIndex) {
      this.moveCharacterInMap(this.sourceSlotIndex + 1, targetIndex + 1);
    } else if (targetIndex === -1) {
      // Kéo ra khỏi vùng 9 ô -> Xóa khỏi team
      this.removeCharacter(this.sourceSlotIndex + 1);
    }

    this.sourceSlotIndex = -1;
  }

  /**
   * Xóa nhân vật khỏi vị trí cụ thể
   */
  private removeCharacter(pos: number) {
    if (!this.teamData.has(pos)) return;

    this.teamData.delete(pos);
    this.refreshAllSlots();
    this.updateInventoryInteractions();
    this.saveTeam();
  }

  /**
   * Di chuyển nhân vật từ vị trí này sang vị trí khác trong Map và cập nhật UI
   */
  private moveCharacterInMap(fromPos: number, toPos: number) {
    const charId = this.teamData.get(fromPos);
    if (charId === undefined) {
      return;
    }

    // Cập nhật Map: Chuyển ID từ vị trí cũ sang vị trí mới
    // Nếu vị trí mới đã có người, chúng ta sẽ thực hiện đổi chỗ (Swap)
    const targetCharId = this.teamData.get(toPos);
    
    if (targetCharId !== undefined) {
      // Đổi chỗ
      this.teamData.set(fromPos, targetCharId);
      this.teamData.set(toPos, charId);
    } else {
      // Di chuyển thuần túy
      this.teamData.delete(fromPos);
      this.teamData.set(toPos, charId);
    }

    // Cập nhật UI
    this.refreshAllSlots();
    this.saveTeam();
  }

  /**
   * Làm mới hiển thị của tất cả các Slot dựa trên teamData
   */
  private refreshAllSlots() {
    if (!this.slotContent) return;

    // Duyệt qua tất cả các slot hiện có (9 slot) dựa trên mảng cố định slotNodes
    this.slotNodes.forEach((node, index) => {
      const pos = index + 1;
      const charId = this.teamData.get(pos);
      
      const sprite = node.getComponent(Sprite);
      const button = node.getComponent(Button);

      if (charId !== undefined) {
        // CÓ NHÂN VẬT: Bật hiển thị
        node.active = true; 
        if (sprite) {
          sprite.enabled = true;
          const spriteFrame = ResourceManager.instance.getSpriteById(charId);
          if (spriteFrame) {
            sprite.spriteFrame = spriteFrame;
          }
        }
        if (button) {
          button.interactable = true;
        }
      } else {
        // TRỐNG
        if (sprite) {
          sprite.enabled = false;
          sprite.spriteFrame = null;
        }
        if (button) {
          button.interactable = false;
        }
        
        node.active = true; 
      }
    });
  }

  /**
   * Cập nhật trạng thái interactable của các thẻ nhân vật trong danh sách
   */
  private updateInventoryInteractions() {
    this.cardButtons.forEach((btn, id) => {
      // Kiểm tra xem ID này đã có trong team chưa
      let isInTeam = false;
      for (let selectedId of this.teamData.values()) {
        if (selectedId === id) {
          isInTeam = true;
          break;
        }
      }

      if (isInTeam) {
        btn.interactable = false;
      } else {
        // Nếu chưa có trong team, chỉ bật nếu team chưa đủ 5 người
        btn.interactable = this.teamData.size < 5;
      }
    });
  }

  /**
   * Lấy toàn bộ data team đã chọn
   */
  public getTeamData(): Map<number, number> {
    return this.teamData;
  }

  private saveTeam() {
    const data = Array.from(this.teamData).map(([pos, id]) => ({ pos, id }));
    localStorage.setItem("player_team", JSON.stringify(data));
  }

  private loadTeam() {
    const saved = localStorage.getItem("player_team");
    if (saved) {
      try {
        const data = JSON.parse(saved);
        this.teamData.clear();
        data.forEach((item: { pos: number; id: number }) => {
          this.teamData.set(item.pos, item.id);
        });
      } catch (e) {
        console.error("Failed to load team from localStorage", e);
      }
    }
  }
}
