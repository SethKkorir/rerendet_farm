import mongoose from 'mongoose';

const testimonialSchema = new mongoose.Schema({
  author: {
    type: String,
    required: [true, 'Author name is required'],
    trim: true
  },
  role: {
    type: String,
    default: 'Verified Buyer',
    trim: true
  },
  rating: {
    type: Number,
    required: true,
    default: 5,
    min: 1,
    max: 5
  },
  text: {
    type: String,
    required: [true, 'Testimonial quote text is required'],
    trim: true
  },
  avatar: {
    type: String,
    default: '',
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: true
  },
  displayOrder: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

const Testimonial = mongoose.model('Testimonial', testimonialSchema);
export default Testimonial;

