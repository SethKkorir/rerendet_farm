import mongoose from 'mongoose';

const adMetricSchema = new mongoose.Schema({
  adId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ad',
    required: true,
    index: true
  },
  eventType: {
    type: String,
    enum: ['impression', 'click', 'conversion'],
    required: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Compound index for efficient aggregation queries
adMetricSchema.index({ adId: 1, eventType: 1, timestamp: 1 });

const AdMetric = mongoose.model('AdMetric', adMetricSchema);
export default AdMetric;
