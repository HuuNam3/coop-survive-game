import { CardData } from "../managers/ResourceManager";

export interface StatusEffect {
  id: string;
  type:
    | "pdef_down"
    | "mdef_down"
    | "atk_down"
    | "spd_down"
    | "burn"
    | "poison"
    | "bleed"
    | "stun"
    | "taunt";
  value: number;
  duration: number;
  stacks: number;
  maxStacks: number;
}

export class BattleUnit {
  public data: CardData;
  public currentHP: number;
  public maxHP: number;
  public currentCast: number;
  public isDead: boolean = false;
  public teamSide: "player" | "enemy";
  public gridIndex: number;

  public atk: number;
  public pdef: number;
  public mdef: number;
  public spd: number;
  public crit: number;
  public crd: number;

  public effects: StatusEffect[] = [];
  public node: any = null; // Reference to visual node

  constructor(data: CardData, side: "player" | "enemy", gridIndex: number) {
    this.data = data;
    this.teamSide = side;
    this.gridIndex = gridIndex;
    this.maxHP = data.hp;
    this.currentHP = this.maxHP;
    this.atk = data.atk;
    this.pdef = data.pdef;
    this.mdef = data.mdef;
    this.spd = data.spd;
    this.crit = data.crit;
    this.crd = data.crd;
    this.currentCast = 0;
  }

  public takeDamage(amount: number) {
    this.currentHP -= amount;
    if (this.currentHP <= 0) {
      this.currentHP = 0;
      this.isDead = true;
    }
  }

  public heal(amount: number) {
    if (this.isDead) return 0;
    const oldHP = this.currentHP;
    this.currentHP = Math.min(this.maxHP, this.currentHP + amount);
    return this.currentHP - oldHP;
  }

  public addCast(amount: number) {
    if (this.isDead) return 0;
    const oldCast = this.currentCast;
    this.currentCast = Math.min(this.data.cast, this.currentCast + amount);
    return this.currentCast - oldCast;
  }

  public applyEffect(effect: StatusEffect) {
    const existing = this.effects.find((e) => e.id === effect.id);
    if (existing) {
      existing.duration = effect.duration;
      if (existing.stacks < existing.maxStacks) existing.stacks += 1;
    } else {
      this.effects.push({ ...effect });
    }
  }

  public updateEffects() {
    this.effects.forEach((e) => (e.duration -= 1));
    this.effects = this.effects.filter((e) => e.duration > 0);
  }

  public getActualPDef(): number {
    let reduction = 0;
    this.effects
      .filter((e) => e.type === "pdef_down")
      .forEach((e) => {
        reduction += this.pdef * e.value * e.stacks;
      });
    return Math.max(0, this.pdef - reduction);
  }
}

export class HandleBattle {
  public static calculateDamage(
    attacker: BattleUnit,
    target: BattleUnit,
    type: "basic" | "skill",
  ): { damage: number; isCrit: boolean } {
    const isCrit = Math.random() * 100 < attacker.crit;
    const multi =
      type === "basic" ? attacker.data.basicDmg : attacker.data.skillDmg;

    // 1. Tính sát thương thô (theo chỉ số atk và % chiêu thức)
    let rawDmg = attacker.atk * (multi / 100);
    if (isCrit) rawDmg *= attacker.crd / 100;

    // 2. Trừ phòng thủ
    const def =
      attacker.data.dmgType === "physical"
        ? target.getActualPDef()
        : target.mdef;
    let netDmg = Math.max(1, rawDmg - def);

    // 3. Tính khắc hệ trên sát thương thực tế
    const elementalMulti = this.getElementalMultiplier(
      attacker.data.team,
      target.data.team,
    );
    const finalDmg = Math.round(netDmg * elementalMulti);

    return { damage: Math.max(1, finalDmg), isCrit };
  }

  public static getElementalMultiplier(
    attackerTeam: string,
    targetTeam: string,
  ): number {
    // Fire > Nature > Water > Fire
    if (attackerTeam === "fire" && targetTeam === "nature") return 1.5;
    if (attackerTeam === "nature" && targetTeam === "water") return 1.5;
    if (attackerTeam === "water" && targetTeam === "fire") return 1.5;

    // Ngược lại bị khắc
    if (attackerTeam === "nature" && targetTeam === "fire") return 0.75;
    if (attackerTeam === "water" && targetTeam === "nature") return 0.75;
    if (attackerTeam === "fire" && targetTeam === "water") return 0.75;

    return 1.0;
  }

  public static findTargets(
    attacker: BattleUnit,
    playerTeam: BattleUnit[],
    enemyTeam: BattleUnit[],
    targetType: string,
  ): BattleUnit[] {
    const enemies = attacker.teamSide === "player" ? enemyTeam : playerTeam;
    const allies = attacker.teamSide === "player" ? playerTeam : enemyTeam;
    const aliveEnemies = enemies.filter((e) => !e.isDead);
    const aliveAllies = allies.filter((a) => !a.isDead);

    switch (targetType) {
      case "enemy_single":
        const colIndex = (attacker.gridIndex - 1) % 3;
        const preferred = [colIndex + 1, colIndex + 4, colIndex + 7];
        let target =
          aliveEnemies.find((e) => preferred.indexOf(e.gridIndex) !== -1) ||
          aliveEnemies.sort((a, b) => a.gridIndex - b.gridIndex)[0];
        return target ? [target] : [];
      case "enemy_all":
        return aliveEnemies;
      case "enemy_row":
        return aliveEnemies.filter((e) => e.gridIndex <= 3);
      case "enemy_random":
        return aliveEnemies.length > 0
          ? [aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)]]
          : [];
      case "ally_all":
        return aliveAllies;
      case "ally_lowest":
        return aliveAllies.length > 0
          ? [aliveAllies.sort((a, b) => a.currentHP - b.currentHP)[0]]
          : [];
      case "ally_single_lowest":
        return aliveAllies.length > 0
          ? [aliveAllies.sort((a, b) => a.currentHP - b.currentHP)[0]]
          : [];
      case "self":
        return [attacker];
      default:
        return aliveEnemies.length > 0 ? [aliveEnemies[0]] : [];
    }
  }

  public static applySideEffects(
    attacker: BattleUnit,
    target: BattleUnit,
    type: "basic" | "skill",
  ): { heal?: number; cast?: number } {
    const skillType =
      type === "basic" ? attacker.data.basicType : attacker.data.skillType;
    const skillDmg =
      type === "basic" ? attacker.data.basicDmg : attacker.data.skillDmg;
    if (!skillType) return {};

    let result: { heal?: number; cast?: number } = {};

    // 1. Xử lý Heal
    if (skillType.indexOf("heal_atk") !== -1) {
      const amount = Math.floor(attacker.atk * (skillDmg / 100));
      result.heal = target.heal(amount);
    } else if (skillType.indexOf("heal_percent") !== -1) {
      const amount = Math.floor(target.maxHP * (skillDmg / 100));
      result.heal = target.heal(amount);
    }

    // 2. Xử lý Debuff/Effect
    if (skillType.indexOf("burn") !== -1) {
      const parts = skillType.split("_");
      const rate = parts[1] ? parseInt(parts[1].replace("rate", "")) : 25;
      const duration = parts[3] ? parseInt(parts[3]) : 2;
      if (Math.random() * 100 < rate) {
        target.applyEffect({
          id: "burn",
          type: "burn",
          value: 0.1,
          duration,
          stacks: 1,
          maxStacks: 3,
        });
      }
    }

    if (skillType.indexOf("stun") !== -1) {
      const parts = skillType.split("_");
      const rate = parts[1] ? parseInt(parts[1].replace("rate", "")) : 20;
      if (Math.random() * 100 < rate) {
        target.applyEffect({
          id: "cc_effect",
          type: "stun",
          value: 1,
          duration: 1,
          stacks: 1,
          maxStacks: 1,
        });
      }
    }

    return result;
  }

  public static handleOnKill(attacker: BattleUnit): number {
    const skillType = attacker.data.skillType;
    if (skillType && skillType.indexOf("increaseCast_onKill") !== -1) {
      const amount = parseInt(skillType.split("_").pop() || "0");
      return attacker.addCast(amount);
    }
    return 0;
  }

  public static getTurnQueue(
    playerTeam: BattleUnit[],
    enemyTeam: BattleUnit[],
  ): BattleUnit[] {
    const pQueue = playerTeam
      .filter((u) => !u.isDead)
      .sort((a, b) => b.spd - a.spd);
    const eQueue = enemyTeam
      .filter((u) => !u.isDead)
      .sort((a, b) => b.spd - a.spd);

    const turnQueue: BattleUnit[] = [];
    let consecutivePlayer = 0;
    let consecutiveEnemy = 0;

    while (pQueue.length > 0 || eQueue.length > 0) {
      let nextUnit: BattleUnit;
      if (consecutivePlayer >= 2 && eQueue.length > 0)
        nextUnit = eQueue.shift()!;
      else if (consecutiveEnemy >= 2 && pQueue.length > 0)
        nextUnit = pQueue.shift()!;
      else {
        if (pQueue.length > 0 && eQueue.length > 0) {
          nextUnit =
            pQueue[0].spd >= eQueue[0].spd ? pQueue.shift()! : eQueue.shift()!;
        } else nextUnit = pQueue.shift() || eQueue.shift()!;
      }

      if (nextUnit.teamSide === "player") {
        consecutivePlayer++;
        consecutiveEnemy = 0;
      } else {
        consecutiveEnemy++;
        consecutivePlayer = 0;
      }
      turnQueue.push(nextUnit);
    }
    return turnQueue;
  }
}
