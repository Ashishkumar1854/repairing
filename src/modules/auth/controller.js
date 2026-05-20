const authService = require("./service");
const asyncHandler = require("../../shared/helpers/asyncHandler");
const { sendSuccess } = require("../../shared/helpers/apiResponse");

const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.validatedData.body);

  return sendSuccess(res, {
    message: "Login successful",
    data: result,
  });
});

const refresh = asyncHandler(async (req, res) => {
  const result = await authService.refresh(req.validatedData.body);

  return sendSuccess(res, {
    message: "Token refreshed",
    data: result,
  });
});

const me = asyncHandler(async (req, res) => {
  const user = await authService.me(req.user);

  return sendSuccess(res, {
    message: "Authenticated staff profile",
    data: {
      user,
    },
  });
});

const logout = asyncHandler(async (req, res) => {
  const result = await authService.logout(req.user);

  return sendSuccess(res, {
    message: "Logout successful",
    data: result,
  });
});

module.exports = {
  login,
  refresh,
  me,
  logout,
};
