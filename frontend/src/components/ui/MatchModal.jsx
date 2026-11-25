import React from 'react';
import { Heart, MessageCircle, Sparkles } from 'lucide-react';
import './MatchModal.css';

const DEFAULT_MY_AVATAR =
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop';

export default function MatchModal({
  matchedUser,
  myAvatar = DEFAULT_MY_AVATAR,
  onClose,
  onStartChat,
}) {
  if (!matchedUser) return null;

  const theirAvatar =
    matchedUser.photos?.[0] ||
    matchedUser.url ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop';

  return (
    <div className="match-overlay">
      <div className="match-top-badge">
        <Sparkles size={14} />
        <span>Взаимная симпатия</span>
      </div>

      <div className="match-center">
        <h2 className="match-title">Это мэтч!</h2>
        <p className="match-subtitle">
          Вы и <strong>{matchedUser.name}</strong> понравились друг другу. Самое время написать первым.
        </p>

        <div className="match-avatars-row">
          <img src={myAvatar} alt="Ваш профиль" className="match-avatar left" />
          <div className="match-heart-pill">
            <Heart size={20} color="#fff" fill="#fff" />
          </div>
          <img src={theirAvatar} alt={matchedUser.name} className="match-avatar right" />
        </div>
      </div>

      <div className="match-actions">
        <button
          type="button"
          className="match-primary-btn"
          onClick={() => onStartChat?.(matchedUser)}
        >
          <MessageCircle size={18} />
          <span>Написать {matchedUser.name}</span>
        </button>

        <button
          type="button"
          className="match-secondary-btn"
          onClick={onClose}
        >
          Продолжить свайпать
        </button>
      </div>
    </div>
  );
}