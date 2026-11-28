const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
const TOKEN_KEY = "salam_auth_token";

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function request(path, options = {}) {
  const token = getAuthToken();
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || data.error || "API request failed");
    err.status = res.status;
    err.code = data.error;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  async uploadPhoto(file) {
    const token = getAuthToken();
    const formData = new FormData();
    formData.append("photo", file);

    const res = await fetch(`${API_URL}/api/profile/upload-photo`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || data.error || "Ошибка загрузки фото");
    }
    return data;
  },

  updateProfile(payload) {
    return request("/api/profile", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
  register({ phone, password, name, age, city }) {
    return request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ phone, password, name, age, city }),
    });
  },

  login({ phone, password }) {
    return request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ phone, password }),
    });
  },

  getMe() {
    return request("/api/auth/me");
  },

  getFeed({ city = "", category = "" } = {}) {
    const params = new URLSearchParams();
    if (city) params.set("city", city);
    if (category) params.set("category", category);
    const qs = params.toString();
    return request(`/api/feed${qs ? `?${qs}` : ""}`);
  },

  sendSwipe({ toUserId, action }) {
    return request("/api/swipes", {
      method: "POST",
      body: JSON.stringify({ toUserId, action }),
    });
  },

  rewardAd({ rewardLikes = 5 } = {}) {
    return request("/api/monetization/reward-ad", {
      method: "POST",
      body: JSON.stringify({ rewardLikes }),
    });
  },

  getChats() {
    return request("/api/chats");
  },

  getMessages(matchId) {
    return request(`/api/chats/${matchId}/messages`);
  },

  sendMessage({ matchId, body }) {
    return request(`/api/chats/${matchId}/messages`, {
      method: "POST",
      body: JSON.stringify({ body }),
    });
  },
};