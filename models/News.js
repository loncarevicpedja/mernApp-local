const mongoose = require("mongoose");

const { Schema, model } = mongoose;
const NewsSchema = new Schema(
  {
    title: String,
    summary: String,
    content: String,
    cover: String,
  },
  {
    timestamps: true,
  }
);

const NewsModel = model("News", NewsSchema);

module.exports = NewsModel;
