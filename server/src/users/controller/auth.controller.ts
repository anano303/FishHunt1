import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  UseGuards,
  Res,
  Req,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Roles } from '@/decorators/roles.decorator';
import { Role } from '@/types/role.enum';
import { RolesGuard } from '@/guards/roles.guard';
import { CurrentUser } from 'src/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { LocalAuthGuard } from 'src/guards/local-auth.guard';
import { Serialize } from 'src/interceptors/serialize.interceptor';
import { ProfileDto } from '../dtos/profile.dto';
import { RegisterDto } from '../dtos/register.dto';
import { UserDto } from '../dtos/user.dto';
import { UserDocument } from '../schemas/user.schema';
import { AuthService } from '../services/auth.service';
import { UsersService } from '../services/users.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthResponseDto, LoginDto } from '../dtos/auth.dto';
import { NotAuthenticatedGuard } from '@/guards/not-authenticated.guard';
import { Response, Request } from 'express';
import { cookieConfig } from '@/cookie-config';
import { SellerRegisterDto } from '../dtos/seller-register.dto';
import { GoogleAuthGuard } from '@/guards/google-oauth.guard';
import { ForgotPasswordDto } from '../dtos/forgot-password.dto';
import { ResetPasswordDto } from '../dtos/reset-password.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
  })
  @UseGuards(NotAuthenticatedGuard, LocalAuthGuard)
  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    try {
      const user = await this.authService.validateUser(
        loginDto.email,
        loginDto.password,
      );

      const { tokens, user: userData } = await this.authService.login(user);

      // Clear existing cookies
      response.clearCookie('access_token', { 
        path: '/',
        secure: true,
        sameSite: 'none'
      });
      response.clearCookie('refresh_token', {
        path: '/',
        secure: true,
        sameSite: 'none'
      });

      // Set new cookies with explicit headers
      response.header('Access-Control-Allow-Credentials', 'true');
      response.cookie('access_token', tokens.accessToken, {
        ...cookieConfig.access.options,
        secure: true,
        sameSite: 'none',
      });

      response.cookie('refresh_token', tokens.refreshToken, {
        ...cookieConfig.refresh.options,
        secure: true,
        sameSite: 'none',
      });

      return { user: userData };
    } catch (error) {
      console.error('Login error:', error);
      throw new UnauthorizedException('Invalid credentials');
    }
  }

  @Serialize(UserDto)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.User, Role.Seller)
  @Get('profile')
  getProfile(@CurrentUser() user: UserDocument) {
    return user;
  }

  @Post('refresh')
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    try {
      const refreshToken = request.cookies['refresh_token'];
      if (!refreshToken) {
        throw new UnauthorizedException('No refresh token');
      }

      const tokens = await this.authService.refresh(refreshToken);

      // Clear old cookies first
      response.clearCookie('access_token');
      response.clearCookie('refresh_token');

      // Set new cookies
      response.cookie(
        cookieConfig.access.name,
        tokens.accessToken,
        cookieConfig.access.options
      );
      
      response.cookie(
        cookieConfig.refresh.name,
        tokens.refreshToken,
        cookieConfig.refresh.options
      );

      return { success: true };
    } catch (error) {
      response.clearCookie('access_token');
      response.clearCookie('refresh_token');
      throw error;
    }
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async auth() {}

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleAuthRedirect(
    @Req() req,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const { tokens, user } = await this.authService.singInWithGoogle({
        email: req.user.email,
        name: req.user.name || 'Google User', // 👈 თუ სახელი არ არის, default მნიშვნელობა
        id: req.user.id,
      });
      console.log('🍪 Setting cookies:', tokens);
      res.cookie(
        'access_token',
        tokens.accessToken,
        cookieConfig.access.options,
      );
      res.cookie(
        'refresh_token',
        tokens.refreshToken,
        cookieConfig.refresh.options,
      );
      console.log('✅ Cookies set successfully');
      res.redirect(`${process.env.ALLOWED_ORIGINS}/`);
    } catch (error) {
      console.error('Google auth error:', error);
      res.redirect(`${process.env.ALLOWED_ORIGINS}/login?error=auth_failed`);
    }
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(
    @CurrentUser() user: UserDocument,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.logout(user._id.toString());

    response.clearCookie('access_token', {
      httpOnly: true,
      secure:
        process.env.NODE_ENV === 'production' ||
        process.env.NODE_ENV === 'development'
          ? true
          : false,
      sameSite: 'none',
      path: '/', // Ensure the correct path

      maxAge: 0,
    });

    response.clearCookie('refresh_token', {
      httpOnly: true,
      secure:
        process.env.NODE_ENV === 'production' ||
        process.env.NODE_ENV === 'development'
          ? true
          : false,
      sameSite: 'none',
      path: '/', // Ensure the correct path

      maxAge: 0,
    });

    return { success: true };
  }
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error',
  })
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    const user = await this.usersService.create(registerDto);
    return this.authService.login(user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.User, Role.Seller)
  @Put('profile')
  async updateProfile(
    @CurrentUser() user: UserDocument,
    @Body() updateDto: ProfileDto,
  ) {
    return this.usersService.update(user._id.toString(), updateDto);
  }

  @ApiOperation({ summary: 'Register a new seller' })
  @ApiResponse({
    status: 201,
    description: 'Seller successfully registered',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error',
  })
  @Post('sellers-register')
  async registerSeller(@Body() sellerRegisterDto: SellerRegisterDto) {
    try {
      const seller = await this.usersService.createSeller(sellerRegisterDto);
      const { tokens, user } = await this.authService.login(seller);

      return { tokens, user };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw new ConflictException(error.message);
      }
      throw new BadRequestException('Registration failed');
    }
  }

  @Post('forgot-password')
  async forgotPassword(@Body() { email }: ForgotPasswordDto) {
    await this.authService.requestPasswordReset(email);
    return {
      message:
        'თუ თქვენი მეილი სისტემაში არსებობს, პაროლის აღდგენის ბმული გამოგეგზავნებათ.',
    };
  }
  @Post('reset-password')
  async resetPassword(@Body() { token, newPassword }: ResetPasswordDto) {
    await this.authService.resetPassword(token, newPassword);
    return { message: 'Password reset successful. You can now log in.' };
  }
}
