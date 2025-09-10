const mongoose = require('mongoose');

const salesRecordSchema = new mongoose.Schema({
  SKU: {
    type: String,
    required: true,
  },
  state: {
    type: String,
    required: true,
  },
  city: {
    type: String,
    required: true,
  },
  purchaseDate: {
    type: Date,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  totalSales: {
    type: Number,
    required: true,
  },
  orderID: {
    type: String,
    required: true,
  },
  orderId: {
    type: String,
    required: true,
  },
  platform: {
    type: String,
    required: true,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('SalesRecord', salesRecordSchema);
