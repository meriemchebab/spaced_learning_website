import React from 'react';
import Button from '../ui/Button';
import './Topbar.css';

export const Topbar = ({
  pageTitle = 'Dashboard',
  onAddTopicClick,
  onAddCardClick
}) => {
  return (
    <header className="topbar">
      <div className="page-title">{pageTitle}</div>
      <div className="topbar-actions">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onAddTopicClick}
        >
          + Topic
        </Button>
        <Button 
          variant="primary" 
          size="sm" 
          onClick={onAddCardClick}
        >
          + Card
        </Button>
      </div>
    </header>
  );
};

export default Topbar;
