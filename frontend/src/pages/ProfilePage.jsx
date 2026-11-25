import React, { useState } from 'react';
import { Crown, Tv, CheckCircle2, Edit3, Plus, Trash2, ArrowLeft, Save } from 'lucide-react';
import MonetizationModal from '../components/ui/MonetizationModal';
import '../styles/profile.css';

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false);
  const [likesCount, setLikesCount] = useState(5);
  const [monetizationOpen, setMonetizationOpen] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const [profile, setProfile] = useState({
    name: 'Майса',
    age: 22,
    city: 'Ашхабад',
    job: 'Дизайнер интерьеров',
    bio: 'Люблю кофе, современную архитектуру и долгие прогулки по вечерам.',
    photos: [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&auto=format&fit=crop',
      '', '', ''
    ]
  });

  const handlePhotoChange = (index, value) => {
    const newPhotos = [...profile.photos];
    newPhotos[index] = value;
    setProfile({ ...profile, photos: newPhotos });
  };

  const handleSave = () => {
    setIsEditing(false);
    alert('✅ Изменения успешно сохранены!');
  };

  if (isEditing) {
    return (
      <div className="mobile-wrapper profile-screen edit-mode">
        <header className="profile-header">
          <button className="back-btn" onClick={() => setIsEditing(false)}>
            <ArrowLeft size={20} color="#fff" />
          </button>
          <h2>Редактировать анкету</h2>
          <button className="save-btn-top" onClick={handleSave}>
            <Save size={18} color="#22c55e" />
          </button>
        </header>

        <div className="edit-form-container">
          <label>Ваши фотографии (до 5 шт.)</label>
          <div className="edit-photos-grid">
            {profile.photos.map((photo, index) => (
              <div key={index} className="photo-slot">
                {photo ? (
                  <>
                    <img src={photo} alt={`Slot ${index}`} />
                    <button className="remove-photo-btn" onClick={() => handlePhotoChange(index, '')}>
                      <Trash2 size={14} color="#fff" />
                    </button>
                  </>
                ) : (
                  <div className="empty-slot" onClick={() => {
                    const url = prompt('Введите URL фотографии (ссылку на изображение):');
                    if (url) handlePhotoChange(index, url);
                  }}>
                    <Plus size={20} color="#71717a" />
                  </div>
                )}
              </div>
            ))}
          </div>

          <label>Имя и возраст</label>
          <div className="input-row">
            <input 
              type="text" 
              value={profile.name} 
              onChange={(e) => setProfile({ ...profile, name: e.target.value })} 
              placeholder="Имя"
            />
            <input 
              type="number" 
              value={profile.age} 
              onChange={(e) => setProfile({ ...profile, age: e.target.value })} 
              placeholder="Возраст"
              style={{ width: '80px' }}
            />
          </div>

          <label>Город</label>
          <select 
            value={profile.city} 
            onChange={(e) => setProfile({ ...profile, city: e.target.value })}
            className="filter-select"
          >
            <option value="Ашхабад">Ашхабад</option>
            <option value="Мары">Мары</option>
            <option value="Туркменабат">Туркменабат</option>
            <option value="Дашогуз">Дашогуз</option>
            <option value="Балканабат">Балканабат</option>
          </select>

          <label>О себе (Био)</label>
          <textarea 
            rows="3" 
            value={profile.bio} 
            onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-wrapper profile-screen">
      <header className="profile-header">
        <h2>Мой профиль</h2>
        <button className="edit-profile-icon-btn" onClick={() => setIsEditing(true)}>
          <Edit3 size={18} color="#fff" />
        </button>
      </header>

      <div 
        className="profile-card-preview"
        style={{ backgroundImage: `url('${profile.photos[0] || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop'}')` }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h3>{profile.name}, {profile.age}</h3>
          <CheckCircle2 size={18} color="#3b82f6" fill="#3b82f6" stroke="#fff" />
        </div>
        <p>💼 {profile.job} • {profile.city}</p>
      </div>

      {/* Баннер подписки */}
      <div className="premium-banner">
        <div className="premium-banner-top">
          <Crown size={22} color="#fff" />
          <h4>{isSubscribed ? 'Salam Plus активен ✨' : 'Salam Plus 🇹🇲'}</h4>
        </div>
        <p>
          {isSubscribed
            ? 'У вас подключена подписка: безлимитные лайки и приоритет в ленте.'
            : 'Безлимитные лайки, отмена свайпов и просмотр тех, кто вас оценил по доступной цене.'}
        </p>
        {!isSubscribed && (
          <button className="premium-btn" onClick={() => setMonetizationOpen(true)}>
            Подключить премиум
          </button>
        )}
      </div>

      {/* Реклама за лайки */}
      <div className="ads-reward-box">
        <div className="ads-reward-info">
          <h5>Лайки: {likesCount} шт.</h5>
          <p>Посмотрите короткий ролик и получите бонус</p>
        </div>
        <button className="watch-ad-btn" onClick={() => setMonetizationOpen(true)}>
          <Tv size={16} color="#a855f7" /> +5 лайков
        </button>
      </div>

      {/* Модалка монетизации */}
      <MonetizationModal
        isOpen={monetizationOpen}
        onClose={() => setMonetizationOpen(false)}
        likesLeft={likesCount}
        rewardAmount={5}
        onRewardEarned={(bonus) => setLikesCount((prev) => prev + bonus)}
        onSubscribe={() => setIsSubscribed(true)}
      />
    </div>
  );
}