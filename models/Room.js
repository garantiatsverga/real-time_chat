const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Room name is required'],
    unique: true,
    trim: true,
    minlength: [2, 'Room name must be at least 2 characters'],
    maxlength: [30, 'Room name cannot exceed 30 characters']
  },
  description: {
    type: String,
    maxlength: [200, 'Description cannot exceed 200 characters']
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  password: {
    type: String,
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  maxUsers: {
    type: Number,
    default: 100
  }
}, {
  timestamps: true
});

// Виртуальное поле для количества участников
roomSchema.virtual('userCount').get(function() {
  // Это будет вычисляться в реальном времени через сокеты
  return 0;
});

module.exports = mongoose.model('Room', roomSchema);