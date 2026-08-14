import React from 'react';
import './Sidebar.css';

const TAG_COLORS = {
  math: '#7F77DD',
  programming: '#378ADD',
  science: '#1D9E75',
  language: '#BA7517',
  other: '#888780'
};

export const Sidebar = ({
  activePage,
  onNavigate,
  streak = 3,
  topics = [],
  onSelectTopic
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', section: 'Study', icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="1" width="6" height="6" rx="1.5"/><rect x="9" y="1" width="6" height="6" rx="1.5"/><rect x="1" y="9" width="6" height="6" rx="1.5"/><rect x="9" y="9" width="6" height="6" rx="1.5"/></svg>
    )},
    { id: 'session', label: 'Study session', section: 'Study', icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6"/><path d="M8 5v3l2 2"/></svg>
    )},
    { id: 'calendar', label: 'Calendar', section: 'Study', icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="3" width="14" height="12" rx="2"/><path d="M1 7h14M5 1v4M11 1v4"/></svg>
    )},
    { id: 'topics', label: 'Topics', section: 'Library', icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 4h12M2 8h8M2 12h10"/></svg>
    )},
    { id: 'cards', label: 'Cards', section: 'Library', icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="3" width="14" height="10" rx="2"/><path d="M1 7h14"/></svg>
    )},
    { id: 'analytics', label: 'Analytics', section: 'Insights', icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 12l4-4 3 3 4-5 3 2"/></svg>
    )},
    { id: 'forgetting', label: 'Forgetting curve', section: 'Insights', icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 14C2 8 14 8 14 2M8 14v-4M4 14v-2M12 14v-6"/></svg>
    )},
  ];

  const sections = ['Study', 'Library', 'Insights'];

  return (
    <aside className="sidebar">
      <div className="logo">
        <div className="logo-name">Recall</div>
        <div className="logo-sub">learning studio</div>
      </div>
      <nav className="nav">
        {sections.map(section => (
          <React.Fragment key={section}>
            <div className="nav-section">{section}</div>
            {navItems
              .filter(item => item.section === section)
              .map(item => (
                <button
                  key={item.id}
                  className={`nav-item ${activePage === item.id ? 'active' : ''}`}
                  onClick={() => onNavigate(item.id)}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))
            }
            {/* Embed topics navigation list under Library section */}
            {section === 'Library' && topics.slice(0, 6).map(t => (
              <button
                key={t.id}
                className="nav-item topic-nav-item"
                onClick={() => {
                  if (onSelectTopic) onSelectTopic(t.id);
                }}
              >
                <div 
                  className="topic-dot" 
                  style={{ background: TAG_COLORS[t.tag] || '#888' }}
                />
                <span className="topic-name-txt">{t.name}</span>
              </button>
            ))}
          </React.Fragment>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="streak">🔥 <span>{streak} day streak</span></div>
      </div>
    </aside>
  );
};

export default Sidebar;
