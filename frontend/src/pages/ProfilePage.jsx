import React, { useState, useEffect, useRef } from 'react';
import {
  Crown,
  Tv,
  CheckCircle2,
  Edit3,
  Plus,
  Trash2,
  ArrowLeft,
  Save,
  LogOut,
  Camera,
} from 'lucide-react';
import MonetizationModal from '../components/ui/MonetizationModal';
import { api } from '../api/client';
import '../styles/profile.css';

function buildSlotsFromUser(user) {
  const existing = Array.isArray(user?.photos) && user.photos.length > 0
    ? user.photos
    : user?.avatar_url
      ? [user.avatar_url]
      : [];
  const slots = ['', '', '', '', ''];
  existing.slice(0, 5).forEach((url, idx) => {
    slots[idx] = url;
  });
  return slots;
}

export default function ProfilePage({ currentUser, onUserUpdated, onLogout }) {
  const [isEditing, setIsEditing] = useState(false);
  const [likesCount, setLikesCount] = useState(currentUser?.likes_remaining ?? 15);
  const [monetizationOpen, setMonetizationOpen] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(Boolean(currentUser?.is_premium));
  const [uploadingSlot, setUploadingSlot] = useState(null);
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef(null);
  const activeSlotRef = useRef(0);

  const [profile, setProfile] = useState(() => ({
    name: currentUser?.name || '',
    age: currentUser?.age || 22,
    city: currentUser?.city || 'Ашхабад',
    job: currentUser?.job || '',
    bio: currentUser?.bio || '',
    photos: buildSlotsFromUser(currentUser),
  }));

  useEffect(() => {
    if (!currentUser) return;
    setLikesCount(currentUser.likes_remaining ?? 15);
    setIsSubscribed(Boolean(currentUser.is_premium));
    setProfile({
      name: currentUser.name || '',
      age: currentUser.age || 22,
      city: currentUser.city || 'Ашхабад',
      job: currentUser.job || '',
      bio: currentUser.bio || '',
      photos: buildSlotsFromUser(currentUser),
    });
  }, [currentUser]);

  const handleOpenFilePicker = (slotIndex) => {
    activeSlotRef.current = slotIndex;
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const slotIndex = activeSlotRef.current;
    setUploadingSlot(slotIndex);

    try {
      const uploaded = await api.uploadPhoto(file);
      if (uploaded?.url) {
        setProfile((prev) => {
          const nextPhotos = [...prev.photos];
          nextPhotos[slotIndex] = uploaded.url;
          return { ...prev, photos: nextPhotos };
        });
      }
    } catch (err) {
      alert(err.message || 'Не удалось загрузить фото');
    } finally {
      setUploadingSlot(null);
    }
  };

  const handleRemovePhoto = (index) => {
    setProfile((prev) => {
      const nextPhotos = [...prev.photos];
      nextPhotos[index] = '';
      return { ...prev, photos: nextPhotos };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const cleanPhotos = profile.photos.filter(Boolean);
      const res = await api.updateProfile({
        name: profile.name,
        age: Number(profile.age),
        city: profile.city,
        job: profile.job,
        bio: profile.bio,
        photos: cleanPhotos,
      });
      if (res?.user) {
        onUserUpdated?.(res.user);
        setProfile((prev) => ({
          ...prev,
          photos: buildSlotsFromUser(res.user),
        }));
      }
      setIsEditing(false);
    } catch (err) {
      alert(err.message || 'Ошибка сохранения профиля');
    } finally {
      setSaving(false);
    }
  };

  const handleRewardEarned = async (bonus) => {
    try {
      const res = await api.rewardAd({ rewardLikes: bonus });
      if (res?.wallet?.likes_remaining !== undefined) {
        setLikesCount(res.wallet.likes_remaining);
        onUserUpdated?.({ ...currentUser, likes_remaining: res.wallet.likes_remaining });
        return;
      }
    } catch {
      // Фолбэк при оффлайн-тесте
    }
    setLikesCount((prev) => prev + bonus);
  };

  if (isEditing) {
    return (
      <div className="mobile-wrapper profile-screen edit-mode">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          style={{ display: 'none' }}
          onChange={handleFileSelected}
        />

        <header className="profile-header">
          <button type="button" className="back-btn" onClick={() => setIsEditing(false)}>
            <ArrowLeft size={20} color="#fff" />
          </button>
          <h2>Редактировать анкету</h2>
          <button type="button" className="save-btn-top" onClick={handleSave} disabled={saving}>
            <Save size={18} color="#22c55e" />
          </button>
        </header>

        <div className="edit-form-container">
          <label>Ваши фотографии (до 5 шт. с устройства)</label>
          <div className="edit-photos-grid">
            {profile.photos.map((photo, index) => (
              <div key={index} className="photo-slot">
                {photo ? (
                  <>
                    <img src={photo} alt={`Slot ${index}`} />
                    <button
                      type="button"
                      className="remove-photo-btn"
                      onClick={() => handleRemovePhoto(index)}
                    >
                      <Trash2 size={14} color="#fff" />
                    </button>
                  </>
                ) : (
                  <div
                    className="empty-slot"
                    onClick={() => handleOpenFilePicker(index)}
                    style={{ cursor: 'pointer' }}
                  >
                    <Plus size={20} color="#71717a" />
                    {uploadingSlot === index && (
                      <span style={{ fontSize: 10, opacity: 0.7 }}>...</span>
                    )}
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

          <label>Деятельность / профессия</label>
          <input
            type="text"
            value={profile.job}
            onChange={(e) => setProfile({ ...profile, job: e.target.value })}
            placeholder="Например: Дизайнер или Разработчик"
          />

          <label>О себе (Био)</label>
          <textarea
            rows="3"
            value={profile.bio}
            onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
            placeholder="Расскажите о себе..."
          />
        </div>
      </div>
    );
  }

  const mainPhoto = profile.photos.find(Boolean);

  return (
    <div className="mobile-wrapper profile-screen">
      <header className="profile-header">
        <h2>Мой профиль</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className="edit-profile-icon-btn"
            onClick={() => setIsEditing(true)}
            title="Редактировать"
          >
            <Edit3 size={18} color="#fff" />
          </button>
          {onLogout && (
            <button
              type="button"
              className="edit-profile-icon-btn"
              onClick={onLogout}
              title="Выйти"
            >
              <LogOut size={18} color="#f87171" />
            </button>
          )}
        </div>
      </header>

      <div
        className="profile-card-preview"
        style={{
          backgroundImage: mainPhoto ? `url('${mainPhoto}')` : 'none',
          backgroundColor: mainPhoto ? undefined : 'rgba(255,255,255,0.06)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: mainPhoto ? 'flex-end' : 'center',
          alignItems: mainPhoto ? 'flex-start' : 'center',
          gap: 8,
        }}
      >
        {!mainPhoto && (
          <button
            type="button"
            className="premium-btn"
            onClick={() => setIsEditing(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Camera size={16} /> Добавить фото
          </button>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h3>
            {profile.name || 'Пользователь'}, {profile.age}
          </h3>
          {currentUser?.verified && (
            <CheckCircle2 size={18} color="#3b82f6" fill="#3b82f6" stroke="#fff" />
          )}
        </div>
        <p>
          {profile.job ? `💼 ${profile.job} • ` : ''}
          {profile.city}
        </p>
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
          <button type="button" className="premium-btn" onClick={() => setMonetizationOpen(true)}>
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
        <button type="button" className="watch-ad-btn" onClick={() => setMonetizationOpen(true)}>
          <Tv size={16} color="#a855f7" /> +5 лайков
        </button>
      </div>

      <MonetizationModal
        isOpen={monetizationOpen}
        onClose={() => setMonetizationOpen(false)}
        likesLeft={likesCount}
        rewardAmount={5}
        onRewardEarned={handleRewardEarned}
        onSubscribe={() => setIsSubscribed(true)}
      />
    </div>
  );
}