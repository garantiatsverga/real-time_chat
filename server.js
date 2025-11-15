require('dotenv').config();
const express = require('express');
const socketIo = require('socket.io');
const http = require('http');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Подключение к Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Проверка подключения к Supabase
supabase.from('messages').select('*').limit(1)
  .then(({ data, error }) => {
    if (error) {
      console.log('Ошибка подключения к Supabase:', error.message);
    } else {
      console.log('Успешно подключен к Supabase!');
    }
  });

// Система фильтрации контента
const filterConfig = {
  // Запрещенные символы (регулярные выражения)
  bannedSymbols: [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
    /<form/gi,
    /<meta/gi,
    /<link/gi,
    /vbscript:/gi,
    /expression/gi,
  ],
  
  // Запрещенные слова
  bannedWords: [
    'ψ̴̢̛̛̛̛͖͓̬̮̪̠̥̤̰̙̖̤̪͒̅̓͗́͒́̄͆͆̀͊̇̈̐́̾̑̀͊̒̏́̔̒̔̾͐͊̈́̀̇̓͒̌̄̄͗̍̑̎͆̑̒̀̄̐́̈́̿̈́̎̈́́̏̈́̌̄͗́͆͗̀̊̋͋͒͒̀̂̅̍̾̃̍̓͂̅̾̄̃̉͒̏̒̎̏̌̌͆͒́́̐̿͆̌̀͊̋̉̈́̎̃͂̿̔̓̈́̄̋͊̓̐̑̽̀̾́͗̏͐̒̽͋̓̌̀̇͗̅́͋͑̽̐́̃̃̊̏̇̍̉̿̒̔͂͗̈́͗̆̍̽̈͌͌̈́̓̒̾̏̃̈́̐̃́̑̈͒̏̈́́̌̀͗͋̄͛̓͒͛̍͑̃̏̍̐͗͌̍̆̂͐̉̓̔̐͂͒̏̐͊̾̔͒͊͗͊͘̕͘̚̚̕͘͘̕̚͘͘͘͘͘͘̚͝͝͠͝͠͝͝͝͝͝͝͝͠͝͠͝͝ ̴̢̨̢̨̡̢̡̡̧̡̧̛̛̛̛̛̝̺͖̙͙̲̱̝͕͓̼̠̘͉̯̘̭̖͓͖̟̪̥̲͇̲̜̭͕͓̻̻̖̦̣̮̬̳̺̹͔͚͙̙̫̙̯͕̤͍̞̳̫͖̤̪̦̘̠͔̰̰͓̮͕̙̟̼̞̩̦̙̥̙͚͉̠̪̼̤̙̭͇̣̳͚͍͚̘͎̹̭̜̞͚͔̝̟̣̺̫͈̝͉͕̭͔̙̹̩̤͆̆̄͌̿̈́͑̂̓̑̒̋́̏̃̅̓̀̎͐̓̂̎͌̏̊͆̅̆̈͗̔̽̏̇͂̌͂̎̀̆̐́̑͒͒͋͐̽̈͒̆̐̑͛̓̿̾͌͋̽͒͌͆̆͛̈̇̌̉͒͗̋̑̃́̿̓͒̑̆͐͐̽͋́̇̈́̇̓̆̈̏͆̓̊̃͊̇͛́̉̈́̀̐̈́͛͂̇̌͂̃̎͗̔͋̏̏͋͒͆̊̓̓̔͑̀̽̒̒̍̿͊̏̒̓̇̓́̄́͒̂́̀̍̄͐͗̏̒̊̇̇̀͛͋̉̆͗͌̀̓̀́͌̂̾̌͋͊̔͒̀̓̄́̅̍͊͛̀̈́̈͊̒͒͒̀̒̑̿͑̈́̈́͐̿͗́̽̋͗̔͂̉͋͊͗̌͛́͑̐̾́̕̕̚̕̕̕͘̕̕̚̕̕̚͘͘̚̕͘͜͜͜͜͝͠͠͝͠͠͠͝͠͝͝͝͠͝ͅͅ',
    'лгбт',
    'украина',
  ],
  
  // Максимальная длина сообщения
  maxLength: Infinity,
};

// Функция проверки сообщения
function validateMessage(text, userId) {
  const result = {
    isValid: true,
    errors: [],
    cleanedText: text.trim(),
    hasViolations: false
  };
  
  
  // Проверка на пустое сообщение
  if (result.cleanedText.length === 0) {
    result.isValid = true;
    result.errors.push('Тля блузка!!1');
  }
  
  // Проверка запрещенных символов
  filterConfig.bannedSymbols.forEach(regex => {
    if (regex.test(text)) {
      result.isValid = false;
      result.errors.push('');
    }
  });
  
  // Проверка запрещенных слов
  const lowerText = text.toLowerCase();
  filterConfig.bannedWords.forEach(word => {
    if (lowerText.includes(word.toLowerCase())) {
      result.hasViolations = true;
      result.cleanedText = result.cleanedText.replace(
        new RegExp(word, 'gi'), 
        '*'.repeat(word.length)
      );
    }
  });
  
  // Проверка CAPS LOCK
  const capsRatio = (text.replace(/[^A-ZА-Я]/g, '').length / text.length);
  if (capsRatio > 0.7 && text.length > 10) {
    result.hasViolations = true;
    result.cleanedText = text.toLowerCase();
  }
  
  return result;
}

// Хранилище онлайн пользователей
const onlineUsers = new Map();
const tempMessages = [];
const userWarnings = new Map();

// Real-time обработчики
io.on('connection', (socket) => {
  console.log('Пользователь подключен:', socket.id);

  // Присоединение к чату
  socket.on('join_chat', async (userData) => {
    try {
      const { username, userId } = userData;
      
      // Сохраняем пользователя
      onlineUsers.set(socket.id, { username, userId });
      
      // Получаем историю сообщений из Supabase
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) {
        console.log('Ошибка загрузки сообщений:', error);
        socket.emit('message_history', tempMessages.slice(-50));
      } else {
        // Добавляем username к каждому сообщению из истории
        const messagesWithUsernames = messages.map(msg => ({
          ...msg,
          username: 'Участник'
        }));
        socket.emit('message_history', messagesWithUsernames);
      }
      
      // Уведомляем других о новом пользователе
      socket.broadcast.emit('user_joined', {
        username,
        message: username + ' присоединился к чату',
        timestamp: new Date()
      });

      // Обновляем список онлайн пользователей
      updateOnlineUsers();

    } catch (error) {
      console.log('Ошибка присоединения к чату:', error);
      socket.emit('error', { message: 'Не удалось присоединиться к чату' });
    }
  });

  // Отправка сообщения
  socket.on('send_message', async (data) => {
    try {
      console.log('Получено сообщение:', data);
      
      const user = onlineUsers.get(socket.id);
      if (!user) {
        socket.emit('error', { message: 'Пользователь не найден' });
        return;
      }

      const { text, room = 'general' } = data;
      
      // ПРОВЕРКА СООБЩЕНИЯ
      const validation = validateMessage(text, user.userId);
      if (!validation.isValid) {
        socket.emit('error', { 
          message: validation.errors[0] || 'Недопустимое сообщение' 
        });
        return;
      }

      console.log('Сохранение в Supabase...');
      
      // Сохраняем сообщение в Supabase
      const { data: newMessage, error } = await supabase
        .from('messages')
        .insert([
          {
            text: validation.cleanedText,
            user_id: user.userId,
            room: room
          }
        ])
        .select()
        .single();

      if (error) {
        console.log('Ошибка сохранения в Supabase:', error);
        // Создаем временное сообщение
        const tempMessage = {
          id: Date.now(),
          text: validation.cleanedText,
          user_id: user.userId,
          username: user.username,
          room: room,
          created_at: new Date().toISOString()
        };
        tempMessages.push(tempMessage);
        io.emit('receive_message', tempMessage);
        return;
      }

      console.log('Сообщение сохранено в Supabase:', newMessage);
      
      // Добавляем username к сообщению
      const messageWithUsername = {
        ...newMessage,
        username: user.username
      };
      
      // Отправляем сообщение всем пользователям
      io.emit('receive_message', messageWithUsername);

    } catch (error) {
      console.log('Ошибка отправки сообщения:', error);
      const user = onlineUsers.get(socket.id);
      if (user) {
        const tempMessage = {
          id: Date.now(),
          text: data.text.trim(),
          user_id: user.userId,
          username: user.username,
          room: data.room || 'general',
          created_at: new Date().toISOString()
        };
        tempMessages.push(tempMessage);
        io.emit('receive_message', tempMessage);
      }
    }
  });

  // Пользователь печатает
  socket.on('typing_start', () => {
    const user = onlineUsers.get(socket.id);
    if (user) {
      socket.broadcast.emit('user_typing', {
        username: user.username
      });
    }
  });

  socket.on('typing_stop', () => {
    const user = onlineUsers.get(socket.id);
    if (user) {
      socket.broadcast.emit('user_stop_typing', {
        username: user.username
      });
    }
  });

  // Отключение пользователя
  socket.on('disconnect', () => {
    const user = onlineUsers.get(socket.id);
    
    if (user) {
      // Уведомляем других о выходе
      socket.broadcast.emit('user_left', {
        username: user.username,
        message: user.username + ' покинул чат',
        timestamp: new Date()
      });
      
      onlineUsers.delete(socket.id);
      updateOnlineUsers();
    }
    
    console.log('Пользователь отключен:', socket.id);
  });
});

// Функция обновления списка онлайн пользователей
function updateOnlineUsers() {
  const users = Array.from(onlineUsers.values()).map(user => ({
    username: user.username,
    userId: user.userId
  }));
  
  io.emit('online_users_update', users);
}

// REST API для получения сообщений
app.get('/api/messages', async (req, res) => {
  try {
    const { room = 'general', limit = 50 } = req.query;
    
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('room', room)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ messages: messages.reverse() });
  } catch (error) {
    res.status(500).json({ error: 'Не удалось загрузить сообщения' });
  }
});

// Проверка состояния сервера
app.get('/api/health', async (req, res) => {
  const { data, error } = await supabase
    .from('messages')
    .select('id')
    .limit(1);

  res.json({
    status: error ? 'проблемы' : 'работает',
    supabase: error ? 'отключен' : 'подключен',
    onlineUsers: onlineUsers.size,
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('Чат сервер запущен на порту ' + PORT);
  console.log('Проверка состояния: http://localhost:' + PORT + '/api/health');
});