export default function RadialGauge({ value, size = 120, strokeWidth = 10 }: { value: number, size?: number, strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * Math.PI; // Half circle
  const offset = circumference - (value / 100) * circumference;

  let color = 'text-emerald-500';
  if (value < 40) color = 'text-red-500';
  else if (value < 70) color = 'text-amber-500';

  return (
    <div className="relative flex flex-col items-center justify-end" style={{ width: size, height: size / 2 + 10 }}>
      <svg className="w-full h-full overflow-visible" style={{ transform: 'rotate(180deg)' }}>
        {/* Background Arc */}
        <path
          d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
          fill="transparent"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className="text-white/10"
        />
        {/* Progress Arc */}
        <path
          d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
          fill="transparent"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={`${color} transition-all duration-1000 ease-out`}
        />
      </svg>
      <div className="absolute bottom-0 flex flex-col items-center">
        <span className="text-xl font-bold font-financial tracking-tighter leading-none">{value}</span>
      </div>
    </div>
  );
}
