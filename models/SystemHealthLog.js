import mongoose from 'mongoose';

const systemHealthLogSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  status: {
    type: String,
    required: true,
    enum: ['healthy', 'unhealthy']
  },
  services: {
    mongodb: {
      status: { type: String, required: true },
      latencyMs: { type: Number },
      error: { type: String }
    },
    redis: {
      status: { type: String, required: true },
      latencyMs: { type: Number },
      error: { type: String }
    },
    cloudinary: {
      status: { type: String, required: true },
      latencyMs: { type: Number },
      error: { type: String }
    },
    queues: {
      status: { type: String, required: true },
      latencyMs: { type: Number },
      error: { type: String }
    }
  },
  cpuUsage: { type: Number },
  memoryUsage: { type: Number }
});

const SystemHealthLog = mongoose.model('SystemHealthLog', systemHealthLogSchema);
export default SystemHealthLog;
