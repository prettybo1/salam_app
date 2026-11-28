import React, { useState } from 'react';
import { Phone, Lock, User, Calendar, MapPin, Flame, Check, X } from 'lucide-react';
import { api, setAuthToken } from '../api/client';

const CITIES = ['Ашхабад', 'Мары', 'Туркменабад', 'Дашогуз', 'Балканабат'];

export default function AuthPage({ onAuthSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [phone, setPhone] = useState('+993 ');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [age, setAge] = useState('22');
  const [city, setCity] = useState('Ашхабад');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Проверки пароля
  const hasNoCyrillic = !/[а-яА-ЯёЁ]/.test(password);
  const hasMinLength = password.length >= 6;
  const hasUppercase = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  const isPasswordValid = hasNoCyrillic && hasMinLength && hasUppercase && hasDigit;

  const handlePasswordChange = (e) => {
    const val = e.target.value;
    if (/[а-яА-ЯёЁ]/.test(val)) {
      setErrorMsg('Пароль вводится только латинскими буквами (переключите раскладку)');
      return;
    }
    setErrorMsg('');
    setPassword(val);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (mode === 'register' && !isPasswordValid) {
      setErrorMsg('Пароль должен содержать минимум 6 символов, заглавную букву и цифру');
      return;
    }

    setLoading(true);

    try {
      let data;
      if (mode === 'register') {
        data = await api.register({
          phone,
          password,
          name,
          age: Number(age),
          city,
        });
      } else {
        data = await api.login({ phone, password });
      }

      if (data?.token) {
        setAuthToken(data.token);
      }
      onAuthSuccess?.(data.user);
    } catch (err) {
      setErrorMsg(err.message || 'Ошибка авторизации');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="mobile-wrapper"
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: 24,
        gap: 18,
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: 4 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 18,
            margin: '0 auto 12px',
            background: 'rgba(255, 68, 88, 0.14)',
            border: '1px solid rgba(255, 68, 88, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Flame size={28} color="#ff4458" />
        </div>
        <h2 style={{ margin: 0, fontSize: 24 }}>Salam</h2>
        <p style={{ margin: '6px 0 0', fontSize: 13, opacity: 0.7 }}>
          {mode === 'login'
            ? 'Войдите по номеру телефона, чтобы продолжить'
            : 'Создайте аккаунт и заполните базовую анкету'}
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 8,
          background: 'rgba(255,255,255,0.06)',
          padding: 4,
          borderRadius: 12,
        }}
      >
        <button
          type="button"
          onClick={() => {
            setMode('login');
            setErrorMsg('');
          }}
          style={{
            padding: '10px 12px',
            borderRadius: 9,
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            color: '#fff',
            background: mode === 'login' ? '#ff4458' : 'transparent',
          }}
        >
          Вход
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('register');
            setErrorMsg('');
          }}
          style={{
            padding: '10px 12px',
            borderRadius: 9,
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            color: '#fff',
            background: mode === 'register' ? '#ff4458' : 'transparent',
          }}
        >
          Регистрация
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
          <span>Номер телефона</span>
          <div style={{ position: 'relative' }}>
            <Phone
              size={16}
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.6 }}
            />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+993 65 123456"
              required
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '12px 12px 12px 38px',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.14)',
                background: 'rgba(255,255,255,0.06)',
                color: '#fff',
                fontSize: 14,
              }}
            />
          </div>
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
          <span>Пароль (только латиница)</span>
          <div style={{ position: 'relative' }}>
            <Lock
              size={16}
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.6 }}
            />
            <input
              type="password"
              value={password}
              onChange={handlePasswordChange}
              placeholder="Например: Salam2026"
              required
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '12px 12px 12px 38px',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.14)',
                background: 'rgba(255,255,255,0.06)',
                color: '#fff',
                fontSize: 14,
              }}
            />
          </div>
        </label>

        {mode === 'register' && (
          <>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                padding: '8px 12px',
                borderRadius: 10,
                background: 'rgba(255,255,255,0.04)',
                fontSize: 12,
              }}
            >
              <RuleItem ok={hasMinLength} text="Минимум 6 символов" />
              <RuleItem ok={hasUppercase} text="Хотя бы одна заглавная буква (A-Z)" />
              <RuleItem ok={hasDigit} text="Хотя бы одна цифра (0-9)" />
            </div>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
              <span>Имя</span>
              <div style={{ position: 'relative' }}>
                <User
                  size={16}
                  style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.6 }}
                />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Как к вам обращаться"
                  required
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '12px 12px 12px 38px',
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.14)',
                    background: 'rgba(255,255,255,0.06)',
                    color: '#fff',
                    fontSize: 14,
                  }}
                />
              </div>
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 10 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                <span>Возраст</span>
                <div style={{ position: 'relative' }}>
                  <Calendar
                    size={16}
                    style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.6 }}
                  />
                  <input
                    type="number"
                    min="18"
                    max="99"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '12px 10px 12px 34px',
                      borderRadius: 12,
                      border: '1px solid rgba(255,255,255,0.14)',
                      background: 'rgba(255,255,255,0.06)',
                      color: '#fff',
                      fontSize: 14,
                    }}
                  />
                </div>
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                <span>Город</span>
                <div style={{ position: 'relative' }}>
                  <MapPin
                    size={16}
                    style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.6 }}
                  />
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '12px 10px 12px 34px',
                      borderRadius: 12,
                      border: '1px solid rgba(255,255,255,0.14)',
                      background: '#18181b',
                      color: '#fff',
                      fontSize: 14,
                    }}
                  >
                    {CITIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </label>
            </div>
          </>
        )}

        {errorMsg && (
          <div
            style={{
              padding: '10px 12px',
              borderRadius: 10,
              background: 'rgba(239, 68, 68, 0.16)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#fca5a5',
              fontSize: 13,
            }}
          >
            {errorMsg}
          </div>
        )}

        <button
          type="submit"
          className="premium-btn"
          disabled={loading}
          style={{ marginTop: 4, width: '100%', padding: 13, fontWeight: 600 }}
        >
          {loading
            ? 'Подождите...'
            : mode === 'login'
              ? 'Войти'
              : 'Создать аккаунт'}
        </button>
      </form>
    </div>
  );
}

function RuleItem({ ok, text }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: ok ? '#4ade80' : 'rgba(255,255,255,0.55)' }}>
      {ok ? <Check size={13} /> : <X size={13} />}
      <span>{text}</span>
    </div>
  );
}