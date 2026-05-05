import {
    _decorator,
    Component,
    Button,
    RichText,
    Label,
    Color,
    Sprite, 
    SpriteFrame
} from 'cc';

import { MathUtil } from '../utils/MathUtil';

const { ccclass, property } = _decorator;

@ccclass('BauCuaGame')
export class BauCuaGame extends Component {

    @property(RichText)
    moneyText: RichText = null!;

    @property([Button])
    betButtons: Button[] = [];

    @property([Button])
    resultButtons: Button[] = [];

    @property([SpriteFrame])
    animalSprites: SpriteFrame[] = []; // 6 con

    @property(SpriteFrame)
    unknownSprite: SpriteFrame = null!; // ảnh chưa mở

    @property([Button])
    betValueButtons: Button[] = [];

    @property(Button)
    replayButton: Button = null!;

    // =========================
    private money: number = 100000;
    private currentBetValue: number = 1000;

    private bets: number[] = [0, 0, 0, 0, 0, 0];
    private results: number[] = [-1, -1, -1];
    private openedResults: boolean[] = [false, false, false];

    private selectedBetIndex: number = 0;
    private hasRolled: boolean = false;
    private isBetLocked: boolean = false;

    private animals = ['🦌','🍐','🐓','🐟','🦀','🦐'];

    // =========================
    start() {
        this.updateMoneyUI();
        this.initBetButtons();
        this.initResultButtons();
        this.initBetValueButtons();

        this.replayButton.interactable = false;
    }

    // =========================
    // 💰 MONEY
    // =========================
    updateMoneyUI() {
        const formatted = MathUtil.formatNumber(this.money);
        this.moneyText.string = `<color=#FFFFFF>Tiền của bạn: </color><color=#FFD700>${formatted}</color>`;
    }

    // =========================
    // 🎯 BET
    // =========================
    initBetButtons() {
        this.betButtons.forEach((btn, index) => {
            this.updateBetButtonText(index);

            btn.node.on(Button.EventType.CLICK, () => {
                this.placeBet(index);
            });
        });
    }

    placeBet(index: number) {
        // ❌ đã khóa cược
        if (this.isBetLocked) return;

        if (this.money < this.currentBetValue) return;

        this.money -= this.currentBetValue;
        this.bets[index] += this.currentBetValue;

        this.updateMoneyUI();
        this.updateBetButtonText(index);
    }

    updateBetButtonText(index: number) {
        const label = this.betButtons[index].getComponentInChildren(Label);
        if (!label) return;

        if (this.bets[index] > 0) {
            label.string = `\n${MathUtil.formatNumber(this.bets[index])}`;
        } else {
            label.string = '';
        }
    }

    hasAnyBet(): boolean {
        return this.bets.some(v => v > 0);
    }

    // =========================
    // 🎲 RESULT
    // =========================
    initResultButtons() {
        this.resultButtons.forEach((btn, index) => {
            const sprite = btn.getComponent(Sprite);
            if (sprite) {
                sprite.spriteFrame = this.unknownSprite;
            }

            btn.node.on(Button.EventType.CLICK, () => {
                this.openResult(index);
            });
        });
    }

    rollDice() {
        this.hasRolled = true;
        this.isBetLocked = true;

        for (let i = 0; i < 3; i++) {
            this.results[i] = Math.floor(Math.random() * 6);
            this.openedResults[i] = false;

            const sprite = this.resultButtons[i].getComponent(Sprite);
            if (sprite) {
                sprite.spriteFrame = this.unknownSprite;
            }
        }

        this.replayButton.interactable = false;
    }

    openResult(index: number) {

        if (!this.hasAnyBet()) return;

        if (!this.hasRolled) {
            this.rollDice();
        }

        if (this.openedResults[index]) return;

        const result = this.results[index];
        if (result === -1) return;

        this.openedResults[index] = true;

        // 🎲 set sprite
        const sprite = this.resultButtons[index].getComponent(Sprite);
        if (sprite) {
            sprite.spriteFrame = this.animalSprites[result];
        }

        // 💰 HIỂN THỊ + / -
        const label = this.resultButtons[index].getComponentInChildren(Label);
        if (label) {
            const bet = this.bets[result];

            if (bet > 0) {
                // ✅ trúng
                const win = bet * 2;

                label.string = `+${MathUtil.formatNumber(win)}`;
                label.color = new Color(0, 255, 0);
            }
        }

        // mở hết
        if (this.openedResults.every(v => v)) {
            this.calculateResult();
            this.replayButton.interactable = true;
        }
    }

    // =========================
    // 💵 BET VALUE
    // =========================
    initBetValueButtons() {
        const values = [
            1000, 2000, 5000,
            10000, 20000, 50000,
            100000, 200000, 500000,
            1000000, 2000000, 5000000
        ];

        this.betValueButtons.forEach((btn, index) => {
            const value = values[index];

            const label = btn.getComponentInChildren(Label);
            if (label) {
                label.string = MathUtil.formatNumber(value);
            }

            btn.node.on(Button.EventType.CLICK, () => {
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
            if (!label) return;

            if (index === this.selectedBetIndex) {
                label.color = new Color(255, 215, 0);
            } else {
                label.color = new Color(255, 255, 255);
            }
        });
    }

    // =========================
    // 🧮 CALCULATE
    // =========================
    calculateResult() {
        let reward = 0;

        for (let i = 0; i < 6; i++) {
            if (this.bets[i] <= 0) continue;

            let count = this.results.filter(r => r === i).length;

            if (count > 0) {
                reward += this.bets[i] * (count + 1);
            }
        }

        this.money += reward;
        this.updateMoneyUI();
    }

    // =========================
    // 🔁 REPLAY
    // =========================
    onReplay() {
        this.hasRolled = false;
        this.isBetLocked = false; // ✅ mở lại cược

        this.bets = [0, 0, 0, 0, 0, 0];

        this.betButtons.forEach((_, i) => {
            this.updateBetButtonText(i);
        });

        this.results = [-1, -1, -1];
        this.openedResults = [false, false, false];

        for (let i = 0; i < this.resultButtons.length; i++) {
            const label = this.resultButtons[i].getComponentInChildren(Label);
            if (label) label.string = '?';
        }

        this.replayButton.interactable = false;

        for (let i = 0; i < this.resultButtons.length; i++) {
            const sprite = this.resultButtons[i].getComponent(Sprite);
            if (sprite) {
                sprite.spriteFrame = this.unknownSprite;
            }
        }
    }
}