import React, { useRef, useEffect, useState, useMemo } from 'react';

interface ScrollPickerProps {
    value: number;
    min?: number;
    max: number;
    onChange: (value: number) => void;
    disabled?: boolean;
}

const ScrollPicker: React.FC<ScrollPickerProps> = ({ value, min = 0, max, onChange, disabled }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [localValue, setLocalValue] = useState(value);
    const options = useMemo(() => Array.from({ length: max - min + 1 }, (_, i) => min + i), [min, max]);
    const itemHeight = 44; // px

    // Sync local value with prop
    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    const handleScroll = () => {
        if (!scrollRef.current || disabled) return;
        const scrollY = scrollRef.current.scrollTop;
        const selectedIndex = Math.round(scrollY / itemHeight);
        const newValue = options[selectedIndex];

        if (newValue !== undefined && newValue !== localValue) {
            setLocalValue(newValue);
            // Throttle or debounce the parent update if needed, 
            // but for now, just updating local state for visual speed.
            onChange(newValue);
        }
    };

    useEffect(() => {
        if (scrollRef.current) {
            const targetIndex = options.indexOf(value);
            const targetScroll = targetIndex * itemHeight;
            if (Math.abs(scrollRef.current.scrollTop - targetScroll) > 1) {
                scrollRef.current.scrollTo({ top: targetScroll, behavior: 'auto' });
            }
        }
    }, [value, options]);

    return (
        <div className={`relative h-[${itemHeight * 3}px] w-full overflow-hidden flex flex-col items-center bg-zinc-950 border border-zinc-800 rounded-2xl ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
            <div
                className="absolute inset-x-0 bg-white/5 border-y border-white/10 pointer-events-none z-10"
                style={{ top: itemHeight, height: itemHeight }}
            />

            <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="w-full overflow-y-scroll no-scrollbar touch-pan-y"
                style={{
                    height: itemHeight * 3,
                    scrollSnapType: 'y mandatory',
                    paddingTop: itemHeight,
                    paddingBottom: itemHeight,
                    overscrollBehavior: 'contain',
                    WebkitOverflowScrolling: 'touch'
                }}
            >
                {options.map((opt) => (
                    <div
                        key={opt}
                        className="flex items-center justify-center transition-all duration-150 scroll-snap-align-center"
                        style={{
                            height: itemHeight,
                            scrollSnapAlign: 'center',
                            perspective: '1000px',
                            willChange: 'transform'
                        }}
                    >
                        <span
                            className={`text-2xl font-black transition-all ${localValue === opt ? 'text-white scale-125' : 'text-zinc-700 scale-90'}`}
                            style={{
                                transform: `rotateX(${Math.max(-45, Math.min(45, (localValue - opt) * 20))}deg)`,
                                willChange: 'transform, opacity'
                            }}
                        >
                            {opt}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ScrollPicker;
