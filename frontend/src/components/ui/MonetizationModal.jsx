import React, { useState, useEffect } from 'react';
import { Crown, Tv, X, Sparkles } from 'lucide-react';
import './MonetizationModal.css';

export default function MonetizationModal({
  isOpen,
  onClose,
  likesLeft = 0,
  rewardAmount = 5,
  onRewardEarned,
  onSubscribe,
}) {
  const [watchingAd, setWatchingAd] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(3);

  // Защита от закрытия во время просмотра рекламы
  const handleClose = () => {
    if (watchingAd) return;
    onClose?.();
  };

  // Таймер рекламы
  useEffect(() => {
    if (!watchingAd) return;

    if (secondsLeft <= 0) {
      setWatchingAd(false);
      setSecondsLeft(3);
      onRewardEarned?.(rewardAmount);
      onClose?.();
      return;
    }

    const timer = setTimeout(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [watchingAd, secondsLeft, rewardAmount, onRewardEarned, onClose]);

  // Сброс при открытии/закрытии модалки
  useEffect(() => {
    if (!isOpen) {
      setWatchingAd(false);
      setSecondsLeft(3);
    }
  }, [isOpen]);

  // Закрытие по Escape (только если не идёт реклама)
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e) => {
      if (e.key === 'Escape' && !watchingAd) {
        onClose?.();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, watchingAd, onClose]);

  if (!isOpen) return null;

  return (
    <div className="monetization-backdrop" onClick={handleClose}>
      <div className="monetization-sheet" onClick={(e) => e.stopPropagation()}>
        {!watchingAd && (
          <button
            type="button"
            className="monetization-close"
            onClick={handleClose}
            aria-label="Закрыть"
          >
            <X size={18} color="#fff" />
          </button>
        )}

        <div className="monetization-badge">
          <Sparkles size={14} />
          <span>Осталось лайков: {likesLeft}</span>
        </div>

        <h3>Нужно больше лайков?</h3>
        <p className="monetization-subtitle">
          Посмотрите короткий ролик за бесплатный бонус или оформите доступную подписку без ограничений.
        </p>

        {watchingAd ? (
          <div className="ad-progress-box">
            <h4>Идёт рекламный ролик...</h4>
            <p>Начислим +{rewardAmount} лайков через {secondsLeft} сек.</p>
          </div>
        ) : (
          <>
            <div className="reward-ad-card">
              <div className="reward-ad-text">
                <h4>Реклама за лайки</h4>
                <p>Короткий промо-ролик без лишних шагов</p>
              </div>
              <button
                type="button"
                className="reward-ad-btn"
                onClick={() => {
                  setSecondsLeft(3);
                  setWatchingAd(true);
                }}
              >
                <Tv size={16} color="#c084fc" />
                <span>+{rewardAmount} лайков</span>
              </button>
            </div>

            <div className="sub-offer-card">
              <div className="sub-offer-header">
                <div className="sub-offer-title">
                  <Crown size={20} color="#fff" />
                  <span>Salam Plus</span>
                </div>
                <span className="sub-price-tag">Доступно</span>
              </div>

              <ul className="sub-perks">
                <li>Безлимитные лайки каждый день</li>
                <li>Возврат случайных свайпов</li>
                <li>Приоритетный показ анкеты</li>
              </ul>

              <button
                type="button"
                className="sub-cta-btn"
                onClick={() => {
                  onSubscribe?.();
                  onClose?.();
                }}
              >
                Оформить подписку
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}