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

const signup = asyncHandler(async (req, res) => {
  const result = await authService.signup(req.validatedData.body);

  return sendSuccess(res, {
    statusCode: 201,
    message: "Owner signup completed",
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

const forgotPassword = asyncHandler(async (req, res) => {
  const result = await authService.forgotPassword(req.validatedData.body);

  return sendSuccess(res, {
    message: "Password reset request accepted",
    data: result,
  });
});

const resetPassword = asyncHandler(async (req, res) => {
  const result = await authService.resetPassword(req.validatedData.body);

  return sendSuccess(res, {
    message: "Password reset successful",
    data: result,
  });
});

const changePassword = asyncHandler(async (req, res) => {
  const result = await authService.changePassword(req.user, req.validatedData.body);

  return sendSuccess(res, {
    message: "Password changed successfully",
    data: result,
  });
});

const getBranchesByEmail = asyncHandler(async (req, res) => {
  const result = await authService.getBranchesByEmail(req.validatedData.query.email);

  return sendSuccess(res, {
    message: "Branches retrieved successfully",
    data: result,
  });
});

module.exports = {
  signup,
  login,
  refresh,
  me,
  logout,
  forgotPassword,
  resetPassword,
  changePassword,
  getBranchesByEmail,
};
