import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import './TopicsLibrary.css';

const TAG_CLASSES = {
  math: 'tag-math',
  programming: 'tag-programming',
  science: 'tag-science',
  language: 'tag-language',
  other: 'tag-other'
};

export const TopicsLibrary = ({ onSelectTopic }) => {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadTopics = async () => {
    try {
      setLoading(true);
      const data = await api.fetchDashboardStats();
      setTopics(data.topics || []);
    } catch (err) {
      console.error("Failed to load topics library:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTopics();
  }, []);

  const retColor = r => r > 65 ? 'var(--green)' : r > 35 ? 'var(--amber)' : 'var(--red)';

  if (loading) {
    return <div className="loading-state">Loading topics library...</div>;
  }

  return (
    <div className="page-topics">
      <div className="topics-grid">
        {topics.length === 0 ? (
          <div className="empty" style={{ gridColumn: '1 / -1', padding: '60px 0' }}>
            <div className="e-icon">—</div>
            <div className="e-title">No topics yet</div>
            <div className="e-sub">Click "+ Topic" in the top bar to create your first subject.</div>
          </div>
        ) : (
          topics.map(t => {
            const tagClass = TAG_CLASSES[t.tag] || 'tag-other';
            return (
              <div 
                key={t.id} 
                className={`topic-card ${tagClass}`}
                onClick={() => {
                  if (onSelectTopic) onSelectTopic(t.id);
                }}
              >
                <div className="topic-card-head">
                  <div className="t-name">{t.name}</div>
                  {t.dueCount > 0 && (
                    <span className="badge b-red due-badge">{t.dueCount} due</span>
                  )}
                </div>
                
                <div className="t-sub">
                  {t.tag} · {t.cardCount} card{t.cardCount !== 1 ? 's' : ''}
                </div>
                
                <div className="retention-info">
                  <span className="retention-label">Retention</span>
                  <span className="retention-value" style={{ color: retColor(t.avgRetention) }}>
                    {t.avgRetention}%
                  </span>
                </div>
                
                <div className="ret-bar">
                  <div 
                    className="ret-fill" 
                    style={{ 
                      width: `${t.avgRetention}%`, 
                      background: retColor(t.avgRetention) 
                    }} 
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default TopicsLibrary;
