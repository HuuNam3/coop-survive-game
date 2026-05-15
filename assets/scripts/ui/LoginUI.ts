import { _decorator, Component, EditBox, Label, director } from "cc";

import { AuthManager } from "../managers/AuthManager";

const { ccclass, property } = _decorator;

@ccclass("LoginUI")
export class LoginUI extends Component {
  @property(EditBox)
  emailInput: EditBox = null;

  @property(EditBox)
  passwordInput: EditBox = null;

  @property(Label)
  messageLabel: Label = null;

  async start() {
    const res = await AuthManager.instance.getMe();
    if (res.success) {
      this.messageLabel.string =
        "Đã đăng nhập tài khoản, đang chuyển sang màn hình chính...";
      director.loadScene("Home");
    }
  }

  async onLoginClick() {
    const email = this.emailInput.string;
    const password = this.passwordInput.string;

    if (!email || !password) {
      this.messageLabel.string = "Vui lòng nhập Email và Password";
      return;
    }

    this.messageLabel.string = "Đang đăng nhập...";

    const result = await AuthManager.instance.login(email, password);

    if (!result.success) {
      this.messageLabel.string = result.message;
      return;
    }

    this.messageLabel.string = "Đang chuyển sang màn hình chính...";

    // chuyển sang Menu scene
    director.loadScene("Home");
  }
}
