import React, { useState, useMemo } from 'react';
import MatchModal from '../components/ui/MatchModal';
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
  Tv
} from 'lucide-react';

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
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&auto=format&fit=crop'
    ]
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
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop'
    ]
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
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&auto=format&fit=crop'
    ]
  }
];

export default function FeedPage({ onOpenChats }) {
  const [feedTab, setFeedTab] = useState('for_you'); // 'for_you' | 'popular'
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

  // Фильтруем список в зависимости от выбранной вкладки сверху
  const visiblePeople = useMemo(() => {
    if (feedTab === 'popular') {
      const popularOnly = people.filter((p) => p.isPopular);
      return popularOnly.length > 0 ? popularOnly : initialPeople.filter((p) => p.isPopular);
    }
    return people;
  }, [people, feedTab]);

  const currentPerson = visiblePeople[0];

  const handleTabSwitch = (nextTab) => {
    if (nextTab === feedTab) return;
    setFeedTab(nextTab);
    setCurrentPhotoIndex(0);
    setShowDetails(false);
    setIsAdCard(false);
  };

  const handleSwipe = (direction, isSuperLike = false) => {
    if (!currentPerson || swipeDirection) return;

    setSwipeDirection(direction);
    setShowDetails(false);

    if ((direction === 'right' || isSuperLike) && !isAdCard) {
      setLikedUsers((prev) => (prev.includes(currentPerson.id) ? prev : [...prev, currentPerson.id]));
      // Мэтч срабатывает на чётных ID или при суперлайке
      if (currentPerson.id % 2 === 0 || isSuperLike) {
        setMatchedUser(currentPerson);
      }
    }

    setTimeout(() => {
      if (!isAdCard) {
        setHistory([{ person: currentPerson, isAd: false }, ...history]);
      }

      const nextCount = swipeCount + 1;
      setSwipeCount(nextCount);

      if (nextCount % 8 === 0) {
        setIsAdCard(true);
      } else {
        setIsAdCard(false);
        setPeople((prev) => {
          const filtered = prev.filter((p) => p.id !== currentPerson.id);
          return filtered.length === 0 ? initialPeople : filtered;
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
      setCurrentPhotoIndex((prev) => (prev < currentPerson.photos.length - 1 ? prev + 1 : prev));
    }
  };

  return (
    <div className="mobile-wrapper">
      {/* Шапка */}
      <header className="app-header-ref">
        <button type="button" className="icon-btn-top" onClick={() => setFilterOpen(true)}>
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
            <select className="filter-select">
              <option>Ашхабад</option>
              <option>Мары</option>
              <option>Туркменабат</option>
              <option>Дашогуз</option>
              <option>Балканабат</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Возраст: 18 - 35 лет</label>
            <input type="range" min="18" max="50" defaultValue="25" className="filter-range" />
          </div>

          <button className="premium-btn" style={{ marginTop: 20, width: '100%' }} onClick={() => setFilterOpen(false)}>
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
              <p>Откройте безлимитные лайки и премиум-доступ по специальной цене в Туркменистане.</p>
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
                <div key={idx} className={`photo-indicator-bar ${idx === currentPhotoIndex ? 'active' : ''}`} />
              ))}
            </div>

            <div className="card-info">
              <div className="name-row">
                <h3>{currentPerson.name}, {currentPerson.age}</h3>
                {currentPerson.verified && <CheckCircle2 size={20} color="#3b82f6" fill="#3b82f6" stroke="#fff" />}
                {likedUsers.includes(currentPerson.id) && (
                  <span className="already-liked-badge">♥ Вы лайкнули</span>
                )}
              </div>
              <p className="job-title">{currentPerson.job}</p>
              <p className="city-text">{currentPerson.city}</p>
              
              <div className="swipe-up-hint" onClick={(e) => { e.stopPropagation(); setShowDetails(!showDetails); }}>
                <ChevronUp size={14} /> Нажмите для подробностей
              </div>
            </div>

            {showDetails && (
              <div className="details-modal" onClick={(e) => e.stopPropagation()}>
                <div className="close-details" onClick={() => setShowDetails(false)}><ChevronDown size={20} /></div>
                <h4>О себе</h4>
                <p>{currentPerson.bio}</p>
                <h4>Интересы</h4>
                <div className="hobbies-list">
                  {currentPerson.hobbies.map((hobby, index) => (
                    <span key={index} className="hobby-tag">{hobby}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Кнопки управления */}
      <div className="action-buttons-ref">
        <button type="button" className="btn-action reload" onClick={() => {
          if (history.length > 0) {
            const last = history[0];
            setPeople([last.person, ...people]);
            setHistory(history.slice(1));
            setIsAdCard(false);
          }
        }}><RotateCcw size={20} color="#eab308" /></button>
        
        <button type="button" className="btn-action dislike" onClick={() => handleSwipe('left')}><X size={28} color="#ef4444" /></button>
        
        <button type="button" className="btn-action star" onClick={() => handleSwipe('right', true)}><Star size={22} color="#3b82f6" fill="#3b82f6" /></button>
        
        <button type="button" className="btn-action like" onClick={() => handleSwipe('right')}><Heart size={28} color="#22c55e" fill="#22c55e" /></button>
        
        <button type="button" className="btn-action boost"><Zap size={22} color="#a855f7" fill="#a855f7" /></button>
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