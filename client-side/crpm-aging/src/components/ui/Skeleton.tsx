import React from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
  rounded?: boolean;
}

const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  className = '',
  rounded = true,
}) => (
  <div
    className={`bg-gray-200 animate-pulse ${rounded ? 'rounded' : ''} ${className}`}
    style={{ width, height }}
  />
);

export default Skeleton;