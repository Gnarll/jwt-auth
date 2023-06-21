const uuid = require("uuid");
const UserModel = require("../models/user-model");
const mailService = require("./mail-service");
const bcrypt = require("bcrypt");
const tokenService = require("./token-service");
const UserDto = require("../dtos/user-dto");
const userModel = require("../models/user-model");
const ApiError = require("../exceptions/api-error");

class UserService {
  async registration(email, password) {
    const candidate = await UserModel.findOne({ email });
    if (candidate)
      throw ApiError.BadRequest(
        `Пользователь с адресом ${email} уже существует`
      );

    const hashedPassword = await bcrypt.hash(password, 3);
    const activationLink = uuid.v4();

    const user = await UserModel.create({
      email,
      password: hashedPassword,
      activationLink,
    });
    await mailService.sendActivationMail(
      email,
      `${process.env.API_URL}/api/activate/${activationLink}`
    );

    const userDto = new UserDto(user);
    const tokens = tokenService.generateTokens({ ...userDto });
    await tokenService.saveToken(userDto.id, tokens.refreshToken);

    return { ...tokens, user: userDto };
  }

  async activate(activationLink) {
    const user = await userModel.findOne({ activationLink });
    if (!user) throw ApiError.BadRequest("Некорректная ссылка активации");
    user.isActivated = true;
    await user.save();
  }

  async login(email, password) {
    const user = await userModel.findOne({ email });
    if (!user) return ApiError.BadRequest("Неверно введенный email");
    const isPassEquals = await bcrypt.compare(password, user.password);
    if (!isPassEquals) return ApiError.BadRequest("Неверный пароль");
    const userDto = new UserDto(user);
    const tokens = tokenService.generateTokens({ ...userDto });
    await tokenService.saveToken(userDto.id, tokens.refreshToken);

    return { ...tokens, user: userDto };
  }

  async logout(refreshToken) {
    const token = await tokenService.removeToken(refreshToken);
    return token;
  }

  async refresh(refreshToken) {
    if (!refreshToken) {
      throw ApiError.UnauthorizedError();
    }
    const userData = tokenService.validateRefreshToken(refreshToken);
    const tokenFromDb = tokenService.findToken(refreshToken);
    if (!userData || !tokenFromDb) {
      throw ApiError.UnauthorizedError();
    }
    const user = userModel.findById(userData.id);
    const userDto = new UserDto(user);
    const tokens = tokenService.generateTokens({ ...userDto });
    await tokenService.saveToken(userDto.id, tokens.refreshToken);

    return { ...tokens, user: userDto };
  }

  async getUsers() {
    const users = await userModel.find();
    return users;
  }
}

module.exports = new UserService();
