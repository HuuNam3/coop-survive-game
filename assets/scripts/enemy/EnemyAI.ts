import {
    _decorator,
    Component,
    Node,
    Vec3,
    Animation,
    RigidBody2D,
    math,
} from 'cc';

const { ccclass, property } = _decorator;

enum AIState {
    Idle,
    MoveLeft,
    MoveRight,
    Chase,
}

@ccclass('EnemyAI')
export class EnemyAI extends Component {

    @property(Node)
    player: Node | null = null;

    @property
    speed: number = 100;

    @property
    detectRange: number = 300;

    @property
    attackRange: number = 80;

    @property
    attackDamage: number = 10;

    @property
    attackCooldown: number = 0.5;

    private _anim: Animation | null = null;
    private _rb: RigidBody2D | null = null;

    private _state: AIState = AIState.Idle;

    private _dirX: number = 0;

    private _stateTimer: number = 0;

    private _isAttacking: boolean = false;

    private _lastAttackTime: number = 0;

    start() {

        this._anim =
            this.getComponent(Animation);

        this._rb =
            this.getComponent(RigidBody2D);

        this.chooseRandomState();

    }

    update(dt: number) {

        if (!this.player)
            return;

        const playerPos =
            this.player.worldPosition;

        const enemyPos =
            this.node.worldPosition;

        const distance =
            Vec3.distance(
                playerPos,
                enemyPos
            );

        // ===== DETECT PLAYER =====

        if (distance <= this.detectRange) {

            this.chasePlayer(
                playerPos,
                enemyPos,
                distance
            );

        } else {

            this.randomMove(dt);

        }

    }

    // =========================
    // RANDOM BEHAVIOR
    // =========================

    private chooseRandomState() {

        const rand =
            math.randomRangeInt(0, 3);

        if (rand === 0) {

            this._state =
                AIState.MoveLeft;

            this._dirX = -1;

        }
        else if (rand === 1) {

            this._state =
                AIState.MoveRight;

            this._dirX = 1;

        }
        else {

            this._state =
                AIState.Idle;

            this._dirX = 0;

        }

        // 1–5 seconds

        this._stateTimer =
            math.randomRange(1, 5);

    }

    private randomMove(dt: number) {

        this._stateTimer -= dt;

        if (this._stateTimer <= 0) {

            this.chooseRandomState();

        }

        switch (this._state) {

            case AIState.Idle:

                this.stopMove();

                this.playAnim("idle");

                return;

            case AIState.MoveLeft:
            case AIState.MoveRight:

                this.move();

                this.playAnim("move");

                return;

        }

    }

    // =========================
    // CHASE PLAYER
    // =========================

    private chasePlayer(
        playerPos: Vec3,
        enemyPos: Vec3,
        distance: number
    ) {

        if (distance <= this.attackRange) {

            this.stopMove();

            this.attack();

            return;

        }

        this._state =
            AIState.Chase;

        if (playerPos.x > enemyPos.x)
            this._dirX = 1;
        else
            this._dirX = -1;

        this.move();

        this.playAnim("move");

    }

    // =========================
    // MOVEMENT (PHYSICS SAFE)
    // =========================

    private move() {

        if (!this._rb)
            return;

        const velocity =
            this._rb.linearVelocity;

        velocity.x =
            this._dirX * this.speed;

        this._rb.linearVelocity =
            velocity;

        // flip sprite

        if (this._dirX === -1) {

            if (this.node.scale.x !== -1)
                this.node.setScale(-1, 1, 1);

        }
        else if (this._dirX === 1) {

            if (this.node.scale.x !== 1)
                this.node.setScale(1, 1, 1);

        }

    }

    private stopMove() {

        if (!this._rb)
            return;

        const velocity =
            this._rb.linearVelocity;

        velocity.x = 0;

        this._rb.linearVelocity =
            velocity;

    }

    // =========================
    // ATTACK
    // =========================

    private attack() {

        if (this._isAttacking)
            return;

        const now =
            Date.now() / 1000;

        if (
            now - this._lastAttackTime <
            this.attackCooldown
        )
            return;

        this._lastAttackTime =
            now;

        this._isAttacking =
            true;

        this.playAnim("atk");

        const state =
            this._anim?.getState("atk");

        if (!state) {

            this._isAttacking =
                false;

            return;

        }

        state.once(
            Animation.EventType.FINISHED,
            () => {

                this._isAttacking =
                    false;

            }
        );

        this.dealDamage();

    }

    // =========================
    // DAMAGE PLAYER
    // =========================

    private dealDamage() {

        if (!this.player)
            return;

        const playerCtrl =
            this.player.getComponent(
                "PlayerController"
            ) as any;

        if (!playerCtrl)
            return;

        playerCtrl.takeDamage(
            this.attackDamage
        );

    }

    // =========================
    // ANIMATION
    // =========================

    private playAnim(name: string) {

        if (!this._anim)
            return;

        this._anim.play(name);

    }

}