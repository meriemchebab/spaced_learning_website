import React from 'react';
import './Badge.css';

export const Badge = ({
  children,
  variant = 'gray', // purple, teal, amber, red, blue, green, gray
  className = '',
  ...props
}) => {
  const classNames = [
    'badge',
    `b-${variant}`,
    className
  ].filter(Boolean).join(' ');

  return (
    <span className={classNames} {...props}>
      {children}
    </span>
  );
};

export default Badge;
