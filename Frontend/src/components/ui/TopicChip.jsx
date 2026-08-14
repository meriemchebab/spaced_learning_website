import React from 'react';
import './TopicChip.css';

export const TopicChip = ({
  type = 'concept', // exercise, concept, mistake, question, note
  className = '',
  ...props
}) => {
  const normalizedType = type.toLowerCase();
  const classNames = [
    'ctype',
    `ct-${normalizedType}`,
    className
  ].filter(Boolean).join(' ');

  return (
    <span className={classNames} {...props}>
      {type}
    </span>
  );
};

export default TopicChip;
