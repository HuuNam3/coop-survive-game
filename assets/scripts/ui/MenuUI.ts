import {
  _decorator,
  Component,
  director,
} from "cc";

const { ccclass } = _decorator;

@ccclass("MenuUI")
export class MenuUI extends Component {
  onPlayClick() {
    director.loadScene("Game");
  }

  onLogoutClick() {
    director.loadScene("Login");
  }
}