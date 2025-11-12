const express = require('express');
const Message = require('../models/Message');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Получение сообщений комнаты
router.get('/room/:roomName', auth, async (req, res) => {
  try {
    const { roomName } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const skip = parseInt(req.query.skip) || 0;

    const messages = await Message.getRoomMessages(roomName, limit, skip);

    res.json({
      success: true,
      messages,
      pagination: {
        limit,
        skip,
        hasMore: messages.length === limit
      }
    });

  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages'
    });
  }
});

// Поиск сообщений
router.get('/search', auth, async (req, res) => {
  try {
    const { q, room } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const searchQuery = {
      text: { $regex: q, $options: 'i' }
    };

    if (room) {
      searchQuery.room = room;
    }

    const messages = await Message.find(searchQuery)
      .populate('user', 'username avatar')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    res.json({
      success: true,
      messages
    });

  } catch (error) {
    console.error('Search messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Search failed'
    });
  }
});

module.exports = router;