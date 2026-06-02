// models/OperationalControls.js - DYNAMIC CONTROL PANEL REPLACING THE BINARY KILL SWITCH
import mongoose from 'mongoose';

const categoryOverrideSchema = new mongoose.Schema({
  categoryId: {
    type: String,
    required: true
  },
  categoryName: {
    type: String,
    required: true
  },
  ordersEnabled: {
    type: Boolean,
    default: true
  }
});

const operationalControlsSchema = new mongoose.Schema({
  ordersEnabled: {
    type: Boolean,
    default: true // Master toggle
  },
  mpesaEnabled: {
    type: Boolean,
    default: true // STK Push specifically
  },
  cashOnDeliveryEnabled: {
    type: Boolean,
    default: true // COD specifically
  },
  categoryOverrides: [categoryOverrideSchema],
  hourlyOrderCap: {
    type: Number,
    default: null // null indicates unlimited orders
  },
  currentHourOrderCount: {
    type: Number,
    default: 0
  },
  currentHourResetAt: {
    type: Date,
    default: Date.now
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastModifiedAt: {
    type: Date,
    default: Date.now
  },
  activationReason: {
    type: String,
    required: function () {
      // Required if ordersEnabled, mpesaEnabled or cashOnDeliveryEnabled are set to false
      return this.ordersEnabled === false || this.mpesaEnabled === false || this.cashOnDeliveryEnabled === false;
    }
  }
}, {
  timestamps: true
});

// Single document enforcement helper
operationalControlsSchema.statics.getControls = async function () {
  let controls = await this.findOne();
  if (!controls) {
    controls = new this({
      ordersEnabled: true,
      mpesaEnabled: true,
      cashOnDeliveryEnabled: true,
      categoryOverrides: [],
      hourlyOrderCap: null,
      currentHourOrderCount: 0,
      currentHourResetAt: new Date(),
      activationReason: 'Initial setup'
    });
    await controls.save();
  }
  return controls;
};

const OperationalControls = mongoose.model('OperationalControls', operationalControlsSchema);
export default OperationalControls;
