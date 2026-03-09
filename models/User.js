const { Schema, model } = require('mongoose');

const userSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'organizer', 'superadmin'], required: true },
  rollNo: { type: String },
  department: { type: String },
  year: { type: String },
  createdAt: { type: Date, default: Date.now },
});

module.exports = model('users', userSchema);
