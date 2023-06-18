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
}

module.exports = new UserService();
