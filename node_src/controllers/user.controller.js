const userService = require('../services/user.service');

/**
 * User Controller - Handles HTTP requests related to user operations
 */
class UserController {
  /**
   * Create a user profile from Cognito user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createUser(req, res) {
    try {
      // Get user info from the JWT token and request body
      const cognitoUserId = req.body.userId;
      
      // Combine Cognito data with request body (request body takes precedence)
      const userData = {
        // First pull in data from Cognito token
        cognitoUserId, // This will be used as the _id
        name: req.body.name,
        email: req.body.email,
        gender: req.body.gender,
        birthdate: req.body.birthdate,
        ...req.body
      };
      
      // Check if user already exists by Cognito ID
      const existingUser = await userService.getUserByCognitoId(cognitoUserId);
      
      if (existingUser) {
        // User already exists, return 409 Conflict
        return res.status(409).json({
          success: false,
          message: 'User profile already exists',
          data: existingUser
        });
      }
      
      // Create new user
      const result = await userService.createUser(userData);
      
      res.status(201).json({
        success: true,
        data: result,
        message: 'User profile created successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create user profile'
      });
    }
  }
  
  /**
   * Get user by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getUserById(req, res) {
    try {
      const { userId } = req.params;
      
      const user = await userService.getUserById(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      res.status(200).json({
        success: true,
        data: user
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get user'
      });
    }
  }
  
  /**
   * Get current user profile
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getCurrentUser(req, res) {
    try {
      const cognitoUserId = req.user.userId;
      
      // Get user from database
      let user = await userService.getUserByCognitoId(cognitoUserId);      
      // If user doesn't exist, create a new profile automatically from Cognito data
      if (!user) {
        const userData = {
          cognitoUserId,
          name: req.user.name,
          email: req.user.email,
          username: req.user.username,
          gender: req.user.gender,
          birthdate: req.user.birthdate
        };
        
        user = await userService.createUser(userData);
        
        res.status(201).json({
          success: true,
          data: user,
          message: 'User profile created automatically'
        });
        return;
      }
      
      res.status(200).json({
        success: true,
        data: user
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get user profile'
      });
    }
  }
  
  /**
   * Update user information
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async updateUser(req, res) {
    try {
      const { userId } = req.params;
      const userData = req.body;
      
      // Check if user exists
      const existingUser = await userService.getUserById(userId);
      
      if (!existingUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
          
      
      // Update the user
      const updatedUser = await userService.updateUser(userId, userData);
      
      res.status(200).json({
        success: true,
        data: updatedUser,
        message: 'User updated successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update user'
      });
    }
  }
}

module.exports = new UserController();