const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, trim: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  service: { type: String, required: true },
  comment: { type: String, required: true, trim: true },
  featured: { type: Boolean, default: false },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' }
}, { timestamps: true });

module.exports = mongoose.model('Review', reviewSchema);