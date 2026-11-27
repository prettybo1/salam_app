import React, { useEffect, useState, useCallback } from 'react';
import FeedPage from './pages/FeedPage';
import ChatsPage from './pages/ChatsPage';
import ProfilePage from './pages/ProfilePage';
import SplashScreen from './components/ui/SplashScreen';
import { Flame, MessageCircle, User } from 'lucide-react';
import { api } from './api/client';
import './styles/globals.css';

const CURRENT_USER_ID = 1;

const initialChats = [
  {
    id: 1,
    name: 'Майса',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop',
    lastMessage: 'Заглянешь вечером в кофейню в центре?',
    time: '18:12',
    unreadCount: 2,
    online: true,
  },
  {
    id: 2,
    name: 'Селим',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop',
    lastMessage: 'Давай в среду пересечемся выпьем кофе',
    time: 'Вчера',
    unreadCount: 0,
    online: true,
  },
];

const initialMessagesByChat = {
  1: [
    { id: 101, fromMe: false, text: 'Привет! Как прошли выходные?' },
    { id: 102, fromMe: false, text: 'Заглянешь вечером в кофейню в центре?' },
  ],
  2: [
    { id: 201, fromMe: false, text: 'Давай в среду пересечемся выпьем кофе' },
  ],
};

function formatBackendChats(rows = []) {
  return rows.map((row) => ({
    id: row.match_id,
    partnerId: row.partner_id,
    name: row.partner_name,
    url:
      row.partner_avatar ||
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop',
    lastMessage: row.last_message || 'Новый матч! Напиши первым',
    time: 'Сейчас',
    unreadCount: 0,
    online: true,
  }));
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState('swipe');
  const [selectedMatchUser, setSelectedMatchUser] = useState(null);

  const [chats, setChats] = useState(initialChats);
  const [messagesByChat, setMessagesByChat] = useState(initialMessagesByChat);

  const loadChatsFromBackend = useCallback(async () => {
    try {
      const data = await api.getChats(CURRENT_USER_ID);
      if (Array.isArray(data.chats) && data.chats.length > 0) {
        setChats(formatBackendChats(data.chats));
      }
    } catch {
      // Если бэкенд не запущен, оставляем локальные initialChats
    }
  }, []);

  useEffect(() => {
    loadChatsFromBackend();
  }, [loadChatsFromBackend]);

  const handleOpenChatWithUser = (user) => {
    setSelectedMatchUser(user || null);
    setCurrentTab('chats');
    loadChatsFromBackend();
  };

  if (isLoading) {
    return (
      <div className="mobile-wrapper">
        <SplashScreen onFinish={() => setIsLoading(false)} />
      </div>
    );
  }

  return (
    <div className="mobile-wrapper">
      {currentTab === 'swipe' && (
        <FeedPage
          currentUserId={CURRENT_USER_ID}
          onOpenChats={handleOpenChatWithUser}
          onMatchCreated={loadChatsFromBackend}
        />
      )}

      {currentTab === 'chats' && (
        <ChatsPage
          currentUserId={CURRENT_USER_ID}
          chats={chats}
          setChats={setChats}
          messagesByChat={messagesByChat}
          setMessagesByChat={setMessagesByChat}
          initialSelectedUser={selectedMatchUser}
          onClearInitialUser={() => setSelectedMatchUser(null)}
        />
      )}

      {currentTab === 'profile' && <ProfilePage />}

      <nav className="bottom-nav-bar">
        <button
          type="button"
          className={`nav-item ${currentTab === 'swipe' ? 'active' : ''}`}
          onClick={() => setCurrentTab('swipe')}
        >
          <Flame size={24} color={currentTab === 'swipe' ? '#ff4458' : '#71717a'} />
          <span>Свайпы</span>
        </button>

        <button
          type="button"
          className={`nav-item ${currentTab === 'chats' ? 'active' : ''}`}
          onClick={() => {
            setCurrentTab('chats');
            loadChatsFromBackend();
          }}
        >
          <MessageCircle size={24} color={currentTab === 'chats' ? '#ff4458' : '#71717a'} />
          <span>Чаты</span>
        </button>

        <button
          type="button"
          className={`nav-item ${currentTab === 'profile' ? 'active' : ''}`}
          onClick={() => setCurrentTab('profile')}
        >
          <User size={24} color={currentTab === 'profile' ? '#ff4458' : '#71717a'} />
          <span>Профиль</span>
        </button>
      </nav>
    </div>
  );
}