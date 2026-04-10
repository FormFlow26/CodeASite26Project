const mongoose = require("mongoose");

const friendPoolSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    ownerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
      index: true
    },
    memberUserIds: {
      type: [mongoose.Schema.Types.ObjectId],
      default: [],
      ref: "User"
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

friendPoolSchema.index({ ownerUserId: 1 });

module.exports = mongoose.model("FriendPool", friendPoolSchema);
