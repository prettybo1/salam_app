import React, { useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import FeedPage from './pages/FeedPage';
import ChatsPage from './pages/ChatsPage';
import ProfilePage from './pages/ProfilePage';
import AuthPage from './pages/AuthPage';
import SplashScreen from './components/ui/SplashScreen';
import { Flame, MessageCircle, User } from 'lucide-react';
import { api, getAuthToken, setAuthToken } from './api/client';
import './styles/globals.css';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

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

function formatBackendChats(rows = [], prevChats = []) {
  const prevUnreadMap = new Map(
    prevChats.map((c) => [Number(c.id), c.unreadCount || 0])
  );

  return rows.map((row) => ({
    id: row.match_id,
    partnerId: row.partner_id,
    name: row.partner_name,
    url:
      row.partner_avatar ||
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop',
    lastMessage: row.last_message || 'Новый матч! Напиши первым',
    time: 'Сейчас',
    unreadCount: prevUnreadMap.get(Number(row.match_id)) ?? 0,
    online: true,
  }));
}

function showGlobalNotification(title, body, icon) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    try {
      new Notification(title, { body, icon });
    } catch {
      // Игнорируем ошибку создания уведомления
    }
  }
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  const [currentTab, setCurrentTab] = useState('swipe');
  const [selectedMatchUser, setSelectedMatchUser] = useState(null);
  const [activeChatId, setActiveChatId] = useState(null);
  const [socketInstance, setSocketInstance] = useState(null);

  const [chats, setChats] = useState(initialChats);
  const [messagesByChat, setMessagesByChat] = useState(initialMessagesByChat);

  const socketRef = useRef(null);
  const activeChatIdRef = useRef(null);
  const currentTabRef = useRef(currentTab);
  const chatsRef = useRef(chats);
  const currentUserIdRef = useRef(null);

  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  useEffect(() => {
    currentTabRef.current = currentTab;
  }, [currentTab]);

  useEffect(() => {
    chatsRef.current = chats;
  }, [chats]);

  useEffect(() => {
    currentUserIdRef.current = currentUser?.id ?? null;
  }, [currentUser?.id]);

  const loadChatsFromBackend = useCallback(async () => {
    if (!getAuthToken()) return;
    try {
      const data = await api.getChats();
      if (Array.isArray(data.chats)) {
        setChats((prev) => {
          const formatted = formatBackendChats(data.chats, prev);
          const sock = socketRef.current;
          if (sock && sock.connected) {
            formatted.forEach((c) => {
              if (c?.id) sock.emit('join_match', { matchId: c.id });
            });
          }
          return formatted;
        });
      }
    } catch {
      // Если бэкенд не запущен, оставляем локальный список
    }
  }, []);

  useEffect(() => {
    let active = true;
    async function bootstrapAuth() {
      const token = getAuthToken();
      if (!token) {
        if (active) setCheckingAuth(false);
        return;
      }
      try {
        const res = await api.getMe();
        if (active) {
          setCurrentUser(res.user);
        }
      } catch {
        setAuthToken('');
        if (active) setCurrentUser(null);
      } finally {
        if (active) setCheckingAuth(false);
      }
    }
    bootstrapAuth();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadChatsFromBackend();
    }
  }, [currentUser, loadChatsFromBackend]);

  // Один постоянный сокет на сессию пользователя — не пересоздаётся при смене вкладок
  useEffect(() => {
    const token = getAuthToken();
    const userId = currentUser?.id;
    if (!token || !userId) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    const joinAllRooms = () => {
      setSocketInstance(socket);
      (chatsRef.current || []).forEach((c) => {
        if (c?.id) {
          socket.emit('join_match', { matchId: c.id });
        }
      });
    };

    socket.on('connect', joinAllRooms);
    socket.on('disconnect', () => {
      setSocketInstance(null);
    });

    socket.on('new_message', (msg) => {
      const chatId = Number(msg.match_id);
      const myId = Number(currentUserIdRef.current);
      if (!chatId || !myId) return;

      const isFromMe = Number(msg.sender_id) === myId;
      const isViewingThisChat =
        currentTabRef.current === 'chats' &&
        Number(activeChatIdRef.current) === chatId &&
        !document.hidden;

      setMessagesByChat((prev) => {
        const list = prev[chatId] || [];
        if (list.some((m) => Number(m.id) === Number(msg.id))) {
          return prev;
        }

        if (isFromMe) {
          const pendingIdx = list.findIndex(
            (m) => m.fromMe && m.status === 'pending' && m.text === msg.body
          );
          if (pendingIdx !== -1) {
            const updated = [...list];
            updated[pendingIdx] = {
              id: msg.id,
              fromMe: true,
              text: msg.body,
              status: msg.status === 'sent' ? 'delivered' : msg.status || 'delivered',
            };
            return { ...prev, [chatId]: updated };
          }
        }

        return {
          ...prev,
          [chatId]: [
            ...list,
            {
              id: msg.id,
              fromMe: isFromMe,
              text: msg.body,
              status: msg.status === 'sent' ? 'delivered' : msg.status || 'delivered',
            },
          ],
        };
      });

      setChats((prev) => {
        const exists = prev.some((c) => Number(c.id) === chatId);
        if (!exists) {
          // Если пришёл message по новому матчу, которого ещё не было в списке — подтягиваем чаты
          loadChatsFromBackend();
        }
        return prev.map((c) => {
          if (Number(c.id) !== chatId) return c;
          const shouldIncrement = !isFromMe && !isViewingThisChat;
          return {
            ...c,
            lastMessage: msg.body,
            time: 'Сейчас',
            unreadCount: shouldIncrement ? (c.unreadCount || 0) + 1 : 0,
          };
        });
      });

      if (!isFromMe && !isViewingThisChat) {
        const senderChat = (chatsRef.current || []).find((c) => Number(c.id) === chatId);
        showGlobalNotification(
          senderChat?.name ? `Новое сообщение от ${senderChat.name}` : 'Новое сообщение в Salam',
          msg.body,
          senderChat?.url
        );
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setSocketInstance(null);
    };
  }, [currentUser?.id, loadChatsFromBackend]);

  // Подписываем сокет на комнаты при появлении новых id в списке чатов
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !socket.connected) return;

    (chats || []).forEach((c) => {
      if (c?.id) {
        socket.emit('join_match', { matchId: c.id });
      }
    });
  }, [chats, socketInstance]);

  const handleLogout = () => {
    setAuthToken('');
    setCurrentUser(null);
    setActiveChatId(null);
    setCurrentTab('swipe');
  };

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

  if (checkingAuth) {
    return (
      <div
        className="mobile-wrapper"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.7 }}
      >
        Загрузка...
      </div>
    );
  }

  if (!currentUser) {
    return (
      <AuthPage
        onAuthSuccess={(user) => {
          setCurrentUser(user);
          setCurrentTab('swipe');
        }}
      />
    );
  }

  const totalUnread = chats.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  return (
    <div className="mobile-wrapper">
      {currentTab === 'swipe' && (
        <FeedPage
          currentUserId={currentUser.id}
          onOpenChats={handleOpenChatWithUser}
          onMatchCreated={loadChatsFromBackend}
        />
      )}

      {currentTab === 'chats' && (
        <ChatsPage
          currentUserId={currentUser.id}
          socket={socketInstance}
          chats={chats}
          setChats={setChats}
          messagesByChat={messagesByChat}
          setMessagesByChat={setMessagesByChat}
          initialSelectedUser={selectedMatchUser}
          onClearInitialUser={() => setSelectedMatchUser(null)}
          onActiveChatChange={setActiveChatId}
        />
      )}

      {currentTab === 'profile' && (
        <ProfilePage
          currentUser={currentUser}
          onUserUpdated={setCurrentUser}
          onLogout={handleLogout}
        />
      )}

      <nav className="bottom-nav-bar">
        <button
          type="button"
          className={`nav-item ${currentTab === 'swipe' ? 'active' : ''}`}
          onClick={() => {
            setActiveChatId(null);
            setCurrentTab('swipe');
          }}
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
          <span style={{ position: 'relative', display: 'inline-flex' }}>
            <MessageCircle size={24} color={currentTab === 'chats' ? '#ff4458' : '#71717a'} />
            {totalUnread > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: -4,
                  right: -7,
                  minWidth: 16,
                  height: 16,
                  borderRadius: 999,
                  background: '#ff4458',
                  color: '#fff',
                  fontSize: 10,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 4px',
                }}
              >
                {totalUnread}
              </span>
            )}
          </span>
          <span>Чаты</span>
        </button>

        <button
          type="button"
          className={`nav-item ${currentTab === 'profile' ? 'active' : ''}`}
          onClick={() => {
            setActiveChatId(null);
            setCurrentTab('profile');
          }}
        >
          <User size={24} color={currentTab === 'profile' ? '#ff4458' : '#71717a'} />
          <span>Профиль</span>
        </button>
      </nav>
    </div>
  );
}