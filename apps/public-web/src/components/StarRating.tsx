'use client';

interface StarRatingProps {
  rating: number;
  count?: number;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
}

export default function StarRating({ rating, count, size = 'md', showCount = true }: StarRatingProps) {
  if (rating <= 0) return null;
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl',
  };

  const sizeClass = sizeClasses[size];

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= Math.floor(rating);
          const halfFilled = star === Math.ceil(rating) && rating % 1 >= 0.5;
          
          return (
            <span
              key={star}
              className={`${sizeClass} ${
                filled
                  ? 'text-purple-600'
                  : halfFilled
                  ? 'text-purple-400'
                  : 'text-gray-300'
              }`}
              style={{
                position: 'relative',
                display: 'inline-block',
              }}
            >
              ★
              {halfFilled && (
                <span
                  className="absolute left-0 top-0 overflow-hidden text-purple-600"
                  style={{ width: '50%' }}
                >
                  ★
                </span>
              )}
            </span>
          );
        })}
      </div>
      <span className={`font-semibold text-gray-900 ${size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base'}`}>
        {rating.toFixed(1)}
      </span>
      {showCount && count !== undefined && count > 0 && (
        <span className={`text-gray-500 ${size === 'sm' ? 'text-xs' : 'text-xs'}`}>
          ({count})
        </span>
      )}
    </div>
  );
}

