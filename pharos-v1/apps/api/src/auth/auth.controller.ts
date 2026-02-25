import { Body, Controller, Post } from "@nestjs/common";
import { LoginSchema } from "@pharos/shared";
import { ZodValidationPipe } from "@/common/zod.pipe";
import { AuthService } from "./auth.service";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  login(@Body(new ZodValidationPipe(LoginSchema)) body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }
}
