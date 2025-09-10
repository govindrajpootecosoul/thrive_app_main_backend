const AppConstant = require('../models/appconstant.model');

class AppConstantService {
  async getAllConstants() {
    try {
      const constants = await AppConstant.findOne({});
      return constants;
    } catch (error) {
      throw error;
    }
  }

  async getConstantByKey(key) {
    try {
      const constant = await AppConstant.findOne({ key });
      if (!constant) {
        throw new Error('Constant not found');
      }
      return constant;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new AppConstantService();
