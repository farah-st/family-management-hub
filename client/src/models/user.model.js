import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    // Optional, in case you later want email + name
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    name: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: ["parent", "child", "admin"],
      default: "parent",
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

export default User;