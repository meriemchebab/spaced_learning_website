import React, { useState } from 'react';
import Button from '../ui/Button';
import TopicChip from '../ui/TopicChip';
import './CalendarGrid.css';

const TAG_COLORS = {
  math: '#7F77DD',
  programming: '#378ADD',
  science: '#1D9E75',
  language: '#BA7517',
  other: '#888780'
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const CalendarGrid = ({
  cards = [],
  topics = [],
  exams = [],
  history = []
}) => {
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDayTs, setSelectedDayTs] = useState(null);
  const [selectedDayLabel, setSelectedDayLabel] = useState('');
  const [selectedExamId, setSelectedExamId] = useState('');

  const now = new Date();
  const targetDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const monthName = MONTHS[targetDate.getMonth()];
  const year = targetDate.getFullYear();

  // Calendar calculations
  // Get day of the week for the 1st of the month (Monday = 0, Sunday = 6)
  const firstDayIndex = (targetDate.getDay() + 6) % 7;
  const daysInMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).getDate();
  
  const today = new Date();
  const selectedExam = exams.find((exam) => String(exam.id) === String(selectedExamId));
  const examTopicIds = selectedExam ? new Set((selectedExam.topics || []).map(Number)) : null;
  const visibleCards = selectedExam
    ? cards.filter((card) => examTopicIds.has(Number(card.topicId)))
    : cards;

  // Create cell data
  const cells = [];
  
  // Previous month blanks
  for (let i = 0; i < firstDayIndex; i++) {
    cells.push({ isBlank: true, key: `blank-${i}` });
  }

  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const cellDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), day);
    const cellTs = cellDate.getTime();
    const isCellToday = cellDate.toDateString() === today.toDateString();
    
    const dayStart = cellTs;
    const dayEnd = dayStart + 86400000;

    // Cards scheduled specifically for this day
    const dueCards = visibleCards.filter(c => c.nextReview && c.nextReview >= dayStart && c.nextReview < dayEnd);

    // Overdue cards (if cell is today or in the past, cards whose nextReview is prior to dayStart)
    const isPastOrToday = cellDate <= today || isCellToday;
    const overdueCards = isPastOrToday
      ? visibleCards.filter(c => {
          if (!c.nextReview) return false;
          // nextReview is older than this day's start, and wasn't reviewed since
          return c.nextReview < dayStart && !history.some(h => h.cardId === c.id && h.ts >= dayStart);
        })
      : [];

    cells.push({
      isBlank: false,
      day,
      timestamp: cellTs,
      dateString: `${year}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      isToday: isCellToday,
      dueCards,
      overdueCards,
      key: `day-${day}`
    });
  }

  // Handle month navigation
  const navMonth = (dir) => {
    setMonthOffset(prev => prev + dir);
  };

  // Get selected day reviews
  const getSelectedDayReviews = () => {
    if (!selectedDayTs) return [];
    const dayEnd = selectedDayTs + 86400000;
    return visibleCards.filter(c => c.nextReview && c.nextReview >= selectedDayTs && c.nextReview < dayEnd);
  };

  const selectedReviews = getSelectedDayReviews();

  const getRetEst = (card) => {
    if (!card.lastReview) return 100;
    const days = (Date.now() - card.lastReview) / 86400000;
    const stab = card.interval * 1.4;
    return Math.round(Math.max(0, Math.min(100, Math.exp(-days / stab) * 100)));
  };

  const retColor = r => r > 65 ? 'var(--green)' : r > 35 ? 'var(--amber)' : 'var(--red)';

  return (
    <div className="cal-layout">
      {/* Calendar card */}
      <div className="card cal-main-card">
        <div className="cal-header-row">
          <div className="cal-month-label">{monthName} {year}</div>
          <div className="cal-nav-buttons">
            <Button variant="ghost" size="sm" onClick={() => navMonth(-1)}>←</Button>
            <Button variant="ghost" size="sm" onClick={() => navMonth(1)}>→</Button>
          </div>
        </div>

        <div className="cal-filter-row" style={{ marginBottom: '12px' }}>
          <select
            className="topic-select-filter"
            value={selectedExamId}
            onChange={(e) => {
              setSelectedExamId(e.target.value);
              setSelectedDayTs(null);
              setSelectedDayLabel('');
            }}
          >
            <option value="">All exams</option>
            {exams.map((exam) => (
              <option key={exam.id} value={exam.id}>
                {exam.name}
              </option>
            ))}
          </select>
        </div>

        {/* Days Header */}
        <div className="cal-header">
          <div className="cal-day-name">Mon</div>
          <div className="cal-day-name">Tue</div>
          <div className="cal-day-name">Wed</div>
          <div className="cal-day-name">Thu</div>
          <div className="cal-day-name">Fri</div>
          <div className="cal-day-name">Sat</div>
          <div className="cal-day-name">Sun</div>
        </div>

        {/* Calendar Grid */}
        <div className="cal-grid">
          {cells.map(cell => {
            if (cell.isBlank) {
              return <div key={cell.key} />;
            }

            const cellClasses = [
              'cal-cell',
              cell.isToday ? 'today' : '',
              cell.dueCards.length > 0 ? 'has-review' : '',
              cell.overdueCards.length > 0 && cell.dueCards.length === 0 ? 'overdue' : '',
              selectedDayTs === cell.timestamp ? 'selected' : ''
            ].filter(Boolean).join(' ');

            return (
              <div 
                key={cell.key} 
                className={cellClasses}
                onClick={() => {
                  setSelectedDayTs(cell.timestamp);
                  setSelectedDayLabel(cell.dateString);
                }}
              >
                <div className="cal-num">{cell.day}</div>
                {cell.dueCards.length > 0 && (
                  <div className="cal-dot-row">
                    {cell.dueCards.slice(0, 3).map(c => {
                      const topic = topics.find(t => t.id === c.topicId);
                      return (
                        <div 
                          key={c.id} 
                          className="cal-dot" 
                          style={{ background: TAG_COLORS[topic?.tag] || '#888' }} 
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="cal-legend">
          <div className="legend-item">
            <div className="legend-box legend-has-review" />
            <span>Has reviews</span>
          </div>
          <div className="legend-item">
            <div className="legend-box legend-overdue" />
            <span>Overdue</span>
          </div>
          <div className="legend-item">
            <div className="legend-box legend-today" />
            <span>Today</span>
          </div>
        </div>
      </div>

      {/* Side Detail Panel */}
      <div className="cal-side">
        {!selectedDayTs ? (
          <div className="cal-side-empty">
            Click a day to see scheduled reviews
          </div>
        ) : (
          <div className="cal-side-content">
            <div className="cal-side-title">{selectedDayLabel}</div>
            <div className="cal-side-subtitle">
              {selectedReviews.length} card{selectedReviews.length !== 1 ? 's' : ''} due or scheduled
            </div>
            
            <div className="cal-side-list">
              {selectedReviews.length === 0 ? (
                <div className="cal-side-empty-list">No cards due or scheduled for this day</div>
              ) : (
                selectedReviews.map(c => {
                  const topic = topics.find(t => t.id === c.topicId);
                  const ret = getRetEst(c);
                  return (
                    <div key={c.id} className="cal-side-item">
                      <div className="cal-side-item-q">{c.question}</div>
                      <div className="cal-side-item-meta">
                        <TopicChip type={c.ctype} />
                        <span style={{ color: retColor(ret), fontFamily: 'DM Mono', fontWeight: 500 }}>
                          {ret}%
                        </span>
                        {topic && <span className="cal-side-item-topic">{topic.name}</span>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CalendarGrid;
