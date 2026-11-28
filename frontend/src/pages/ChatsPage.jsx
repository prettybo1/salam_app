import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, ArrowLeft, Send, X, Check, CheckCheck } from 'lucide-react';
import { api } from '../api/client';
import '../styles/chats.css';

const initialNewMatches = [
  {
    id: 1,
    name: 'Майса',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop',
  },
  {
    id: 3,
    name: 'Бахар',
    url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&auto=format&fit=crop',
  },
  {
    id: 4,
    name: 'Айджар',
    url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=500&auto=format&fit=crop',
  },
];

const nextStatusMap = {
  pending: 'delivered',
  sent: 'delivered',
  delivered: 'read',
  read: 'pending',
};

function DeliveryIndicator({ status = 'delivered', onClick }) {
  if (status === 'pending') {
    return (
      <span
        className="msg-status msg-status-pending"
        title="Отправляется... — нажмите для теста статуса"
        onClick={onClick}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          color: 'currentColor',
          opacity: 0.75,
        }}
      >
        <Check size={13} strokeWidth={2.4} />
      </span>
    );
  }

  if (status === 'read') {
    return (
      <span
        className="msg-status msg-status-read"
        title="Прочитано — нажмите для теста статуса"
        onClick={onClick}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          color: 'currentColor',
        }}
      >
        <span className="msg-read-circle" />
      </span>
    );
  }

  return (
    <span
      className="msg-status msg-status-sent"
      title="Доставлено — нажмите для теста статуса"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        color: 'currentColor',
      }}
    >
      <CheckCheck size={14} strokeWidth={2.3} />
    </span>
  );
}

function showBrowserNotification(title, body, icon) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    try {
      new Notification(title, { body, icon });
    } catch {
      // Игнорируем ошибку создания уведомления
    }
  }
}

export default function ChatsPage({
  currentUserId,
  socket,
  chats,
  setChats,
  messagesByChat,
  setMessagesByChat,
  initialSelectedUser,
  onClearInitialUser,
  onActiveChatChange,
}) {
  const [activeChat, setActiveChat] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [draftText, setDraftText] = useState('');

  const activeChatIdRef = useRef(null);
  const chatsRef = useRef(chats);

  useEffect(() => {
    const id = activeChat?.id ?? null;
    activeChatIdRef.current = id;
    onActiveChatChange?.(id);
  }, [activeChat, onActiveChatChange]);

  useEffect(() => {
    chatsRef.current = chats;
  }, [chats]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    }
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleMessagesRead = ({ matchId, readerId, messageIds }) => {
      if (Number(readerId) === Number(currentUserId)) return;
      const chatId = Number(matchId);
      const idSet = new Set((messageIds || []).map(Number));

      setMessagesByChat((prev) => {
        const list = prev[chatId] || [];
        return {
          ...prev,
          [chatId]: list.map((m) =>
            m.fromMe && (idSet.size === 0 || idSet.has(Number(m.id)))
              ? { ...m, status: 'read' }
              : m
          ),
        };
      });
    };

    const handleNewMessageNotify = (msg) => {
      const chatId = Number(msg.match_id);
      if (!chatId) return;

      const isFromMe = Number(msg.sender_id) === Number(currentUserId);
      const isCurrentOpenChat = Number(activeChatIdRef.current) === chatId;

      if (!isFromMe && isCurrentOpenChat && !document.hidden) {
        socket.emit('mark_read', { matchId: chatId });
      }

      if (!isFromMe && (!isCurrentOpenChat || document.hidden)) {
        const senderChat = (chatsRef.current || []).find((c) => Number(c.id) === chatId);
        showBrowserNotification(
          senderChat?.name ? `Новое сообщение от ${senderChat.name}` : 'Новое сообщение в Salam',
          msg.body,
          senderChat?.url
        );
      }
    };

    socket.on('messages_read', handleMessagesRead);
    socket.on('new_message', handleNewMessageNotify);

    return () => {
      socket.off('messages_read', handleMessagesRead);
      socket.off('new_message', handleNewMessageNotify);
    };
  }, [socket, currentUserId, setMessagesByChat]);

  useEffect(() => {
    if (!socket || !socket.connected) return;
    (chats || []).forEach((c) => {
      if (c?.id) {
        socket.emit('join_match', { matchId: c.id });
      }
    });
  }, [socket, chats]);

  useEffect(() => {
    const chatId = activeChat?.id;
    if (!socket || !chatId) return;

    socket.emit('join_match', { matchId: chatId });
    socket.emit('mark_read', { matchId: chatId });

    return () => {
      socket.emit('leave_match', { matchId: chatId });
    };
  }, [socket, activeChat?.id]);

  useEffect(() => {
    if (!initialSelectedUser) return;

    const avatarUrl =
      initialSelectedUser.photos?.[0] ||
      initialSelectedUser.url ||
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop';

    const chatId = initialSelectedUser.matchId || initialSelectedUser.id;

    const matchedChat = {
      id: chatId,
      partnerId: initialSelectedUser.id,
      name: initialSelectedUser.name,
      url: avatarUrl,
      lastMessage: 'Новый мэтч! Напишите первым',
      time: 'Сейчас',
      unreadCount: 0,
      online: true,
    };

    setChats((prev) => {
      const exists = prev.some((c) => c.id === matchedChat.id);
      return exists ? prev : [matchedChat, ...prev];
    });

    setMessagesByChat((prev) => {
      if (prev[matchedChat.id]) return prev;
      return {
        ...prev,
        [matchedChat.id]: [],
      };
    });

    setActiveChat(matchedChat);
    onClearInitialUser?.();
  }, [initialSelectedUser, onClearInitialUser, setChats, setMessagesByChat]);

  const loadChatMessages = async (chatId) => {
    if (!chatId) return;
    try {
      const data = await api.getMessages(chatId);
      if (Array.isArray(data.messages)) {
        const mapped = data.messages.map((m) => ({
          id: m.id,
          fromMe: Number(m.sender_id) === Number(currentUserId),
          text: m.body,
          status: m.status === 'sent' ? 'delivered' : m.status || 'delivered',
        }));
        setMessagesByChat((prev) => ({
          ...prev,
          [chatId]: mapped,
        }));

        if (mapped.length > 0) {
          const lastText = mapped[mapped.length - 1].text;
          setChats((prev) =>
            prev.map((c) =>
              Number(c.id) === Number(chatId)
                ? { ...c, lastMessage: lastText, unreadCount: 0 }
                : c
            )
          );
        }
      }
    } catch {
      // Оставляем локальную историю, если бэкенд недоступен
    }
  };

  const handleOpenChat = (chat) => {
    setChats((prev) =>
      prev.map((item) =>
        item.id === chat.id ? { ...item, unreadCount: 0 } : item
      )
    );
    setActiveChat({ ...chat, unreadCount: 0 });
    loadChatMessages(chat.id);
    if (socket && socket.connected) {
      socket.emit('mark_read', { matchId: chat.id });
    }
  };

  const handleCycleMessageStatus = (chatId, msgId) => {
    setMessagesByChat((prev) => {
      const list = prev[chatId] || [];
      return {
        ...prev,
        [chatId]: list.map((m) =>
          m.id === msgId ? { ...m, status: nextStatusMap[m.status || 'delivered'] } : m
        ),
      };
    });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const trimmed = draftText.trim();
    if (!trimmed || !activeChat) return;

    const chatId = activeChat.id;
    const tempId = Date.now();

    const optimisticMsg = {
      id: tempId,
      fromMe: true,
      text: trimmed,
      status: 'pending',
    };

    setMessagesByChat((prev) => ({
      ...prev,
      [chatId]: [...(prev[chatId] || []), optimisticMsg],
    }));

    setChats((prev) =>
      prev.map((item) =>
        item.id === chatId
          ? { ...item, lastMessage: trimmed, time: 'Сейчас', unreadCount: 0 }
          : item
      )
    );

    setDraftText('');

    if (socket && socket.connected) {
      socket.emit('send_message', { matchId: chatId, body: trimmed });
      return;
    }

    try {
      const saved = await api.sendMessage({
        matchId: chatId,
        senderId: currentUserId,
        body: trimmed,
      });

      const realId = saved?.message?.id ?? tempId;
      const realStatus =
        saved?.message?.status === 'sent' ? 'delivered' : saved?.message?.status || 'delivered';

      setMessagesByChat((prev) => {
        const list = prev[chatId] || [];
        return {
          ...prev,
          [chatId]: list.map((m) =>
            m.id === tempId ? { ...m, id: realId, status: realStatus } : m
          ),
        };
      });
    } catch {
      setMessagesByChat((prev) => {
        const list = prev[chatId] || [];
        return {
          ...prev,
          [chatId]: list.map((m) =>
            m.id === tempId && m.status === 'pending' ? { ...m, status: 'delivered' } : m
          ),
        };
      });
    }
  };

  const filteredChats = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return chats;
    return chats.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.lastMessage && c.lastMessage.toLowerCase().includes(q))
    );
  }, [chats, searchQuery]);

  const socketConnected = Boolean(socket?.connected);

  if (activeChat) {
    const currentMessages = messagesByChat[activeChat.id] || [];

    return (
      <div className="mobile-wrapper chat-room-screen">
        <header className="chat-room-header">
          <button
            type="button"
            className="back-btn"
            onClick={() => setActiveChat(null)}
            aria-label="Назад"
          >
            <ArrowLeft size={20} color="#fff" />
          </button>

          <img src={activeChat.url} alt={activeChat.name} className="chat-room-avatar" />

          <div className="chat-room-title">
            <h3>{activeChat.name}</h3>
            <span>{socketConnected ? 'онлайн' : 'подключение...'}</span>
          </div>
        </header>

        <div className="messages-container">
          {currentMessages.length === 0 ? (
            <div style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 40, fontSize: 13 }}>
              Начните диалог с {activeChat.name} — напишите первое сообщение!
            </div>
          ) : (
            currentMessages.map((msg) => (
              <div
                key={msg.id}
                className={`message-bubble ${msg.fromMe ? 'my-message' : 'their-message'}`}
                style={
                  msg.fromMe
                    ? { display: 'flex', alignItems: 'center', gap: 6 }
                    : undefined
                }
              >
                {msg.fromMe && (
                  <span className="msg-meta-row" style={{ order: -1 }}>
                    <DeliveryIndicator
                      status={msg.status || 'delivered'}
                      onClick={() => handleCycleMessageStatus(activeChat.id, msg.id)}
                    />
                  </span>
                )}
                <span>{msg.text}</span>
              </div>
            ))
          )}
        </div>

        <form className="chat-input-area" onSubmit={handleSendMessage}>
          <input
            type="text"
            placeholder="Написать сообщение..."
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
          />
          <button type="submit" className="chat-send-btn" aria-label="Отправить">
            <Send size={17} color="#fff" />
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="mobile-wrapper chats-screen">
      <header className="chats-header">
        {searchOpen ? (
          <div className="search-bar-input">
            <input
              type="text"
              placeholder="Поиск по сообщениям и именам..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            <button
              type="button"
              onClick={() => {
                setSearchOpen(false);
                setSearchQuery('');
              }}
              aria-label="Закрыть поиск"
            >
              <X size={18} color="#fff" />
            </button>
          </div>
        ) : (
          <>
            <h2>Сообщения</h2>
            <button
              type="button"
              className="search-icon-btn"
              onClick={() => setSearchOpen(true)}
              aria-label="Поиск"
            >
              <Search size={17} color="#fff" />
            </button>
          </>
        )}
      </header>

      <section className="matches-section">
        <h4>Новые симпатии</h4>
        <div className="matches-carousel">
          {initialNewMatches.map((match) => (
            <div
              key={match.id}
              className="match-item"
              onClick={() =>
                handleOpenChat({
                  id: match.id,
                  name: match.name,
                  url: match.url,
                  lastMessage: 'Новый мэтч! Напишите первым',
                  time: 'Сейчас',
                  unreadCount: 0,
                  online: true,
                })
              }
            >
              <div
                className="match-avatar-wrapper"
                style={{ backgroundImage: `url(${match.url})` }}
              >
                <span className="match-dot" />
              </div>
              <span>{match.name}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="chats-list-section">
        <h4>Диалоги</h4>
        <div className="chats-list">
          {filteredChats.map((chat) => (
            <div
              key={chat.id}
              className="chat-item"
              onClick={() => handleOpenChat(chat)}
            >
              <img src={chat.url} alt={chat.name} className="chat-item-avatar" />

              <div className="chat-item-info">
                <div className="chat-item-top">
                  <h5>{chat.name}</h5>
                  <span className="chat-time">{chat.time}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <p className="chat-last-msg">{chat.lastMessage}</p>
                  {chat.unreadCount > 0 && (
                    <span className="unread-badge">{chat.unreadCount}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}