const { Schema, model, Types } = require('mongoose');

const registrationSchema = new Schema(
  {
    student: {
      type: Types.ObjectId,
      ref: 'users',
      required: true,
      index: true,
    },
    event: {
      type: Types.ObjectId,
      ref: 'events',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['registered', 'waitlisted', 'attended', 'cancelled'],
      default: 'registered',
      index: true,
    },
    waitlistPosition: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
);

registrationSchema.index({ student: 1, event: 1 }, { unique: true });

module.exports = model('registrations', registrationSchema);
