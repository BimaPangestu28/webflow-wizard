import React, { useEffect, useRef, useState } from 'react';

interface Props {
  children: React.ReactNode;
}

export const DraggableWindow: React.FC<Props> = ({ children }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const dragRef = useRef<HTMLDivElement>(null);
  const initialMousePos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const dx = e.clientX - initialMousePos.current.x;
      const dy = e.clientY - initialMousePos.current.y;

      setPosition(prev => ({
        x: prev.x + dx,
        y: prev.y + dy
      }));

      initialMousePos.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === dragRef.current) {
      setIsDragging(true);
      initialMousePos.current = { x: e.clientX, y: e.clientY };
    }
  };

  return (
    <div 
      className="fixed"
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`
      }}
    >
      <div 
        ref={dragRef}
        className="bg-secondary h-8 cursor-move flex items-center px-4"
        onMouseDown={handleMouseDown}
      >
        <div className="flex-1">WebFlow Wizard</div>
        <button 
          className="hover:bg-destructive/10 p-1 rounded"
          onClick={() => window.close()}
        >
          ✕
        </button>
      </div>
      <div className="bg-background shadow-lg rounded-b-lg">
        {children}
      </div>
    </div>
  );
};
