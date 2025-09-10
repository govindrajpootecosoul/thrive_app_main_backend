const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  client_id: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
  },
  phone: {
    type: String,
  },
  address: {
    type: String,
  },
  status: {
    type: String,
    default: 'ACTIVE',
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Client', clientSchema);
