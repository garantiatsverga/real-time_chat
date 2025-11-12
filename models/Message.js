const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  text: {
    type: String,
    required: [true, 'Message text is required'],
    trim: true,
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  room: {
    type: String,
    required: true,
    default: 'general',
    index: true
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'file', 'system'],
    default: 'text'
  },
  fileUrl: {
    type: String,
    default: null
  },
  fileName: {
    type: String,
    default: null
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Индексы для оптимизации запросов
messageSchema.index({ room: 1, createdAt: -1 });
messageSchema.index({ user: 1 });

// Статический метод для получения сообщений комнаты
messageSchema.statics.getRoomMessages = async function(room, limit = 50, skip = 0) {
  return await this.find({ room })
    .populate('user', 'username avatar')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .lean();
};

module.exports = mongoose.model('Message', messageSchema);