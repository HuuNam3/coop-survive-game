import { _decorator, Component, Node, director } from "cc";
const { ccclass, property } = _decorator;

@ccclass("HomeUI")
export class HomeUI extends Component {
  @property(Node)
  panelMain: Node = null!;

  @property(Node)
  panelCard: Node = null!;

  @property(Node)
  panelTeam: Node = null!;

  /**
   * Hiện MainPanel, tắt các panel khác
   */
  public showMainPanel() {
    this.setPanelActive(true, false, false);
  }

  /**
   * Hiện CardPanel, tắt các panel khác
   */
  public showCardPanel() {
    this.setPanelActive(false, true, false);
  }

  /**
   * Hiện TeamPanel, tắt các panel khác
   */
  public showTeamPanel() {
    this.setPanelActive(false, false, true);
  }

  /**
   * Chuyển sang màn hình Battle nếu đã có đội hình
   */
  public startBattle() {
    const saved = localStorage.getItem("player_team");
    if (saved) {
      try {
        const team = JSON.parse(saved);
        if (Array.isArray(team) && team.length > 0) {
          director.loadScene("Battle");
        } else {
          console.warn("Đội hình trống, vui lòng chọn nhân vật!");
        }
      } catch (e) {
        console.error("Lỗi khi đọc dữ liệu đội hình", e);
      }
    } else {
      console.warn("Chưa có đội hình, vui lòng vào phần Team để chọn!");
    }
  }

  /**
   * Hàm helper để set trạng thái active cho các panel
   */
  private setPanelActive(main: boolean, card: boolean, team: boolean) {
    if (this.panelMain) this.panelMain.active = main;
    if (this.panelCard) this.panelCard.active = card;
    if (this.panelTeam) this.panelTeam.active = team;
  }
}
