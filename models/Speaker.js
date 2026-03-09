const { Schema, model } = require('mongoose');

const speakerSchema = new Schema(
  {
    name: { type: String, required: true },
    title: { type: String },
    expertise: { type: String },
    organization: { type: String },
    email: { type: String },
    phone: { type: String },
    location: { type: String },
    website: { type: String },
    bio: { type: String },
    profileImageName: { type: String },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = model('speakers', speakerSchema);

