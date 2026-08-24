import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import TopicChip from '../components/ui/TopicChip';
import Badge from '../components/ui/Badge';
import './CardsLibrary.css';

export const CardsLibrary = ({
  initialTopicId = '',
  onReviewCard,
  dataVersion
}) => {
  const [cards, setCards] = useState([]);
  const [topics, setTopics] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [filterTopicId, setFilterTopicId] = useState(initialTopicId);
  const [loading, setLoading] = useState(true);

  // Sync with prop changes (e.g. navigation from topics grid)
  useEffect(() => {
    setFilterTopicId(initialTopicId);
  }, [initialTopicId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const filters = {};
      if (filterType !== 'all') filters.type = filterType;
      if (filterTopicId) filters.topicId = Number(filterTopicId);
      const [allCards, allTopics] = await Promise.all([
        api.fetchCards(filters),
        api.fetchTopics()
      ]);
      setCards(allCards);
      setTopics(allTopics);
    } catch (err) {
      console.error("Failed to load cards library:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterType, filterTopicId, dataVersion]);

  const safeCards = Array.isArray(cards) ? cards : [];
  const safeTopics = Array.isArray(topics) ? topics : [];

  const getRetEst = (card) => {
    if (!card || !card.lastReview) return 100;
    const days = (Date.now() - card.lastReview) / 86400000;
    const stab = (card.interval || 1) * 1.4;
    return Math.round(Math.max(0, Math.min(100, Math.exp(-days / stab) * 100)));
  };

  const retColor = r => r > 65 ? 'var(--green)' : r > 35 ? 'var(--amber)' : 'var(--red)';
  const ctypeBarColors = {
    exercise: 'var(--amber)',
    concept: 'var(--purple)',
    mistake: 'var(--red)',
    question: 'var(--blue)',
    note: 'var(--green)'
  };

  const isDue = (card) => {
    if (!card) return false;
    return !card.nextReview || Date.now() >= card.nextReview;
  };

  if (loading) {
    return <div className="loading-state">Loading cards library...</div>;
  }

  const tabs = ['all', 'exercise', 'concept', 'mistake', 'question', 'note'];

  return (
    <div className="page-cards">
      {/* Filtering Header */}
      <div className="cards-filter-header">
        <div className="tabs">
          {tabs.map(tab => (
            <button
              key={tab}
              className={`tab ${filterType === tab ? 'active' : ''}`}
              onClick={() => setFilterType(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
        
        <select 
          value={filterTopicId} 
          onChange={(e) => setFilterTopicId(e.target.value)}
          className="topic-select-filter"
        >
          <option value="">All topics</option>
          {safeTopics.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      {/* Cards Grid */}
      <div className="cards-grid">
        {safeCards.length === 0 ? (
          <div className="empty" style={{ gridColumn: '1 / -1', padding: '60px 0' }}>
            <div className="e-icon">🃏</div>
            <div className="e-title">No cards found</div>
            <div className="e-sub">Capture notes or concepts using the "+ Card" button.</div>
          </div>
        ) : (
          safeCards.map(c => {
            if (!c) return null;
            const topic = safeTopics.find(t => t.id === c.topicId);
            const ret = getRetEst(c);
            const due = isDue(c);
            const topicLabel = topic ? topic.name : (c.topicName || '');
            
            return (
              <div 
                key={c.id || Math.random()} 
                className="study-card"
                onClick={() => {
                  if (onReviewCard && c) {
                    onReviewCard({
                      ...c,
                      topicName: topicLabel,
                      retention: ret
                    });
                  }
                }}
              >
                <div 
                  className="sc-type-bar" 
                  style={{ background: ctypeBarColors[c.ctype] || 'var(--text3)' }} 
                />
                
                <div className="card-item-meta-row">
                  <TopicChip type={c.ctype} />
                  {due && <Badge variant="red">due</Badge>}
                  {c.hasFile && <span className="attachment-icon">📎</span>}
                </div>
                
                <div className="sc-q">{c.question || 'Untitled Card'}</div>
                {topicLabel && <Badge variant="purple">{topicLabel}</Badge>}
                
                <div className="sc-meta-row">
                  <Badge variant="blue">{c.method || 'RECALL'}</Badge>
                  <span className="sc-ret" style={{ color: retColor(ret) }}>
                    {ret}% retention
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default CardsLibrary;
