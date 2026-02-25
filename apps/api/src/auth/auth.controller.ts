import { Body, Controller, Post } from "@nestjs/common";
import { LoginSchema } from "@pharos/shared";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { AuthService } from "./auth.service";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  async login(@Body(new ZodValidationPipe(LoginSchema)) body: { email: string; password: string }) {
    return this.authService.login(body);
  }

  @Post("logout")
  async logout() {
    return { ok: true };
  }
}
