import { _decorator } from "cc";
const { ccclass } = _decorator;

@ccclass("AuthManager")
export class AuthManager {
  private static _instance: AuthManager;

  static get instance() {
    if (!this._instance) {
      this._instance = new AuthManager();
    }
    return this._instance;
  }

  // API của bạn chạy port 4000
  // private baseUrl = "http://127.0.0.1:4000";
  private publicUrl = "https://backend-survive-game.onrender.com";

  async login(email: string, password: string) {
    try {
      console.log("Calling API:", `${this.publicUrl}/auth/login`);

      const response = await fetch(`${this.publicUrl}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },

        // nếu dùng cookie
        credentials: "include",

        body: JSON.stringify({
          username: email,
          password,
        }),
      });

      console.log("Status:", response.status);

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: data.message || "Login failed",
        };
      }

      return {
        success: true,
        user: data.user,
      };
    } catch (error) {
      console.error("LOGIN ERROR:", error);

      return {
        success: false,
        message: "Network error",
      };
    }
  }

  async checkLogin() {
    try {
      const response = await fetch(`${this.publicUrl}/auth/me`, {
        method: "GET",
        credentials: "include",
      });

      console.log("Check login status:", response.status);

      return response.ok;
    } catch (error) {
      console.error("CHECK LOGIN ERROR:", error);
      return false;
    }
  }

  async logout() {
    try {
      await fetch(`${this.publicUrl}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });

      console.log("Logged out");
    } catch (error) {
      console.error("LOGOUT ERROR:", error);
    }
  }
}
