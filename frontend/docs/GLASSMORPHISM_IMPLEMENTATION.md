# Glassmorphism UI Implementation

This document explains the glassmorphism UI changes implemented in the Study Buddy application.

## Changes Made

### 1. CSS Classes Added

- Created `styles/glassmorphism.css` with various glassmorphism utility classes
- Added glassmorphism classes to `app/globals.css`

### 2. Components Updated

- `components/FileUpload.tsx`: Added glassmorphism effects to all UI elements
- `app/questions/page.tsx`: Added glassmorphism effects to all UI elements

### 3. CSS Classes Available

#### Container Classes:

- `glass-container`: Basic glassmorphism effect
- `glass-vibrant`: More vibrant glassmorphism effect
- `glass-subtle`: Subtle glassmorphism effect
- `glass-card`: For card-like containers
- `glass-question`: For question containers

#### Element Classes:

- `glass-input`: For input fields
- `glass-button`: For buttons
- `glass-choice`: For question choice items

#### Special State Classes:

- `glass-choice.selected`: For selected choices
- `glass-choice.correct`: For correct answers
- `glass-choice.incorrect`: For incorrect answers

## Design Principles Used

1. **Transparency**: Used rgba values for semi-transparent backgrounds
2. **Blur Effects**: Applied backdrop-filter for the frosted glass effect
3. **Borders**: Added subtle borders to define elements against backgrounds
4. **Color Harmony**: Used light text colors that work well against glass backgrounds
5. **Consistency**: Applied consistent glass effects across all components

## How to Customize

You can adjust the glassmorphism effect by modifying:

- Opacity in the rgba values (background: rgba(255, 255, 255, 0.x))
- Blur amount (backdrop-filter: blur(xpx))
- Border opacity (border: 1px solid rgba(255, 255, 255, 0.x))
- Colors for different states (selected, correct, incorrect)

## Browser Compatibility

Note: backdrop-filter is not supported in older browsers. Consider adding fallbacks for broader compatibility.
