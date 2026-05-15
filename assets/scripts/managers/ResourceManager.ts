import {
  _decorator,
  Component,
  resources,
  JsonAsset,
  SpriteFrame,
  sys,
} from "cc";
const { ccclass } = _decorator;

const DATA_VERSION = "1.0.2";
const STORAGE_KEY_DATA = "character_data_cache";
const STORAGE_KEY_VER = "character_data_version";

export type CardData = {
  id: number;
  name: string;
  team: string;
  role: string;
  hp: number;
  atk: number;
  dmgType: string;
  pdef: number;
  mdef: number;
  spd: number;
  crit: number;
  crd: number;
  cast: number;
  passive: string;
  passiveTarget: string;
  passiveType: string;
  basicAttack: string;
  basicType: string;
  basicTarget: string;
  basicDmg: number;
  skill: string;
  skillType: string;
  skillTarget: string;
  skillDmg: number;
};

@ccclass("ResourceManager")
export class ResourceManager extends Component {
  // Singleton
  public static instance: ResourceManager;

  // Data
  private cardList: CardData[] = [];
  private spriteMap: Map<number, SpriteFrame> = new Map();

  onLoad() {
    ResourceManager.instance = this;
  }

  // Load json (Optimized with localStorage & Versioning)
  public loadCardData(): Promise<void> {
    if (this.cardList.length > 0) return Promise.resolve();

    return new Promise((resolve) => {
      const savedVersion = sys.localStorage.getItem(STORAGE_KEY_VER);
      const savedData = sys.localStorage.getItem(STORAGE_KEY_DATA);

      // Nếu version khớp và có dữ liệu thì load từ localStorage
      if (savedVersion === DATA_VERSION && savedData) {
        try {
          this.cardList = JSON.parse(savedData);
          resolve();
          return;
        } catch (e) {
          sys.localStorage.removeItem(STORAGE_KEY_DATA);
        }
      }

      // Ngược lại (hoặc nếu parse lỗi) thì load từ resources
      resources.load("data/character", JsonAsset, (err, data) => {
        if (!err && data) {
          this.cardList = data.json as CardData[];

          // Lưu vào localStorage cho lần sau
          sys.localStorage.setItem(
            STORAGE_KEY_DATA,
            JSON.stringify(this.cardList),
          );
          sys.localStorage.setItem(STORAGE_KEY_VER, DATA_VERSION);
        }
        resolve();
      });
    });
  }

  // Load sprites (UI, effects, etc)
  public loadSprites(): Promise<void> {
    return new Promise((resolve, reject) => {
      resources.loadDir("sprites", SpriteFrame, (err, assets) => {
        assets.forEach((sprite) => {
          const id = parseInt(sprite.name);
          if (!isNaN(id)) {
            this.spriteMap.set(id, sprite);
          }
        });
        resolve();
      });
    });
  }

  // Load characters images
  public loadCharacters(): Promise<void> {
    return new Promise((resolve, reject) => {
      resources.loadDir("characters", SpriteFrame, (err, assets) => {
        assets.forEach((sprite) => {
          const id = parseInt(sprite.name);
          if (!isNaN(id)) {
            this.spriteMap.set(id, sprite);
          }
        });

        resolve();
      });
    });
  }

  // Lấy toàn bộ list
  public getCardList(): CardData[] {
    return this.cardList;
  }

  // Tìm theo id
  public getCardById(id: number): CardData | undefined {
    return this.cardList.find((card) => card.id === id);
  }

  // Lấy theo team
  public getCardsByTeam(team: string): CardData[] {
    return this.cardList.filter((card) => card.team === team);
  }

  // Lấy theo role
  public getCardsByRole(role: string): CardData[] {
    return this.cardList.filter((card) => card.role === role);
  }

  // Lấy sprite theo id
  public getSpriteById(id: number): SpriteFrame | undefined {
    return this.spriteMap.get(id);
  }

  // Lấy toàn bộ sprite
  public getAllSprites(): Map<number, SpriteFrame> {
    return this.spriteMap;
  }
}
