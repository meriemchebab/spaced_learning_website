import React from 'react';
import './TopicChip.css';

export const TopicChip = ({
  type = 'concept', // exercise, concept, mistake, question, note
  className = '',
  ...props
}) => {
  const displayType = type === 'no_topic' ? 'No topic' : (type || 'question');
  const normalizedType = String(displayType).toLowerCase();
  const classNames = [
    'ctype',
    `ct-${normalizedType}`,
    className
  ].filter(Boolean).join(' ');

  return (
    <span className={classNames} {...props}>
      {displayType}
    </span>
  );
};

export default TopicChip;
