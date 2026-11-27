const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
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
  getFeed({ userId = 1, city = "", category = "" } = {}) {
    const params = new URLSearchParams({ userId: String(userId) });
    if (city) params.set("city", city);
    if (category) params.set("category", category);
    return request(`/api/feed?${params.toString()}`);
  },

  sendSwipe({ fromUserId = 1, toUserId, action }) {
    return request("/api/swipes", {
      method: "POST",
      body: JSON.stringify({ fromUserId, toUserId, action }),
    });
  },

  rewardAd({ userId = 1, rewardLikes = 5 }) {
    return request("/api/monetization/reward-ad", {
      method: "POST",
      body: JSON.stringify({ userId, rewardLikes }),
    });
  },

  getChats(userId = 1) {
    return request(`/api/chats/${userId}`);
  },

  getMessages(matchId) {
    return request(`/api/chats/${matchId}/messages`);
  },

  sendMessage({ matchId, senderId = 1, body }) {
    return request(`/api/chats/${matchId}/messages`, {
      method: "POST",
      body: JSON.stringify({ senderId, body }),
    });
  },
};