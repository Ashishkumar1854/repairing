const bcrypt = require("bcrypt");

const SALT_ROUNDS = 12;

const hashPassword = (password) => bcrypt.hash(password, SALT_ROUNDS);

const comparePassword = (password, passwordHash) =>
  bcrypt.compare(password, passwordHash);

module.exports = {
  hashPassword,
  comparePassword,
};
