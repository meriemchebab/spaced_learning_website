import React from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import './AppLayout.css';

export const AppLayout = ({
  children,
  activePage,
  onNavigate,
  streak,
  topics,
  onSelectTopic,
  onAddTopicClick,
  onAddCardClick,
  pageTitle
}) => {
  return (
    <div className="app">
      <Sidebar
        activePage={activePage}
        onNavigate={onNavigate}
        streak={streak}
        topics={topics}
        onSelectTopic={onSelectTopic}
      />
      <div className="main">
        <Topbar
          pageTitle={pageTitle}
          onAddTopicClick={onAddTopicClick}
          onAddCardClick={onAddCardClick}
        />
        <div className="content">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AppLayout;
