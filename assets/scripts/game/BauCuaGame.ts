import {
    _decorator,
    Component,
    Button,
    RichText,
    Label,
    Color
} from 'cc';

const { ccclass, property } = _decorator;

@ccclass('BauCuaGame')
export class BauCuaGame extends Component {

    // 💰 Hiển thị tiền
    @property(RichText)
    moneyText: RichText = null!;

    // 🎯 6 ô cược
    @property([Button])
    betButtons: Button[] = [];

    // 🎲 3 kết quả
    @property([Button])
    resultButtons: Button[] = [];

    // 💵 12 mức cược
    @property([Button])
    betValueButtons: Button[] = [];

    // 🔁 chơi lại
    @property(Button)
    replayButton: Button = null!;

    // =========================
    // DATA
    // =========================
    private money: number = 100000;
    private currentBetValue: number = 1000;

    private bets: number[] = [0, 0, 0, 0, 0, 0];
    private results: number[] = [-1, -1, -1];
    private openedResults: boolean[] = [false, false, false];

    private selectedBetIndex: number = 0;
    private hasRolled: boolean = false;

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
        this.moneyText.string = `<color=#FFD700>${this.money}₫</color>`;
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
            label.string = `${this.animals[index]}\n${this.bets[index]}`;
        } else {
            label.string = `${this.animals[index]}`; // ❌ bỏ số 0
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
            const label = btn.getComponentInChildren(Label);
            if (label) label.string = '?';

            btn.node.on(Button.EventType.CLICK, () => {
                this.openResult(index);
            });
        });
    }

    rollDice() {
        this.hasRolled = true;

        for (let i = 0; i < 3; i++) {
            this.results[i] = Math.floor(Math.random() * 6);
            this.openedResults[i] = false;

            const label = this.resultButtons[i].getComponentInChildren(Label);
            if (label) label.string = '?';
        }

        this.replayButton.interactable = false;

        console.log('Kết quả:', this.results);
    }

    openResult(index: number) {

        // ❌ chưa cược
        if (!this.hasAnyBet()) return;

        // ❌ chưa roll -> tự roll
        if (!this.hasRolled) {
            this.rollDice();
        }

        // ❌ đã mở
        if (this.openedResults[index]) return;

        const result = this.results[index];
        if (result === -1) return;

        this.openedResults[index] = true;

        const label = this.resultButtons[index].getComponentInChildren(Label);
        if (label) {
            label.string = this.animals[result];
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
            if (label) label.string = value.toString();

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
                label.color = new Color(255, 215, 0); // vàng
            } else {
                label.color = new Color(0, 0, 0); // đen
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

        // reset cược
        this.bets = [0, 0, 0, 0, 0, 0];

        this.betButtons.forEach((_, i) => {
            this.updateBetButtonText(i);
        });

        // reset result data
        this.results = [-1, -1, -1];
        this.openedResults = [false, false, false];

        // ⚠️ reset UI result về "?"
        for (let i = 0; i < this.resultButtons.length; i++) {
            const label = this.resultButtons[i].getComponentInChildren(Label);
            if (label) {
                label.string = '?';
            }
        }

        this.replayButton.interactable = false;
    }
}