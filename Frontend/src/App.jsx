import React, { useState, useEffect } from 'react';
import { api } from './services/api';
import AppLayout from './components/layouts/AppLayout';
import Dashboard from './views/Dashboard';
import StudySession from './views/StudySession';
import CalendarGrid from './components/complex/CalendarGrid';
import TopicsLibrary from './views/TopicsLibrary';
import CardsLibrary from './views/CardsLibrary';
import AnalyticsView from './views/AnalyticsView';
import ForgettingCurveChart from './components/complex/ForgettingCurveChart';
import Button from './components/ui/Button';
import './styles/global.css';
import './App.css';

function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [selectedTopicId, setSelectedTopicId] = useState('');
  
  // App-wide data
  const [topics, setTopics] = useState([]);
  const [cards, setCards] = useState([]);
  const [history, setHistory] = useState([]);
  const [streak, setStreak] = useState(3);
  const [doneToday, setDoneToday] = useState(0);

  // Modals visibility state
  const [isAddTopicOpen, setIsAddTopicOpen] = useState(false);
  const [isAddCardOpen, setIsAddCardOpen] = useState(false);
  const [activeQuickReview, setActiveQuickReview] = useState(null);

  // Toast state
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  let toastTimer = null;

  const addToast = (message) => {
    setToastMessage(message);
    setShowToast(true);
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      setShowToast(false);
    }, 2400);
  };

  // Add Topic form state
  const [topicName, setTopicName] = useState('');
  const [topicTag, setTopicTag] = useState('math');
  const [topicNotes, setTopicNotes] = useState('');

  // Add Card form state
  const [cardTopicId, setCardTopicId] = useState('');
  const [cardCtype, setCardCtype] = useState('exercise'); // exercise, concept, mistake, question, note
  const [cardQuestion, setCardQuestion] = useState('');
  const [cardHint, setCardHint] = useState('');
  const [cardMethod, setCardMethod] = useState('RECALL'); // RECALL, TEST, READ, WATCH
  const [cardAttachedFile, setCardAttachedFile] = useState(null);

  const loadData = async () => {
    try {
      const allTopics = await api.fetchTopics();
      const allCards = await api.fetchCards();
      const stats = await api.fetchDashboardStats();
      
      setTopics(allTopics);
      setCards(allCards);
      setHistory(stats.history || []);
      setStreak(stats.streak || 3);
      setDoneToday(stats.doneToday || 0);
    } catch (err) {
      console.error("Failed to load application data:", err);
    }
  };

  useEffect(() => {
    loadData();
    return () => {
      if (toastTimer) clearTimeout(toastTimer);
    };
  }, []);

  const handleAddTopic = async (e) => {
    e.preventDefault();
    if (!topicName.trim()) {
      addToast('Enter a topic name');
      return;
    }
    try {
      const newTopic = await api.addTopic(topicName.trim(), topicTag, topicNotes.trim());
      addToast(`"${newTopic.name}" added`);
      setIsAddTopicOpen(false);
      
      // Reset form
      setTopicName('');
      setTopicTag('math');
      setTopicNotes('');
      
      loadData();
    } catch (err) {
      console.error("Failed to add topic:", err);
      addToast(err.message || 'Could not add topic');
    }
  };

  const handleAddCard = async (e) => {
    e.preventDefault();
    if (!cardQuestion.trim()) {
      addToast('Enter a question or description');
      return;
    }
    if (!cardTopicId) {
      addToast('Pick a topic first');
      return;
    }
    try {
      await api.addCard({
        question: cardQuestion.trim(),
        hint: cardHint.trim(),
        topicId: Number(cardTopicId),
        ctype: cardCtype,
        method: cardMethod,
        fileName: cardAttachedFile ? cardAttachedFile.name : null
      });
      addToast('Card captured');
      setIsAddCardOpen(false);

      // Reset form
      setCardQuestion('');
      setCardHint('');
      setCardTopicId('');
      setCardCtype('exercise');
      setCardMethod('RECALL');
      setCardAttachedFile(null);

      loadData();
      
      // Refresh current page if dashboard or cards
      if (activePage === 'dashboard' || activePage === 'cards') {
        // Trigger a simple state nudge to force children update
        setActivePage(activePage);
      }
    } catch (err) {
      console.error("Failed to add card:", err);
      addToast(err.message || 'Could not add card');
    }
  };

  const handleSelectTopicFromSidebar = (topicId) => {
    setSelectedTopicId(topicId);
    setActivePage('cards');
  };

  // Resolve headers dynamically
  const getPageTitle = () => {
    const titles = {
      dashboard: 'Dashboard',
      session: 'Study session',
      calendar: 'Calendar',
      topics: 'Topics',
      cards: 'Cards',
      analytics: 'Analytics',
      forgetting: 'Forgetting curve'
    };
    return titles[activePage] || 'Recall Studio';
  };

  // Render active view
  const renderView = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard onReviewSubmitted={loadData} />;
      case 'session':
        return (
          <StudySession 
            selectedTopicId={null} 
            onSessionDone={loadData}
            addToast={addToast}
          />
        );
      case 'calendar':
        return <CalendarGrid cards={cards} topics={topics} history={history} />;
      case 'topics':
        return (
          <TopicsLibrary 
            onSelectTopic={(topicId) => {
              setSelectedTopicId(topicId);
              setActivePage('cards');
            }} 
          />
        );
      case 'cards':
        return (
          <CardsLibrary 
            initialTopicId={selectedTopicId} 
            onReviewCard={(card) => {
              setActiveQuickReview(card);
            }}
          />
        );
      case 'analytics':
        return <AnalyticsView />;
      case 'forgetting':
        return (
          <div className="forgetting-curve-view">
            <ForgettingCurveChart />
            
            {/* Retention List */}
            <div className="card retention-list-card">
              <div className="card-title">Your cards — retention estimates</div>
              <div className="ret-list">
                {cards.length === 0 ? (
                  <div className="empty-sub">No cards captured yet</div>
                ) : (
                  [...cards]
                    .sort((a, b) => {
                      const getRet = (c) => {
                        if (!c.lastReview) return 100;
                        const days = (Date.now() - c.lastReview) / 86400000;
                        const stab = c.interval * 1.4;
                        return Math.round(Math.max(0, Math.min(100, Math.exp(-days / stab) * 100)));
                      };
                      return getRet(a) - getRet(b);
                    })
                    .map(c => {
                      const getRet = (card) => {
                        if (!card.lastReview) return 100;
                        const days = (Date.now() - card.lastReview) / 86400000;
                        const stab = card.interval * 1.4;
                        return Math.round(Math.max(0, Math.min(100, Math.exp(-days / stab) * 100)));
                      };
                      const ret = getRet(c);
                      const t = topics.find(topic => topic.id === c.topicId);
                      const retColor = ret > 65 ? 'var(--green)' : ret > 35 ? 'var(--amber)' : 'var(--red)';
                      return (
                        <div key={c.id} className="ret-list-item">
                          <div className="ret-list-item-q-container">
                            <div className="ret-list-item-q">{c.question}</div>
                            <div className="ret-list-item-meta">
                              {t?.name || 'No topic'} · interval {c.interval}d
                            </div>
                          </div>
                          
                          <div className="ret-list-item-bar-container">
                            <div className="ret-list-item-bar-bg">
                              <div 
                                className="ret-list-item-bar-fill" 
                                style={{ width: `${ret}%`, background: retColor }}
                              />
                            </div>
                          </div>
                          
                          <span className="ret-list-item-percent" style={{ color: retColor }}>
                            {ret}%
                          </span>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          </div>
        );
      default:
        return <Dashboard onReviewSubmitted={loadData} />;
    }
  };

  return (
    <AppLayout
      activePage={activePage}
      onNavigate={(page) => {
        setActivePage(page);
        setSelectedTopicId(''); // Clear topic filters on page navigation
      }}
      streak={streak}
      topics={topics}
      onSelectTopic={handleSelectTopicFromSidebar}
      onAddTopicClick={() => setIsAddTopicOpen(true)}
      onAddCardClick={() => setIsAddCardOpen(true)}
      pageTitle={getPageTitle()}
    >
      {renderView()}

      {/* ADD TOPIC MODAL */}
      {isAddTopicOpen && (
        <div className="overlay open" onClick={() => setIsAddTopicOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="m-head">
              <div className="m-title">Add topic</div>
              <button className="close-btn" onClick={() => setIsAddTopicOpen(false)}>×</button>
            </div>
            <form onSubmit={handleAddTopic} className="m-body">
              <div className="field">
                <label>Name</label>
                <input 
                  type="text" 
                  value={topicName} 
                  onChange={(e) => setTopicName(e.target.value)} 
                  placeholder="e.g. Linear Algebra, Spanish B2…"
                  required
                />
              </div>
              <div className="field">
                <label>Subject</label>
                <select value={topicTag} onChange={(e) => setTopicTag(e.target.value)}>
                  <option value="math">Math</option>
                  <option value="programming">Programming</option>
                  <option value="science">Science</option>
                  <option value="language">Language</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="field">
                <label>Notes</label>
                <textarea 
                  value={topicNotes} 
                  onChange={(e) => setTopicNotes(e.target.value)} 
                  rows="2" 
                  placeholder="What's this topic?"
                />
              </div>
              <Button type="submit" variant="primary" style={{ width: '100%', justifyContent: 'center', padding: '11px' }}>
                Add topic
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* ADD CARD MODAL */}
      {isAddCardOpen && (
        <div className="overlay open" onClick={() => setIsAddCardOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="m-head">
              <div className="m-title">Capture a card</div>
              <button className="close-btn" onClick={() => setIsAddCardOpen(false)}>×</button>
            </div>
            <form onSubmit={handleAddCard} className="m-body">
              <div className="field">
                <label>Topic</label>
                <select value={cardTopicId} onChange={(e) => setCardTopicId(e.target.value)}>
                  <option value="">— no topic —</option>
                  {topics.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="field">
                <label>Card type</label>
                <div className="type-sel">
                  {['exercise', 'concept', 'mistake', 'question', 'note'].map(type => (
                    <button
                      key={type}
                      type="button"
                      className={`t-btn ${cardCtype === type ? `s-${type}` : ''}`}
                      onClick={() => setCardCtype(type)}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="field">
                <label>What to remember / question</label>
                <textarea 
                  value={cardQuestion} 
                  onChange={(e) => setCardQuestion(e.target.value)} 
                  rows="3" 
                  placeholder="Describe the concept, exercise, or what you struggled with…"
                  required
                />
              </div>
              
              <div className="field">
                <label>Context / hint (optional)</label>
                <textarea 
                  value={cardHint} 
                  onChange={(e) => setCardHint(e.target.value)} 
                  rows="2" 
                  placeholder="Formula, explanation, or why this matters…"
                />
              </div>
              
              <div className="field">
                <label>Attach file (optional)</label>
                <div 
                  className={`file-upload-area ${cardAttachedFile ? 'has-file' : ''}`}
                  onClick={() => document.getElementById('app-file-inp').click()}
                >
                  <div style={{ fontSize: '20px', marginBottom: '4px', opacity: 0.4 }}>📎</div>
                  <div className="file-label">
                    {cardAttachedFile ? `📎 ${cardAttachedFile.name}` : 'Click to attach a file, exam paper, or photo'}
                  </div>
                </div>
                <input 
                  type="file" 
                  id="app-file-inp" 
                  style={{ display: 'none' }} 
                  accept="image/*,.pdf" 
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setCardAttachedFile(e.target.files[0]);
                    }
                  }}
                />
              </div>
              
              <div className="field">
                <label>Review method</label>
                <select value={cardMethod} onChange={(e) => setCardMethod(e.target.value)}>
                  <option value="RECALL">RECALL — retrieve from memory</option>
                  <option value="TEST">TEST — solve / prove it</option>
                  <option value="READ">READ — re-read and understand</option>
                  <option value="WATCH">WATCH — find and watch a resource</option>
                </select>
              </div>
              
              <Button type="submit" variant="primary" style={{ width: '100%', justifyContent: 'center', padding: '11px' }}>
                Capture card
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* QUICK REVIEW MODAL FROM CARDS VIEW */}
      {activeQuickReview && (
        <div className="overlay open" onClick={() => setActiveQuickReview(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="m-head">
              <div className="m-title">Card Inspector</div>
              <button className="close-btn" onClick={() => setActiveQuickReview(null)}>×</button>
            </div>
            <div className="m-body">
              <Flashcard
                card={activeQuickReview}
                topicName={activeQuickReview.topicName}
                onFeedback={async (cardId, rating) => {
                  try {
                    await api.submitCardReview(cardId, rating);
                    setActiveQuickReview(null);
                    loadData();
                  } catch (err) {
                    console.error("Failed to submit quick review:", err);
                  }
                }}
                showSkip={false}
              />
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      <div className={`toast ${showToast ? 'show' : ''}`}>
        {toastMessage}
      </div>
    </AppLayout>
  );
}

export default App;
