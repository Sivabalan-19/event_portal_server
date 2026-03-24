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
    feedback: {
      rating: {
        type: Number,
        min: 1,
        max: 5,
      },
      comment: {
        type: String,
        trim: true,
        maxlength: 1000,
      },
      submittedAt: {
        type: Date,
      },
    },
  },
  {
    timestamps: true,
  }
);

registrationSchema.index({ student: 1, event: 1 }, { unique: true });

module.exports = model('registrations', registrationSchema);
