const mongoose = require("mongoose");

const { Schema, model } = mongoose;
const ExhibitionSchema = new Schema({
  title: String,
  duration: String,
  description: String,
  isActual: { type: Boolean, default: true },
});

const ExhibitionModel = model("Exhibition", ExhibitionSchema);

module.exports = ExhibitionModel;
