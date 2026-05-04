import {
  _decorator,
  Component,
  TiledMap,
  Node,
  BoxCollider2D,
  RigidBody2D,
  ERigidBody2DType,
  Size,
  Vec3,
} from "cc";

const { ccclass } = _decorator;

@ccclass("CollisionLoader")
export class CollisionLoader extends Component {
  start() {
    const map = this.getComponent(TiledMap);
    if (!map) {
      console.log("NO TILEMAP");
      return;
    }

    const objectGroup = map.getObjectGroup("Collision");
    if (!objectGroup) {
      console.log("NO OBJECT GROUP");
      return;
    }

    const objects = objectGroup.getObjects();

    const mapHeight = map.getMapSize().height * map.getTileSize().height;

    objects.forEach((obj) => {
      const node = new Node("wall");

      // 🔥 FIX trục Y (QUAN TRỌNG)
      node.setPosition(
        new Vec3(obj.x + obj.width / 2, mapHeight - obj.y - obj.height / 2),
      );

      const collider = node.addComponent(BoxCollider2D);
      collider.size = new Size(obj.width, obj.height);

      const rb = node.addComponent(RigidBody2D);
      rb.type = ERigidBody2DType.Static;

      this.node.addChild(node);
    });

    console.log("COLLISION LOADED:", objects.length);
  }
}
