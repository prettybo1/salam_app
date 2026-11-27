import React, { useState, useEffect, useMemo, useCallback } from 'react';
import MatchModal from '../components/ui/MatchModal';
import { api } from '../api/client';
import {
  Heart,
  X,
  RotateCcw,
  Star,
  Zap,
  Sliders,
  CheckCircle2,
  ChevronUp,
  ChevronDown,
  Tv,
} from 'lucide-react';

const fallbackPhoto =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop';

const initialPeople = [
  {
    id: 1,
    name: 'Майса',
    age: 22,
    city: 'Ашхабад',
    job: 'Дизайнер интерьеров',
    bio: 'Люблю кофе, современную архитектуру и долгие прогулки по вечерам.',
    hobbies: ['Дизайн', 'Кофе', 'Путешествия'],
    verified: true,
    isPopular: true,
    photos: [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&auto=format&fit=crop',
    ],
  },
  {
    id: 2,
    name: 'Селим',
    age: 24,
    city: 'Ашхабад',
    job: 'Frontend Разработчик',
    bio: 'Пишу код, играю на гитаре, по выходным выезжаю в горы.',
    hobbies: ['Код', 'Гитара', 'Походы'],
    verified: false,
    isPopular: false,
    photos: [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop',
    ],
  },
  {
    id: 3,
    name: 'Бахар',
    age: 21,
    city: 'Мары',
    job: 'Маркетолог',
    bio: 'Обожаю фотографировать закаты и изучать языки.',
    hobbies: ['Фото', 'Языки', 'Йога'],
    verified: true,
    isPopular: true,
    photos: [
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&auto=format&fit=crop',
    ],
  },
];

function normalizeBackendProfile(row) {
  const parsedPhotos = Array.isArray(row.photos) && row.photos.length > 0
    ? row.photos
    : row.avatar_url
      ? [row.avatar_url]
      : [fallbackPhoto];

  return {
    id: row.id,
    name: row.name,
    age: row.age,
    city: row.city || 'Ашхабад',
    job: row.job || (row.is_premium ? 'Salam Plus' : 'Пользователь Salam'),
    bio: row.bio || 'Расскажу о себе при встрече.',
    hobbies: Array.isArray(row.hobbies) && row.hobbies.length > 0
      ? row.hobbies
      : ['Общение', 'Кофе', 'Прогулки'],
    verified: Boolean(row.verified ?? row.is_premium),
    isPopular: row.feed_category === 'popular',
    photos: parsedPhotos,
  };
}

export default function FeedPage({ currentUserId = 1, onOpenChats, onMatchCreated }) {
  const [feedTab, setFeedTab] = useState('for_you'); // 'for_you' | 'popular'
  const [selectedCity, setSelectedCity] = useState('Все');
  const [draftCity, setDraftCity] = useState('Все');
  const [maxAge, setMaxAge] = useState(35);

  const [people, setPeople] = useState(initialPeople);
  const [history, setHistory] = useState([]);
  const [likedUsers, setLikedUsers] = useState([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [matchedUser, setMatchedUser] = useState(null);

  const [swipeDirection, setSwipeDirection] = useState(null);
  const [swipeCount, setSwipeCount] = useState(0);
  const [isAdCard, setIsAdCard] = useState(false);

  const loadFeed = useCallback(async () => {
    try {
      const data = await api.getFeed({
        userId: currentUserId,
        city: selectedCity,
      });
      if (Array.isArray(data.profiles)) {
        const mapped = data.profiles.map(normalizeBackendProfile);
        setPeople(mapped);
      }
    } catch {
      // Если бэкенд выключен, оставляем локальный список
    }
  }, [currentUserId, selectedCity]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const visiblePeople = useMemo(() => {
    let list = people.filter((p) => (p.age ? p.age <= maxAge : true));
    if (selectedCity && selectedCity !== 'Все') {
      list = list.filter((p) => p.city === selectedCity);
    }
    if (feedTab === 'popular') {
      const popularOnly = list.filter((p) => p.isPopular);
      return popularOnly.length > 0 ? popularOnly : list;
    }
    return list;
  }, [people, feedTab, selectedCity, maxAge]);

  const currentPerson = visiblePeople[0];

  const handleTabSwitch = (nextTab) => {
    if (nextTab === feedTab) return;
    setFeedTab(nextTab);
    setCurrentPhotoIndex(0);
    setShowDetails(false);
    setIsAdCard(false);
  };

  const handleApplyFilters = () => {
    setSelectedCity(draftCity);
    setFilterOpen(false);
    setCurrentPhotoIndex(0);
    setShowDetails(false);
  };

  const handleSwipe = async (direction, isSuperLike = false) => {
    if (!currentPerson || swipeDirection) return;

    const personToSwipe = currentPerson;
    const isLike = direction === 'right' || isSuperLike;

    setSwipeDirection(direction);
    setShowDetails(false);

    let backendMatched = false;

    if (!isAdCard) {
      try {
        const res = await api.sendSwipe({
          fromUserId: currentUserId,
          toUserId: personToSwipe.id,
          action: isLike ? 'like' : 'pass',
        });
        backendMatched = Boolean(res?.isMatch);
      } catch {
        // Фолбэк для оффлайн-режима без бэкенда
        backendMatched = isLike && (personToSwipe.id % 2 === 0 || isSuperLike);
      }
    }

    if (isLike && !isAdCard) {
      setLikedUsers((prev) =>
        prev.includes(personToSwipe.id) ? prev : [...prev, personToSwipe.id]
      );
      if (backendMatched || isSuperLike) {
        setMatchedUser(personToSwipe);
        onMatchCreated?.();
      }
    }

    setTimeout(() => {
      if (!isAdCard) {
        setHistory((prev) => [{ person: personToSwipe, isAd: false }, ...prev]);
      }

      const nextCount = swipeCount + 1;
      setSwipeCount(nextCount);

      if (nextCount % 8 === 0) {
        setIsAdCard(true);
      } else {
        setIsAdCard(false);
        setPeople((prev) => {
          const filtered = prev.filter((p) => p.id !== personToSwipe.id);
          return filtered;
        });
      }

      setCurrentPhotoIndex(0);
      setSwipeDirection(null);
    }, 300);
  };

  const handlePhotoTap = (e) => {
    if (showDetails || isAdCard || !currentPerson) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    if (clickX < rect.width / 3) {
      setCurrentPhotoIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else {
      setCurrentPhotoIndex((prev) =>
        prev < currentPerson.photos.length - 1 ? prev + 1 : prev
      );
    }
  };

  return (
    <div className="mobile-wrapper">
      {/* Шапка */}
      <header className="app-header-ref">
        <button
          type="button"
          className="icon-btn-top"
          onClick={() => {
            setDraftCity(selectedCity);
            setFilterOpen(true);
          }}
        >
          <Sliders size={18} color="#fff" />
        </button>

        <div className="top-tabs">
          <button
            type="button"
            className={`tab-btn ${feedTab === 'for_you' ? 'active-tab' : ''}`}
            onClick={() => handleTabSwitch('for_you')}
          >
            Для вас
          </button>
          <button
            type="button"
            className={`tab-btn ${feedTab === 'popular' ? 'active-tab' : ''}`}
            onClick={() => handleTabSwitch('popular')}
          >
            Популярные
          </button>
        </div>

        <div style={{ width: 38 }}></div>
      </header>

      {/* Модалка фильтров */}
      {filterOpen && (
        <div className="details-modal filter-active-modal">
          <div className="close-details" onClick={() => setFilterOpen(false)}>
            <ChevronDown size={22} />
          </div>
          <h4>Фильтры поиска 🇹🇲</h4>

          <div className="filter-group">
            <label>Город</label>
            <select
              className="filter-select"
              value={draftCity}
              onChange={(e) => setDraftCity(e.target.value)}
            >
              <option value="Все">Все города</option>
              <option value="Ашхабад">Ашхабад</option>
              <option value="Мары">Мары</option>
              <option value="Туркменабад">Туркменабад</option>
              <option value="Дашогуз">Дашогуз</option>
              <option value="Балканабат">Балканабат</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Возраст: 18 - {maxAge} лет</label>
            <input
              type="range"
              min="18"
              max="50"
              value={maxAge}
              onChange={(e) => setMaxAge(Number(e.target.value))}
              className="filter-range"
            />
          </div>

          <button
            type="button"
            className="premium-btn"
            style={{ marginTop: 20, width: '100%' }}
            onClick={handleApplyFilters}
          >
            Применить фильтры
          </button>
        </div>
      )}

      {/* Зона карточки с анимацией свайпа */}
      <div className="card-container" onClick={handlePhotoTap}>
        {isAdCard ? (
          <div className="card ad-card-style">
            <div className="ad-badge">Реклама от партнеров</div>
            <div className="ad-card-content">
              <Tv size={46} color="#ff4458" />
              <h3>Salam Gold</h3>
              <p>
                Откройте безлимитные лайки и премиум-доступ по специальной цене в Туркменистане.
              </p>
              <button
                type="button"
                className="ad-card-action-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSwipe('right');
                }}
              >
                Узнать больше
              </button>
            </div>
          </div>
        ) : currentPerson ? (
          <div
            className={`card ${swipeDirection ? `swipe-${swipeDirection}` : ''}`}
            style={{ backgroundImage: `url(${currentPerson.photos[currentPhotoIndex]})` }}
          >
            <div className="photo-indicators-container">
              {currentPerson.photos.map((_, idx) => (
                <div
                  key={idx}
                  className={`photo-indicator-bar ${idx === currentPhotoIndex ? 'active' : ''}`}
                />
              ))}
            </div>

            <div className="card-info">
              <div className="name-row">
                <h3>
                  {currentPerson.name}, {currentPerson.age}
                </h3>
                {currentPerson.verified && (
                  <CheckCircle2 size={20} color="#3b82f6" fill="#3b82f6" stroke="#fff" />
                )}
                {likedUsers.includes(currentPerson.id) && (
                  <span className="already-liked-badge">♥ Вы лайкнули</span>
                )}
              </div>
              <p className="job-title">{currentPerson.job}</p>
              <p className="city-text">{currentPerson.city}</p>

              <div
                className="swipe-up-hint"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDetails(!showDetails);
                }}
              >
                <ChevronUp size={14} /> Нажмите для подробностей
              </div>
            </div>

            {showDetails && (
              <div className="details-modal" onClick={(e) => e.stopPropagation()}>
                <div className="close-details" onClick={() => setShowDetails(false)}>
                  <ChevronDown size={20} />
                </div>
                <h4>О себе</h4>
                <p>{currentPerson.bio}</p>
                <h4>Интересы</h4>
                <div className="hobbies-list">
                  {currentPerson.hobbies.map((hobby, index) => (
                    <span key={index} className="hobby-tag">
                      {hobby}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
            <div>
              <h3>Анкеты закончились</h3>
              <p style={{ opacity: 0.75, marginTop: 8 }}>
                Попробуйте выбрать «Все города» или сменить вкладку.
              </p>
              <button
                type="button"
                className="premium-btn"
                style={{ marginTop: 16 }}
                onClick={() => {
                  setSelectedCity('Все');
                  setDraftCity('Все');
                  loadFeed();
                }}
              >
                Обновить ленту
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Кнопки управления */}
      <div className="action-buttons-ref">
        <button
          type="button"
          className="btn-action reload"
          onClick={() => {
            if (history.length > 0) {
              const last = history[0];
              setPeople([last.person, ...people]);
              setHistory(history.slice(1));
              setIsAdCard(false);
            }
          }}
        >
          <RotateCcw size={20} color="#eab308" />
        </button>

        <button
          type="button"
          className="btn-action dislike"
          onClick={() => handleSwipe('left')}
        >
          <X size={28} color="#ef4444" />
        </button>

        <button
          type="button"
          className="btn-action star"
          onClick={() => handleSwipe('right', true)}
        >
          <Star size={22} color="#3b82f6" fill="#3b82f6" />
        </button>

        <button
          type="button"
          className="btn-action like"
          onClick={() => handleSwipe('right')}
        >
          <Heart size={28} color="#22c55e" fill="#22c55e" />
        </button>

        <button type="button" className="btn-action boost">
          <Zap size={22} color="#a855f7" fill="#a855f7" />
        </button>
      </div>

      <MatchModal
        matchedUser={matchedUser}
        onClose={() => setMatchedUser(null)}
        onStartChat={(user) => {
          setMatchedUser(null);
          onOpenChats?.(user);
        }}
      />
    </div>
  );
}