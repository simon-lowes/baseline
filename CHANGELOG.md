# Changelog

All notable changes to Baseline will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [4.2.0] - 2026-01-15

### Added
- Privacy Policy page accessible from footer
- Terms of Service page accessible from footer
- Version display in About dialog
- Help & FAQ link in About dialog
- Contact support link in About dialog
- Sentry error monitoring for improved reliability
- Help center with FAQ section

### Changed
- Footer now includes Privacy and Terms links
- About dialog redesigned with version info and quick links

## [4.1.0] - 2026-01-14

### Added
- Account settings with profile management
- GDPR-compliant data export (JSON and CSV formats)
- Account deletion with complete data purge
- Display name customization

### Security
- Secure account deletion via Edge Function with admin privileges

## [4.0.0] - 2026-01-10

### Added
- Convex backend migration complete
- Real-time data synchronization
- Improved offline support with queue management

### Changed
- Migrated from Supabase to Convex for data layer
- Enhanced sync reliability with retry logic

## [3.0.0] - 2025-12-15

### Added
- Multiple custom trackers support
- AI-powered tracker generation with Gemini
- AI-generated tracker icons
- Cross-tracker analytics and insights
- Interlink correlation analysis

### Changed
- Redesigned dashboard with tracker cards
- Improved analytics visualization

## [2.0.0] - 2025-11-01

### Added
- Theme system with 10 color palettes
- Dark mode support
- High contrast accessibility theme
- Pattern overlays for colorblind users

### Changed
- Moved to OKLch color space for perceptual uniformity
- Improved chart accessibility

## [1.0.0] - 2025-10-01

### Added
- Initial release
- Pain tracking with intensity, location, and triggers
- Calendar heatmap visualization
- Entry management (add, edit, delete)
- User authentication with Supabase
- Offline-first PWA support
- Data export functionality
