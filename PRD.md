# Planning Guide

A compassionate digital companion for tracking and understanding chronic pain patterns, helping users document their pain journey and identify triggers or patterns over time.

**Experience Qualities**: 
1. **Calming** - The interface should feel gentle and soothing, never overwhelming or clinical, providing a safe space for difficult moments.
2. **Empowering** - Users should feel in control of their health data, with clear insights that help them understand their pain patterns.
3. **Efficient** - Quick entry during painful moments is critical; the app should minimize friction when users need to log pain quickly.

**Complexity Level**: Light Application (multiple features with basic state)
This is a focused health tracking application with multiple interconnected features (logging pain, viewing history, analyzing patterns) but without the complexity of medical integrations or multi-user systems.

## Essential Features

**Pain Entry Logging**
- Functionality: Users can quickly record a pain episode with intensity, location, description, and timestamp
- Purpose: Capture pain data in the moment when it's most accurate, even during difficult times
- Trigger: User clicks "Log Pain" button or opens the app
- Progression: Click log button → Select body location → Set pain intensity (1-10 scale) → Add optional notes/triggers → Save entry
- Success criteria: Entry saved to persistent storage within 3 taps, displays in timeline immediately

**Pain History Timeline**
- Functionality: Chronological view of all pain entries with filtering by date range and body location
- Purpose: Allows users to review their pain patterns and share comprehensive history with healthcare providers
- Trigger: User navigates to history view or scrolls down from main screen
- Progression: View timeline → Filter by date/location if needed → Tap entry to see full details → Edit or delete if needed
- Success criteria: All entries display in reverse chronological order, filters update view instantly

**Body Location Selector**
- Functionality: Visual or list-based body location picker for identifying where pain occurs
- Purpose: Standardizes location tracking to enable pattern recognition across entries
- Trigger: Activated during pain entry creation
- Progression: View location options → Select primary location(s) → Confirm selection → Return to entry form
- Success criteria: Clear visual feedback on selection, supports multiple locations per entry

**Pain Intensity Scale**
- Functionality: 1-10 numeric scale with visual indicators for rating pain severity
- Purpose: Provides consistent measurement for tracking pain fluctuations over time
- Trigger: Required field during pain entry
- Progression: View scale with descriptors → Select number → See visual confirmation → Continue with entry
- Success criteria: Scale is intuitive and accessible, provides helpful descriptors for consistency

## Edge Case Handling

- **No Entries Yet**: Display welcoming empty state with guidance on creating first entry and explaining app benefits
- **Rapid Entry Creation**: Prevent duplicate submissions during poor connectivity or rapid tapping
- **Very Long Notes**: Gracefully handle extensive notes with scrolling and proper text wrapping
- **Date Filtering Edge Cases**: Handle "no results" state when filters exclude all entries
- **Missing Required Fields**: Prevent saving incomplete entries with clear validation messages

## Design Direction

The design should evoke a sense of calm support and clinical reliability - like a trusted healthcare companion. It should feel warm but professional, using soft colors that don't strain the eyes, with generous spacing that never feels cluttered. The interface should communicate empathy and understanding while maintaining the structure needed for health tracking.

## Color Selection

A soothing, health-focused palette with calming blues and warm earth tones to reduce stress while maintaining clarity.

- **Primary Color**: Soft teal `oklch(0.65 0.12 200)` - Communicates calm, healing, and medical trust without being cold
- **Secondary Colors**: 
  - Warm cream background `oklch(0.97 0.01 80)` - Gentle on the eyes, reduces strain
  - Muted sage `oklch(0.75 0.06 150)` - Natural, soothing accent for success states
- **Accent Color**: Coral `oklch(0.68 0.15 35)` - Warm, human touch for CTAs and important elements without being alarming
- **Foreground/Background Pairings**: 
  - Primary (Soft Teal `oklch(0.65 0.12 200)`): White text `oklch(1 0 0)` - Ratio 5.2:1 ✓
  - Accent (Coral `oklch(0.68 0.15 35)`): White text `oklch(1 0 0)` - Ratio 5.0:1 ✓
  - Background (Warm Cream `oklch(0.97 0.01 80)`): Deep charcoal text `oklch(0.25 0.01 260)` - Ratio 12.8:1 ✓
  - Muted Sage `oklch(0.75 0.06 150)`: Deep charcoal text `oklch(0.25 0.01 260)` - Ratio 7.1:1 ✓

## Font Selection

Typography should feel approachable yet professional, with excellent readability for users who may be experiencing discomfort or vision issues during pain episodes.

- **Primary Font**: Source Sans 3 - A humanist sans-serif that balances warmth with clarity, designed for readability
- **Typographic Hierarchy**: 
  - H1 (Page Title): Source Sans 3 SemiBold/32px/tight tracking
  - H2 (Section Headers): Source Sans 3 SemiBold/24px/normal tracking
  - H3 (Entry Cards): Source Sans 3 Medium/18px/normal tracking
  - Body (Notes, Descriptions): Source Sans 3 Regular/16px/relaxed line-height (1.6)
  - Labels (Form Fields): Source Sans 3 Medium/14px/normal tracking
  - Supporting Text (Timestamps): Source Sans 3 Regular/14px/normal tracking with muted color

## Animations

Animations should be minimal and calming, never jarring or distracting. Use gentle fades for state transitions (200ms), subtle scale feedback on button presses (0.98 scale, 100ms), and smooth height animations for expanding/collapsing entry details (300ms ease-out). Add a satisfying but subtle celebration animation when completing an entry to acknowledge the effort of tracking pain. Avoid any harsh movements that could cause discomfort.

## Component Selection

- **Components**: 
  - Card component for individual pain entries with subtle shadows
  - Button with rounded corners and gentle hover states
  - Slider for pain intensity scale (1-10) with custom thumb and track styling
  - Textarea for notes with auto-expand
  - Calendar date picker for filtering and backdating entries
  - Badge components for location tags with soft colors
  - Tabs for switching between log/history views
  - Dialog for detailed entry views and editing
  - Select dropdown for common pain triggers/descriptors
  
- **Customizations**: 
  - Custom body location selector using a grid of buttons with icon representation
  - Pain scale slider with color gradient from green (1) to amber (5) to red (10)
  - Entry cards with left border colored by pain intensity
  
- **States**: 
  - Buttons: Gentle scale down on press, opacity shift on hover, disabled state with reduced opacity
  - Inputs: Soft border highlight on focus with accent color, error state with coral border
  - Cards: Subtle lift on hover, pressed state for tappable entries
  
- **Icon Selection**: 
  - Plus icon for new entry button
  - Calendar icon for date selection
  - List/ClockCounterClockwise for history view
  - MapPin or Crosshair for location
  - Sliders for intensity
  - Note/NotePencil for notes field
  - X for clearing/closing
  - Check for confirmation
  
- **Spacing**: 
  - Page padding: 6 (24px)
  - Card padding: 5 (20px)
  - Section gaps: 6-8 (24-32px)
  - Element gaps within cards: 3-4 (12-16px)
  - Button padding: px-6 py-3
  
- **Mobile**: 
  - Stack all form elements vertically on mobile
  - Floating action button for "Log Pain" on mobile, fixed to bottom right
  - Full-width cards on mobile with adequate touch targets (min 44px)
  - Simplified body location grid on smaller screens
  - Sticky header with navigation on mobile
  - Bottom sheet for entry details on mobile vs dialog on desktop
