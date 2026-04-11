const crypto = require("crypto");

const SALT_LENGTH = 16;
const KEY_LENGTH = 64;
const DIGEST = "sha512";

function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(SALT_LENGTH).toString("hex");
    crypto.scrypt(password, salt, KEY_LENGTH, { maxmem: 128 * 1024 * 1024 }, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(`${salt}:${derivedKey.toString("hex")}`);
    });
  });
}

function verifyPassword(password, passwordHash) {
  return new Promise((resolve, reject) => {
    const [salt, storedHash] = String(passwordHash || "").split(":");
    if (!salt || !storedHash) {
      resolve(false);
      return;
    }

    crypto.scrypt(password, salt, KEY_LENGTH, { maxmem: 128 * 1024 * 1024 }, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      const storedBuffer = Buffer.from(storedHash, "hex");
      const derivedBuffer = Buffer.from(derivedKey.toString("hex"), "hex");

      if (storedBuffer.length !== derivedBuffer.length) {
        resolve(false);
        return;
      }

      resolve(crypto.timingSafeEqual(storedBuffer, derivedBuffer));
    });
  });
}

module.exports = {
  hashPassword,
  verifyPassword
};
