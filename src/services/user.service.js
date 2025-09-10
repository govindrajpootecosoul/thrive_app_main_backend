const User = require('../models/user.model');
const Client = require('../models/client.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

class UserService {
  async login(email, password) {
    try {
      const user = await User.findOne({ email });
      if (!user) {
        throw new Error('User not found');
      }

      // For now, comparing plain text passwords as per user data
      // TODO: Hash passwords in production
      if (password !== user.password) {
        throw new Error('Invalid password');
      }

      const token = jwt.sign(
        { userId: user._id, email: user.email, client_id: user.client_id },
        process.env.JWT_SECRET,
        { expiresIn: '110h' }
      );

      // Decode token to get expiration time
      const decoded = jwt.decode(token);
      const expiresAt = new Date(decoded.exp * 1000); // Convert to milliseconds

      return {
        success: true,
        message: 'Login successful',
      data:{
         token,
        expiresAt: expiresAt.toISOString(),
        user: {
          user_name: user.user_name,
          email: user.email,
          client_id: user.client_id,
          permission_level: user.permission_level,
          account_status: user.account_status,
        },
  }
      };
    } catch (error) {
      throw error;
    }
  }

  async getUserById(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      return {
        user_name: user.user_name,
        email: user.email,
        client_id: user.client_id,
        profile_picture: user.profile_picture,
        mobile: user.mobile,
        permission_level: user.permission_level,
        account_status: user.account_status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    } catch (error) {
      throw error;
    }
  }

  async getClientByClientId(clientId) {
    try {
      const client = await Client.findOne({ client_id: clientId });
      if (!client) {
        throw new Error('Client not found');
      }
      return client;
    } catch (error) {
      throw error;
    }
  }

  async hashPassword(password) {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
  }
}

module.exports = new UserService();
