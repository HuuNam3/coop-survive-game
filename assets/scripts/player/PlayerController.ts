import {
    _decorator,
    Component,
    Vec3,
    input,
    Input,
    EventKeyboard,
    KeyCode,
    RigidBody2D,
    Collider2D,
    Contact2DType,
    Animation,
} from 'cc';

const { ccclass, property } = _decorator;

@ccclass('PlayerController')
export class PlayerController extends Component {

    @property
    speed: number = 200;

    @property
    jumpForce: number = 10;

    @property
    debug: boolean = true;

    @property
    maxHp: number = 100;

    @property
    attackPower: number = 10;

    @property
    armor: number = 0;

    private _attackCooldown: number = 0.5; // 0.5s
    private _lastAttackTime: number = 0;

    private _hp: number = 100;
    private _isDead: boolean = false;

    private _dirX: number = 0;

    private _rb: RigidBody2D | null = null;
    private _isGrounded: boolean = true;
    private _isAttacking: boolean = false;

    private _anim: Animation | null = null;
    private _currentAnim: string = '';

    private _tmpPos = new Vec3();

    start() {
        this._hp = this.maxHp;
        this._rb = this.getComponent(RigidBody2D);
        this._anim = this.getComponent(Animation);

        const collider = this.getComponent(Collider2D);

        if (collider) {
            collider.on(
                Contact2DType.BEGIN_CONTACT,
                this.onBeginContact,
                this
            );
        }

        if (this._rb) {
            this._rb.fixedRotation = true;
        }

        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);

        console.log("Player ready");

        this.playAnim('idle');
    }

    update(dt: number) {

        if (this._dirX === 0) {

            if (this._isGrounded && !this._isAttacking) {
                this.playAnim('idle');
            }

            return;
        }

        // ---- MOVE ----

        this._tmpPos.set(this.node.position);

        this._tmpPos.x += this._dirX * this.speed * dt;

        this.node.setPosition(this._tmpPos);

        // ---- FACING ----

        if (this._dirX === -1) {

            if (this.node.scale.x !== -1) {
                this.node.setScale(-1, 1, 1);
            }

        } else {

            if (this.node.scale.x !== 1) {
                this.node.setScale(1, 1, 1);
            }

        }

        // ---- ANIMATION ----

        if (this._isGrounded && !this._isAttacking) {
            this.playAnim('move');
        }

    }

    private onKeyDown(event: EventKeyboard) {

        console.log("Key down:", event.keyCode);

        switch (event.keyCode) {

            case KeyCode.KEY_A:
                this._dirX = -1;
                break;

            case KeyCode.KEY_D:
                this._dirX = 1;
                break;

            case KeyCode.SPACE:
                this.jump();
                break;

            case KeyCode.KEY_J:
                this.attack();
                break;

            case KeyCode.KEY_W:
                this.interact();
                break;
        }
    }

    private onKeyUp(event: EventKeyboard) {

        switch (event.keyCode) {

            case KeyCode.KEY_A:
                if (this._dirX === -1)
                    this._dirX = 0;
                break;

            case KeyCode.KEY_D:
                if (this._dirX === 1)
                    this._dirX = 0;
                break;
        }
    }

    private jump() {

        if (!this._rb || !this._isGrounded)
            return;

        const velocity =
            this._rb.linearVelocity;

        velocity.y = this.jumpForce;

        this._rb.linearVelocity = velocity;

        this._isGrounded = false;

        this.playAnim('jump');
    }

    private attack() {

        if (this._isAttacking || this._isDead)
            return;

        const now = Date.now() / 1000;

        if (now - this._lastAttackTime < this._attackCooldown)
            return;

        this._lastAttackTime = now;

        this._isAttacking = true;

        this.playAnim('atk');

        const state =
            this._anim?.getState('atk');

        if (!state) {

            this._isAttacking = false;

            return;

        }

        state.once(
            Animation.EventType.FINISHED,
            () => {

                this._isAttacking = false;

                this.updateAnimationAfterAttack();

            }
        );

    }

    private updateAnimationAfterAttack() {

        if (!this._isGrounded) {

            this.playAnim('jump');
            return;

        }

        if (this._dirX !== 0) {

            this.playAnim('move');

        } else {

            this.playAnim('idle');

        }

    }

    takeDamage(damage: number) {

        if (this._isDead)
            return;

        // Công thức giảm sát thương theo giáp
        const finalDamage =
            Math.max(1, damage - this.armor);

        this._hp -= finalDamage;

        console.log(
            "Nhận damage:",
            finalDamage,
            "HP còn:",
            this._hp
        );

        // Animation bị đánh (nếu có)
        this.playAnim("hurt");

        if (this._hp <= 0) {

            this.die();

        }

    }

    die() {

        if (this._isDead)
            return;

        this._isDead = true;

        this.playAnim("dead");

        console.log("Player chết");

        // Tắt điều khiển
        this.enabled = false;

    }

    heal(amount: number) {

        if (this._isDead)
            return;

        this._hp += amount;

        if (this._hp > this.maxHp) {

            this._hp = this.maxHp;

        }

        console.log(
            "Hồi máu:",
            amount,
            "HP:",
            this._hp
        );

    }

    private interact() {

        console.log("Interact key pressed");

    }

    private playAnim(name: string) {

        if (!this._anim)
            return;

        if (this._currentAnim === name)
            return;

        this._anim.play(name);

        this._currentAnim = name;

    }

    private onBeginContact() {

        this._isGrounded = true;

    }

}