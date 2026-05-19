import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema({
    admin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    action: {
        type: String,
        required: true
    },
    entityId: {
        type: String, // The ID of the thing being changed (Product ID, User ID etc)
    },
    entityName: {
        type: String, // Human readable name (e.g. "Kenyan Gold Beans")
    },
    details: {
        type: Object, // Flexible JSON for before/after values
    },
    ipAddress: {
        type: String
    },
    userAgent: {
        type: String
    }
}, {
    timestamps: true
});

// Index for fast sorting/searching
activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ action: 1 });
activityLogSchema.index({ admin: 1 });

// ── IMMUTABILITY ENFORCEMENT AT SCHEMA LAYER ─────────────────────────────────
// Ensures that ActivityLogs are append-only. No updates or deletions are permitted.
activityLogSchema.pre('save', function (next) {
  if (!this.isNew) {
    return next(new Error('❌ Security Restriction: Activity logs are strictly immutable and cannot be modified.'));
  }
  next();
});

const blockMutations = function (next) {
  const err = new Error('❌ Security Restriction: Activity logs are strictly immutable and cannot be modified or deleted.');
  next(err);
};

// Catch and block all mutation methods at driver level
activityLogSchema.pre('remove', blockMutations);
activityLogSchema.pre('deleteOne', blockMutations);
activityLogSchema.pre('deleteMany', blockMutations);
activityLogSchema.pre('updateOne', blockMutations);
activityLogSchema.pre('updateMany', blockMutations);
activityLogSchema.pre('findOneAndUpdate', blockMutations);
activityLogSchema.pre('findOneAndDelete', blockMutations);

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

export default ActivityLog;
