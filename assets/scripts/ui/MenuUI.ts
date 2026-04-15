import { _decorator, Component, Node, Sprite, Color } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('MenuUi')
export class MenuUi extends Component {

    @property(Node)
    targetNode1: Node | null = null;
    @property(Node)
    targetNode2: Node | null = null;

    @property(Sprite)
    sprite1: Sprite | null = null;

    @property(Sprite)
    sprite2: Sprite | null = null;

    // Màu được chọn
    private selectedColor: Color = new Color(255, 255, 255, 255); // #FFFFFF

    // Màu chưa chọn
    private unselectedColor: Color = new Color(255, 255, 255, 160); // #FFFFFFA0

    // Click sprite 1
    onClickSprite1() {
        if (this.sprite1) {
            this.sprite1.color = this.selectedColor;
        }

        if (this.sprite2) {
            this.sprite2.color = this.unselectedColor;
        }
    }

    // Click sprite 2
    onClickSprite2() {
        if (this.sprite2) {
            this.sprite2.color = this.selectedColor;
        }

        if (this.sprite1) {
            this.sprite1.color = this.unselectedColor;
        }
    }

    // ===== Node control (giữ nguyên như cũ) =====

    setActiveNode1() {
        if (this.targetNode1) {
            this.targetNode1.active = true;
        } else {
            console.warn('Target node is null');
        }
    }

    setUnactiveNode1() {
        if (this.targetNode1) {
            this.targetNode1.active = false;
        } else {
            console.warn('Target node is null');
        }
    }

    setActiveNode2() {
        if (this.targetNode2) {
            this.targetNode2.active = true;
        } else {
            console.warn('Target node is null');
        }
    }

    setUnactiveNode2() {
        if (this.targetNode2) {
            this.targetNode2.active = false;
        } else {
            console.warn('Target node is null');
        }
    }
}