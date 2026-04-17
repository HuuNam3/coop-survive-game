import { _decorator, Component, Node, Vec3, v3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('CameraFollow')
export class CameraFollow extends Component {
    @property(Node)
    player: Node | null = null; // Kéo thả Player vào đây trong Inspector

    @property
    offset: Vec3 = v3(0, 0, 10); // Độ lệch so với Player

    @property({
        min: 0,
        max: 1,
        tooltip: 'Hệ số mượt 0..1 (0=bám cứng, 1=siêu mượt)',
    })
    lerpFactor: number = 0.1;

    private _current: Vec3 = v3();

    start() {
        this._current.set(this.node.worldPosition);
    }

    lateUpdate(dt: number) {
        if (!this.player) return;

        // Vị trí mục tiêu (Player + offset)
        const targetPos = v3();
        Vec3.add(targetPos, this.player.worldPosition, this.offset);

        // Lerp cho mượt
        Vec3.lerp(this._current, this._current, targetPos, this.lerpFactor);

        // Đặt vị trí camera
        this.node.setWorldPosition(this._current);

        // Nếu muốn camera luôn nhìn player (3D game)
        // this.node.lookAt(this.player.worldPosition);
    }
}
