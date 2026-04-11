const User = require("../models/User");
const FriendPool = require("../models/FriendPool");
const { hashPassword, verifyPassword } = require("../utils/passwords");
const { ensureLeaderboardEntryForUser } = require("../services/leaderboardService");

function sanitizeUser(user) {
  if (!user) {
    return null;
  }

  const plainUser = typeof user.toJSON === "function" ? user.toJSON() : user;
  delete plainUser.passwordHash;
  return plainUser;
}

async function ensureUserFriendPool(user) {
  if (!user) {
    return null;
  }

  if (user.groupId) {
    return user.groupId;
  }

  const friendPool = await FriendPool.create({
    name: `${user.displayName || user.username}'s Squad`,
    ownerUserId: user._id,
    memberUserIds: [user._id],
  });

  user.groupId = friendPool._id;
  await user.save();

  return friendPool._id;
}

async function registerUser(req, res) {
  try {
    const { email, username, displayName, password } = req.body;

    if (!email || !username || !displayName || !password) {
      return res.status(400).json({
        error: "email, username, displayName, and password are required"
      });
    }

    if (String(password).length < 8) {
      return res.status(400).json({ error: "password must be at least 8 characters" });
    }

    const existingUser = await User.findOne({
      $or: [{ email: String(email).toLowerCase() }, { username }]
    }).lean();

    if (existingUser) {
      return res.status(409).json({ error: "User with that email or username already exists" });
    }

    const passwordHash = await hashPassword(password);
    const user = await User.create({
      email,
      username,
      displayName,
      passwordHash
    });

    await ensureUserFriendPool(user);
    await ensureLeaderboardEntryForUser(user);

    return res.status(201).json({
      message: "User registered successfully",
      user: sanitizeUser(user)
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}

async function loginUser(req, res) {
  try {
    const { emailOrUsername, password } = req.body;

    if (!emailOrUsername || !password) {
      return res.status(400).json({ error: "emailOrUsername and password are required" });
    }

    const user = await User.findOne({
      $or: [
        { email: String(emailOrUsername).toLowerCase() },
        { username: String(emailOrUsername) }
      ]
    }).select("+passwordHash");

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const passwordMatches = await verifyPassword(password, user.passwordHash);
    if (!passwordMatches) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    await ensureUserFriendPool(user);
    user.lastLoginAt = new Date();
    await user.save();

    return res.json({
      message: "Login successful",
      user: sanitizeUser(user)
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}

module.exports = {
  registerUser,
  loginUser
};
