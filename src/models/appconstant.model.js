const mongoose = require('mongoose');

const appConstantSchema = new mongoose.Schema({
  privacy_policy: {
    type: String,
  },
  term_and_condition: {
    type: String,
  },
  // Add other fields as needed
}, {
  collection: 'app_constant',
  timestamps: true,
});

module.exports = mongoose.model('AppConstant', appConstantSchema, 'app_constant');
