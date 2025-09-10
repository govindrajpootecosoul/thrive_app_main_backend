const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  user_name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  temp_cred: {
    type: Boolean,
    default: false,
  },
  client_id: {
    type: String,
    required: true,
  },
  profile_picture: {
    type: String,
  },
  mobile: {
    type: String,
  },
  permission_level: {
    type: String,
    required: true,
  },
  account_status: {
    type: String,
    required: true,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('User', userSchema);
