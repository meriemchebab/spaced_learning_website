
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

function getStoredToken() {
  return localStorage.getItem('recall_token');
}

function getStoredGuestId() {
  return localStorage.getItem('recall_guest_id') || 'guest-demo';
}

function getAuthHeaders() {
  const token = getStoredToken();
  const guestId = getStoredGuestId();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    Guest: guestId,
    'Content-Type': 'application/json'
  };
}

async function parseResponse(response) {
  if (response.status === 204) return null;

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  return response.text();
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

  return parseResponse(response);
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

function normalizeExam(exam) {
  return {
    id: exam.exam_id ?? exam.id,
    name: exam.exam_name || exam.name || `Exam ${exam.exam_id ?? exam.id}`,
    topics: Array.isArray(exam.topics) ? exam.topics.map(Number) : [],
    deadLine: exam.dead_line || exam.deadLine || null,
    desiredRetention: exam.desired_retention ?? exam.desiredRetention ?? 0.9,
    priority: exam.priority ?? 1
  };
}

function normalizeCard(card) {
  const reviewMethodMap = {
    RC: 'RECALL',
    TS: 'TEST',
    RD: 'READ',
    WT: 'WATCH'
  };
  const rawTopicId = card.topic?.id ?? card.topic_id ?? null;

  return {
    id: card.id,
    question: card.question,
    hint: card.context_hint || card.hint || '',
    topicId: rawTopicId !== null && rawTopicId !== undefined ? Number(rawTopicId) : null,
    ctype: card.card_type?.toLowerCase() || card.ctype || 'question',
    method: reviewMethodMap[String(card.review_method || card.method || 'RC').toUpperCase()] || 'RECALL',
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

function toBackendCardType(cardType) {
  const map = {
    exercise: 'EX',
    mistake: 'MI',
    concept: 'CO',
    note: 'NO',
    question: 'QU'
  };

  return map[String(cardType || '').toLowerCase()] || 'QU';
}

function toBackendReviewMethod(method) {
  const map = {
    recall: 'RC',
    test: 'TS',
    read: 'RD',
    watch: 'WT',
    rc: 'RC',
    ts: 'TS',
    rd: 'RD',
    wt: 'WT'
  };

  return map[String(method || '').toLowerCase()] || 'RC';
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
    const params = new URLSearchParams();
    if (topicId !== null && topicId !== undefined && topicId !== '') {
      params.append('topic', topicId);
    }

    try {
      const cards = await request(`/api/cards/today/${params.toString() ? `?${params.toString()}` : ''}`);
      const normalizedCards = (cards || []).map(normalizeCard);
      return normalizedCards.sort(() => Math.random() - 0.5).map((card) => ({
        id: card.id,
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
    } catch (err) {
      if (!String(err?.message || '').includes('404')) {
        throw err;
      }
      return [];
    }
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

    const result = await parseResponse(response);
    return {
      success: true,
      cardId,
      rating,
      message: typeof result === 'string' ? result : result?.detail || 'Review submitted'
    };
  },

  fetchTopics: async () => {
    const topics = await request('/api/topics/');
    return (topics || []).map(normalizeTopic);
  },

  fetchExams: async () => {
    const exams = await request('/api/exams/');
    return (exams || []).map(normalizeExam);
  },

  addTopic: async (name, tag, notes) => {
    const topic = await request('/api/topics/', {
      method: 'POST',
      body: JSON.stringify({
        topic_name: String(name || '').trim(),
        subject: String(tag || '').trim(),
        notes: String(notes || '').trim()
      })
    });
    return normalizeTopic(topic);
  },

  fetchAnalytics: async () => {
    return request('/api/analytics/');
  },

  fetchCards: async (filters = {}) => {
    const params = new URLSearchParams();

    if (filters.topicId !== undefined && filters.topicId !== null && filters.topicId !== '') {
      params.append('topic', filters.topicId);
    }
    if (filters.type) params.append('type', toBackendCardType(filters.type));
    if (filters.difficulty) params.append('difficulty', filters.difficulty);
    if (filters.reviewType) params.append('review_type', filters.reviewType);
    if (filters.date) params.append('date', filters.date);
    if (filters.examId) params.append('exam', filters.examId);
    if (filters.cardId) params.append('id', filters.cardId);

    const queryString = params.toString();
    const cards = await request(`/api/cards/${queryString ? `?${queryString}` : ''}`);
    return (cards || []).map(normalizeCard);
  },

  addCard: async (cardData) => {
    const payload = {
      question: cardData.question,
      answer: cardData.hint || 'Added from frontend',
      ...(cardData.topicId !== undefined && cardData.topicId !== null && cardData.topicId !== '' ? { topic: cardData.topicId } : {}),
      ...(cardData.ctype ? { card_type: toBackendCardType(cardData.ctype) } : {}),
      review_method: toBackendReviewMethod(cardData.method),
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
