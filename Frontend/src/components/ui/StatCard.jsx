import React from 'react';
import './StatCard.css';

export const StatCard = ({
  label,
  value,
  subtext,
  className = '',
  ...props
}) => {
  return (
    <div className={`stat ${className}`} {...props}>
      <div className="stat-label">{label}</div>
      <div className="stat-val">{value}</div>
      {subtext && <div className="stat-sub">{subtext}</div>}
    </div>
  );
};

export default StatCard;
