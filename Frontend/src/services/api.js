
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

function getAuthHeaders() {
  const token = localStorage.getItem('recall_token');
  const guestId = localStorage.getItem('recall_guest_id') || 'guest-demo';
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    Guest_ID: guestId,
    'Content-Type': 'application/json'
  };
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: getAuthHeaders(),
    ...options
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Request failed with status ${response.status}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

function normalizeTopic(topic) {
  return {
    id: topic.id,
    name: topic.topic_name || topic.name,
    tag: topic.subject ? topic.subject.toLowerCase() : 'other',
    notes: topic.notes || topic.note || '',
    createdAt: topic.created_at || Date.now()
  };
}

function normalizeCard(card) {
  return {
    id: card.id,
    question: card.question,
    hint: card.context_hint || card.hint || '',
    topicId: card.topic?.id ?? card.topic_id ?? null,
    ctype: card.card_type?.toLowerCase() || card.ctype || 'question',
    method: card.review_method || card.method || 'RECALL',
    hasFile: Boolean(card.attached_file || card.fileName),
    fileName: card.attached_file || card.fileName || null,
    retention: card.retention ?? 100,
    nextReview: card.due ? new Date(card.due).getTime() : null,
    lastReview: card.last_review ? new Date(card.last_review).getTime() : null,
    interval: card.interval ?? 1,
    ef: card.ef ?? 2.5,
    reps: card.reps ?? 0
  };
}

export const api = {
  login: async (username, password) => {
    const response = await fetch(`${API_BASE_URL}/api/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Invalid credentials');
    }

    const data = await response.json();
    localStorage.setItem('recall_token', data.access || data.token);
    return { token: data.access || data.token, username };
  },

  logout: async () => {
    localStorage.removeItem('recall_token');
    return { success: true };
  },

  isAuthenticated: () => !!localStorage.getItem('recall_token'),

  fetchDashboardStats: async () => {
    const cards = await request('/api/cards/');
    const topics = await request('/api/topics/');
    const normalizedCards = (cards || []).map(normalizeCard);
    const normalizedTopics = (topics || []).map(normalizeTopic);

    const now = Date.now();
    const dueCards = normalizedCards.filter((card) => !card.nextReview || now >= card.nextReview);
    const upcomingCards = normalizedCards
      .filter((card) => card.nextReview && now < card.nextReview)
      .sort((a, b) => a.nextReview - b.nextReview)
      .slice(0, 6)
      .map((card) => ({
        id: card.id,
        question: card.question,
        ctype: card.ctype,
        daysUntil: Math.ceil((card.nextReview - now) / 86400000)
      }));

    const avgRetention = normalizedCards.length
      ? Math.round(normalizedCards.reduce((sum, card) => sum + (card.retention ?? 100), 0) / normalizedCards.length)
      : 100;

    return {
      dueCount: dueCards.length,
      doneToday: 0,
      totalCards: normalizedCards.length,
      avgRetention: `${avgRetention}%`,
      streak: 0,
      dueCards: dueCards.slice(0, 8).map((card) => {
        const topic = normalizedTopics.find((item) => item.id === card.topicId);
        return {
          id: card.id,
          question: card.question,
          topicId: card.topicId,
          topicName: topic ? topic.name : 'No topic',
          topicTag: topic ? topic.tag : 'other',
          ctype: card.ctype,
          method: card.method,
          retention: card.retention ?? 100
        };
      }),
      upcomingCards,
      history: [],
      topics: normalizedTopics.map((topic) => {
        const topicCards = normalizedCards.filter((card) => card.topicId === topic.id);
        return {
          ...topic,
          cardCount: topicCards.length,
          dueCount: topicCards.filter((card) => !card.nextReview || now >= card.nextReview).length,
          avgRetention: topicCards.length
            ? Math.round(topicCards.reduce((sum, card) => sum + (card.retention ?? 100), 0) / topicCards.length)
            : 100
        };
      })
    };
  },

  fetchDailyStudyPlan: async (topicId = null) => {
    const cards = await request('/api/cards/');
    const normalizedCards = (cards || []).map(normalizeCard);
    const dueCards = normalizedCards.filter((card) => !card.nextReview || Date.now() >= card.nextReview);
    const filtered = topicId ? dueCards.filter((card) => card.topicId === topicId) : dueCards;
    return filtered.sort(() => Math.random() - 0.5).map((card) => ({
      id: card.id,
      question: card.question,
      question: card.question,
      hint: card.hint,
      topicId: card.topicId,
      topicName: 'Card',
      ctype: card.ctype,
      method: card.method,
      hasFile: card.hasFile,
      fileName: card.fileName,
      retention: card.retention ?? 100
    }));
  },

  submitCardReview: async (cardId, rating) => {
    const response = await fetch(`${API_BASE_URL}/api/cards/${cardId}/ratings/${rating}/0/`, {
      method: 'POST',
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Could not submit review');
    }

    return { success: true, cardId, rating };
  },

  fetchTopics: async () => {
    const topics = await request('/api/topics/');
    return (topics || []).map(normalizeTopic);
  },

  addTopic: async (name, tag, notes) => {
    const topic = await request('/api/topics/', {
      method: 'POST',
      body: JSON.stringify({ topic_name: name, subject: tag, notes })
    });
    return normalizeTopic(topic);
  },

  fetchCards: async () => {
    const cards = await request('/api/cards/');
    return (cards || []).map(normalizeCard);
  },

  addCard: async (cardData) => {
    const payload = {
      question: cardData.question,
      answer: cardData.hint || 'Added from frontend',
      topic: cardData.topicId,
      card_type: cardData.ctype.toUpperCase().slice(0, 2),
      review_method: cardData.method,
      context_hint: cardData.hint,
      attached_file: null
    };

    const card = await request('/api/cards/', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    return normalizeCard(card);
  }
};
