import React, { createContext, useContext, useEffect, useState } from 'react';

interface ThemeColors {
  primary: string;
  accent: string;
  background: string;
  foreground: string;
}

interface ThemeContextType {
  colors: ThemeColors;
  updateColor: (key: keyof ThemeColors, value: string) => void;
  resetColors: () => void;
}

const defaultColors: ThemeColors = {
  primary: 'oklch(0.205 0 0)',
  accent: 'oklch(0.5 0.2 250)', // Blue accent
  background: 'oklch(1 0 0)',
  foreground: 'oklch(0.145 0 0)',
};

// Load colors from localStorage or use defaults
const getInitialColors = (): ThemeColors => {
  if (typeof window === 'undefined') return defaultColors;
  
  const saved = localStorage.getItem('theme-colors');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return defaultColors;
    }
  }
  return defaultColors;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [colors, setColors] = useState<ThemeColors>(getInitialColors);

  useEffect(() => {
    // Apply colors to CSS variables
    const root = document.documentElement;
    root.style.setProperty('--primary', colors.primary);
    root.style.setProperty('--accent', colors.accent);
    root.style.setProperty('--background', colors.background);
    root.style.setProperty('--foreground', colors.foreground);
    
    // Save to localStorage
    localStorage.setItem('theme-colors', JSON.stringify(colors));
  }, [colors]);

  const updateColor = (key: keyof ThemeColors, value: string) => {
    setColors(prev => ({ ...prev, [key]: value }));
  };

  const resetColors = () => {
    setColors(defaultColors);
  };

  return (
    <ThemeContext.Provider value={{ colors, updateColor, resetColors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
