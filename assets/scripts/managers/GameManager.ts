import { _decorator, Component, director } from "cc";

import { AuthManager } from "../managers/AuthManager";

const { ccclass } = _decorator;

@ccclass("GameManager")
export class GameManager extends Component {
  async start() {
    const loggedIn = await AuthManager.instance.checkLogin();

    if (loggedIn) {
      director.loadScene("Menu");
    } else {
      director.loadScene("Login");
    }
  }
}
