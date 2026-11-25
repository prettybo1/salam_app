import React, { useState, useEffect, useMemo } from 'react';
import { Search, ArrowLeft, Send, X, Check } from 'lucide-react';
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
  pending: 'sent',
  sent: 'read',
  read: 'pending',
};

function DeliveryIndicator({ status = 'sent', onClick }) {
  if (status === 'pending') {
    return (
      <span
        className="msg-status msg-status-pending"
        title="Не отправлено (плохое соединение) — нажмите для теста статуса"
        onClick={onClick}
      >
        <Check size={13} strokeWidth={2.5} />
      </span>
    );
  }

  if (status === 'read') {
    return (
      <span
        className="msg-status msg-status-read"
        title="Прочитано — нажмите для теста статуса"
        onClick={onClick}
      >
        <span className="msg-read-circle" />
      </span>
    );
  }

  return (
    <span
      className="msg-status msg-status-sent"
      title="Отправлено — нажмите для теста статуса"
      onClick={onClick}
    >
      <Check size={13} strokeWidth={2.5} />
    </span>
  );
}

export default function ChatsPage({
  chats,
  setChats,
  messagesByChat,
  setMessagesByChat,
  initialSelectedUser,
  onClearInitialUser,
}) {
  const [activeChat, setActiveChat] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [draftText, setDraftText] = useState('');

  useEffect(() => {
    if (!initialSelectedUser) return;

    const avatarUrl =
      initialSelectedUser.photos?.[0] ||
      initialSelectedUser.url ||
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop';

    const matchedChat = {
      id: initialSelectedUser.id,
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

  const handleOpenChat = (chat) => {
    setChats((prev) =>
      prev.map((item) =>
        item.id === chat.id ? { ...item, unreadCount: 0 } : item
      )
    );
    setActiveChat({ ...chat, unreadCount: 0 });
  };

  const handleCycleMessageStatus = (chatId, msgId) => {
    setMessagesByChat((prev) => {
      const list = prev[chatId] || [];
      return {
        ...prev,
        [chatId]: list.map((m) =>
          m.id === msgId ? { ...m, status: nextStatusMap[m.status || 'sent'] } : m
        ),
      };
    });
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    const trimmed = draftText.trim();
    if (!trimmed || !activeChat) return;

    const chatId = activeChat.id;
    const msgId = Date.now();

    const newMsg = {
      id: msgId,
      fromMe: true,
      text: trimmed,
      status: 'pending', // сначала серый — отправка / проверка связи
    };

    setMessagesByChat((prev) => ({
      ...prev,
      [chatId]: [...(prev[chatId] || []), newMsg],
    }));

    setChats((prev) =>
      prev.map((item) =>
        item.id === chatId
          ? { ...item, lastMessage: trimmed, time: 'Сейчас', unreadCount: 0 }
          : item
      )
    );

    setDraftText('');

    // Имитация отправки: через 700 мс переводим в тёмно-розовую галочку
    setTimeout(() => {
      setMessagesByChat((prev) => {
        const list = prev[chatId] || [];
        return {
          ...prev,
          [chatId]: list.map((m) =>
            m.id === msgId && m.status === 'pending' ? { ...m, status: 'sent' } : m
          ),
        };
      });
    }, 700);
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
            <span>{activeChat.online ? 'онлайн' : 'был(а) недавно'}</span>
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
              >
                <span>{msg.text}</span>
                {msg.fromMe && (
                  <span className="msg-meta-row">
                    <DeliveryIndicator
                      status={msg.status || 'sent'}
                      onClick={() => handleCycleMessageStatus(activeChat.id, msg.id)}
                    />
                  </span>
                )}
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