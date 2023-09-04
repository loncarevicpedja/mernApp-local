const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const UserSchema = new Schema({
  username: { type: String, required: true, min: 4, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  isVerified: { type: Boolean, default: false },
});

const UserModel = model("User", UserSchema);

module.exports = UserModel;
