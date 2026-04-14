import {
  _decorator,
  Component,
  EditBox,
  Label,
  director,
} from "cc";

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

  async onLoginClick() {
    const email = this.emailInput.string;
    const password = this.passwordInput.string;

    if (!email || !password) {
      this.messageLabel.string =
        "Please enter email and password";
      return;
    }

    this.messageLabel.string = "Logging in...";

    const result =
      await AuthManager.instance.login(
        email,
        password
      );

    if (!result.success) {
      this.messageLabel.string =
        result.message;
      return;
    }

    this.messageLabel.string =
      "Login successful";

    // chuyển sang Menu scene
    director.loadScene("Menu");
  }
}