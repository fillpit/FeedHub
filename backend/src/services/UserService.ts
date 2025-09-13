import { injectable } from "inversify";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { config } from "../config";
import User from "../models/User";
import GlobalSetting from "../models/GlobalSetting";

@injectable()
export class UserService {
  private isValidInput(input: string): boolean {
    // 检查是否包含空格或汉字
    const regex = /^[^\s\u4e00-\u9fa5]+$/;
    return regex.test(input);
  }

  async register(username: string, password: string, registerCode: string) {
    // 验证输入
    if (!this.isValidInput(username) || !this.isValidInput(password)) {
      throw new Error("用户名、密码或注册码不能包含空格或汉字");
    }

    // 检查用户名是否已存在
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      throw new Error("用户名已存在");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ username, password: hashedPassword, role: 0 });

    return {
      data: user,
      message: "用户注册成功",
    };
  }

  async login(username: string, password: string) {
    console.log(`[UserService] 开始登录流程，用户名: ${username}`);
    
    try {
      // 查找用户
      console.log(`[UserService] 正在查找用户: ${username}`);
      const user = await User.findOne({ where: { username } });
      
      if (!user) {
        console.log(`[UserService] 用户不存在: ${username}`);
        throw new Error("用户名或密码错误");
      }
      
      console.log(`[UserService] 找到用户，ID: ${user.id}, 角色: ${user.role}`);
      
      // 验证密码
      console.log(`[UserService] 正在验证密码`);
      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      if (!isPasswordValid) {
        console.log(`[UserService] 密码验证失败`);
        throw new Error("用户名或密码错误");
      }
      
      console.log(`[UserService] 密码验证成功，正在生成token`);
      
      // 生成token
      const token = jwt.sign({ userId: user.userId, role: user.role, username: user.username }, config.jwtSecret, {
        expiresIn: "6h",
      });
      
      console.log(`[UserService] Token生成成功，登录完成`);
      
      return {
        data: {
          token,
          user: {
            id: user.id,
            userId: user.userId,
            username: user.username,
            role: user.role,
          },
        },
      };
    } catch (error) {
      console.error(`[UserService] 登录过程中发生错误:`, error);
      throw error;
    }
  }
}
