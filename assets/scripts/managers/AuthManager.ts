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
  // private baseUrl = "http://localhost:4000";
  private baseUrl = "https://backend-survive-game.onrender.com";

  async login(email: string, password: string) {
    try {
      const response = await fetch(`${this.baseUrl}/auth/login`, {
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

  async getMe() {
    try {
      const response = await fetch(`${this.baseUrl}/auth/me`, {
        method: "GET",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: data.message || "Get me failed",
        };
      }

      return {
        success: true,
        data: {
          name: data.name || "Unknown",
          userName: data.username || "Unknown",
          money: data.money ?? 0,
        },
      };
    } catch (error) {
      console.error("GET ME ERROR:", error);
      return {
        success: false,
        message: "Network error",
      };
    }
  }

  async logout() {
    try {
      await fetch(`${this.baseUrl}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });

      console.log("Logged out");
    } catch (error) {
      console.error("LOGOUT ERROR:", error);
    }
  }
}
