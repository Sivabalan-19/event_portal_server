const { Schema, model, Types } = require('mongoose');

const eventSchema = new Schema(
  {
    title: { type: String, required: true },
    category: { type: String },
    maxAttendees: { type: Number },
    description: { type: String },
    date: { type: String },
    time: { type: String },
    venue: { type: String },
    mode: {
      type: String,
      enum: ['online', 'offline', 'hybrid'],
      default: 'offline',
    },
    speakers: [{ type: Types.ObjectId, ref: 'speakers' }],
    coverImageUrl: { type: String },
    reviewNote: { type: String },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Needs Changes', 'Rejected'],
      default: 'Pending',
      index: true,
    },
    createdBy: { type: Types.ObjectId, ref: 'users' },
  },
  {
    timestamps: true,
  }
);

module.exports = model('events', eventSchema);

