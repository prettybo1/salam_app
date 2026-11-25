import React, { useEffect, useState } from 'react';
import './SplashScreen.css';

export default function SplashScreen({ onFinish }) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Увеличим время показа до 2.2 секунд, чтобы рассмотреть логотип
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(onFinish, 400); // Время на плавное исчезновение
    }, 2200);

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className={`splash-screen ${fadeOut ? 'fade-out' : ''}`}>
      <div className="splash-content">
        {/* Белый квадрат с закругленными углами */}
        <div className="splash-logo-tile">
          {/* Большая, яркая и мягкая буква S */}
          <span className="splash-s-letter">S</span>
        </div>
        
        {/* Название приложения */}
        <h1>Salam!</h1>
      </div>
    </div>
  );
}