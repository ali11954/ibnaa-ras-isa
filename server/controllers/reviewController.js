const Review = require('../models/Review');
const reviewStorage = [];

exports.getAll = async (req, res) => {
  try {
    const reviews = await Review.find({ status: 'approved' }).sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) {
    res.json(reviewStorage.filter(r => r.status === 'approved').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  }
};

exports.create = async (req, res) => {
  try {
    const review = await Review.create(req.body);
    res.status(201).json(review);
  } catch (err) {
    const review = { ...req.body, _id: Date.now().toString(), createdAt: new Date().toISOString(), status: 'approved' };
    reviewStorage.push(review);
    res.status(201).json(review);
  }
};

exports.getStats = async (req, res) => {
  try {
    const reviews = await Review.find({ status: 'approved' });
    const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
    res.json({ total: reviews.length, average: avg.toFixed(1) });
  } catch (err) {
    const avg = reviewStorage.length ? reviewStorage.reduce((s, r) => s + r.rating, 0) / reviewStorage.length : 0;
    res.json({ total: reviewStorage.length, average: avg.toFixed(1) });
  }
};

exports.remove = async (req, res) => {
  try {
    await Review.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(404).json({ error: 'Not found' });
  }
};