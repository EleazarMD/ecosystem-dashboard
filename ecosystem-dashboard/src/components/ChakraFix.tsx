/**
 * ChakraFix.tsx
 * This file provides compatibility components to fix styling issues with Chakra UI
 * after removing Tailwind CSS from the project.
 */
import React from 'react';

// Simple wrapper components that avoid Chakra UI styling issues
export const SimpleBox: React.FC<{
  children: React.ReactNode;
  height?: string;
  marginBottom?: string;
  style?: React.CSSProperties;
}> = ({ children, height, marginBottom, style }) => {
  return (
    <div
      style={{
        height: height || 'auto',
        marginBottom: marginBottom || '0',
        ...style
      }}
    >
      {children}
    </div>
  );
};

export const SimpleText: React.FC<{
  children: React.ReactNode;
  fontSize?: string;
  color?: string;
  marginTop?: string;
  textAlign?: 'left' | 'center' | 'right';
}> = ({ children, fontSize, color, marginTop, textAlign }) => {
  return (
    <div
      style={{
        fontSize: fontSize || 'inherit',
        color: color || 'inherit',
        marginTop: marginTop || '0',
        textAlign: textAlign || 'left'
      }}
    >
      {children}
    </div>
  );
};

export const SimpleHeading: React.FC<{
  children: React.ReactNode;
  marginBottom?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}> = ({ children, marginBottom, size }) => {
  let fontSize = '1.5rem';
  let fontWeight = '600';
  
  switch (size) {
    case 'sm':
      fontSize = '1rem';
      break;
    case 'md':
      fontSize = '1.25rem';
      break;
    case 'lg':
      fontSize = '1.5rem';
      break;
    case 'xl':
      fontSize = '2rem';
      break;
  }
  
  return (
    <div
      style={{
        fontSize,
        fontWeight,
        marginBottom: marginBottom || '0.5rem'
      }}
    >
      {children}
    </div>
  );
};
