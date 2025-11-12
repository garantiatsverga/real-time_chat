const Message = require('../models/Message');
const User = require('../models/User');

// Хранилище подключенных пользователей
const connectedUsers = new Map(); // { socketId: { user, room } }
const userRooms = new Map(); // { userId: [room1, room2] }

// Основной обработчик подключения
const handleConnection = async (socket, io) => {
  try {
    // Получаем пользователя из БД
    const user = await User.findById(socket.userId);
    if (!user) {
      socket.disconnect();
      return;
    }

    // Присоединение к комнате по умолчанию
    const defaultRoom = 'general';
    await joinRoom(socket, io, user, defaultRoom);

    // Обработка нового сообщения
    socket.on('send_message', async (data) => {
      await handleSendMessage(socket, io, data, user);
    });

    // Пользователь печатает
    socket.on('typing_start', (data) => {
      handleTyping(socket, data, user, true);
    });

    socket.on('typing_stop', (data) => {
      handleTyping(socket, data, user, false);
    });

    // Смена комнаты
    socket.on('join_room', async (data) => {
      await joinRoom(socket, io, user, data.room);
    });

    // Выход из комнаты
    socket.on('leave_room', async (data) => {
      await leaveRoom(socket, io, user, data.room);
    });

    // Редактирование сообщения
    socket.on('edit_message', async (data) => {
      await handleEditMessage(socket, io, data);
    });

    // Удаление сообщения
    socket.on('delete_message', async (data) => {
      await handleDeleteMessage(socket, io, data);
    });

  } catch (error) {
    console.error('Connection handler error:', error);
    socket.emit('error', { message: 'Connection error' });
  }
};

// Присоединение к комнате
const joinRoom = async (socket, io, user, room) => {
  try {
    // Выходим из предыдущей комнаты
    const previousRoom = connectedUsers.get(socket.id)?.room;
    if (previousRoom && previousRoom !== room) {
      await leaveRoom(socket, io, user, previousRoom);
    }

    // Присоединяем к новой комнате
    socket.join(room);
    connectedUsers.set(socket.id, { user, room });

    // Обновляем статус пользователя
    await User.findByIdAndUpdate(user._id, { 
      isOnline: true,
      lastSeen: new Date()
    });

    // Получаем историю сообщений
    const messages = await Message.getRoomMessages(room, 50);
    
    // Отправляем историю пользователю
    socket.emit('room_joined', {
      room,
      messages: messages.reverse(),
      onlineUsers: getOnlineUsersInRoom(room)
    });

    // Уведомляем других в комнате
    socket.to(room).emit('user_joined', {
      user: user.toSafeObject(),
      room,
      timestamp: new Date()
    });

    console.log(`✅ ${user.username} joined room: ${room}`);

  } catch (error) {
    console.error('Join room error:', error);
    socket.emit('error', { message: 'Failed to join room' });
  }
};

// Отправка сообщения
const handleSendMessage = async (socket, io, data, user) => {
  try {
    const { text, room, messageType = 'text', fileUrl = null, fileName = null } = data;
    
    if (!text?.trim() && messageType === 'text') {
      socket.emit('error', { message: 'Message cannot be empty' });
      return;
    }

    const message = new Message({
      text: text.trim(),
      user: user._id,
      room,
      messageType,
      fileUrl,
      fileName
    });

    const savedMessage = await message.save();
    await savedMessage.populate('user', 'username avatar');

    // Отправляем сообщение всем в комнате
    io.to(room).emit('receive_message', savedMessage);

  } catch (error) {
    console.error('Send message error:', error);
    socket.emit('error', { message: 'Failed to send message' });
  }
};

// Обработка отключения
const handleDisconnect = async (socket, io) => {
  try {
    const userData = connectedUsers.get(socket.id);
    
    if (userData) {
      const { user, room } = userData;
      
      // Обновляем статус пользователя
      await User.findByIdAndUpdate(user._id, { 
        isOnline: false,
        lastSeen: new Date()
      });

      // Уведомляем других пользователей
      socket.to(room).emit('user_left', {
        user: user.toSafeObject(),
        room,
        timestamp: new Date()
      });

      connectedUsers.delete(socket.id);
      
      console.log(`❌ ${user.username} disconnected from room: ${room}`);
    }
  } catch (error) {
    console.error('Disconnect handler error:', error);
  }
};

// Вспомогательные функции
const handleTyping = (socket, data, user, isTyping) => {
  const { room } = data;
  const event = isTyping ? 'user_typing' : 'user_stop_typing';
  
  socket.to(room).emit(event, {
    user: user.toSafeObject(),
    room
  });
};

const getOnlineUsersInRoom = (room) => {
  return Array.from(connectedUsers.values())
    .filter(data => data.room === room)
    .map(data => data.user.toSafeObject());
};

const handleEditMessage = async (socket, io, data) => {
  // Реализация редактирования сообщений
};

const handleDeleteMessage = async (socket, io, data) => {
  // Реализация удаления сообщений
};

const leaveRoom = async (socket, io, user, room) => {
  socket.leave(room);
  socket.to(room).emit('user_left', {
    user: user.toSafeObject(),
    room,
    timestamp: new Date()
  });
};

module.exports = {
  handleConnection,
  handleDisconnect,
  connectedUsers
};