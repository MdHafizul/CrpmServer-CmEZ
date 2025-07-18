import React from 'react';

interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  headerRight?: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ title, children, className = '', headerRight }) => {
  return (
    <div className={`bg-white rounded-lg shadow-md overflow-hidden ${className}`}>
      {title && (
        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200">
          <h3 className="font-medium text-gray-800">{title}</h3>
          {headerRight && <div>{headerRight}</div>}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
};

export default Card;