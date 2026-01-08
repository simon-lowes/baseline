# Security Policy

## Reporting Security Issues

If you discover a security vulnerability in Baseline, please report it responsibly.

**Please do not report security vulnerabilities through public GitHub issues, discussions, or pull requests.**

Instead, please email: **52527080+simon-lowes@users.noreply.github.com**

Please include as much of the following information as possible:

- Type of issue (e.g., SQL injection, XSS, authentication bypass, data exposure)
- Full paths of affected source file(s)
- Location of the affected code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue and how an attacker might exploit it

This information helps me understand and address the issue more quickly.

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 3.x     | :white_check_mark: |
| < 3.0   | :x:                |

## Security Measures

Baseline implements several security measures:

- Row Level Security (RLS) policies in Supabase
- Secure authentication via Supabase Auth
- Environment variable protection for sensitive credentials
- Input validation and sanitization
- HTTPS-only communication with backend services

## Response Time

I will acknowledge receipt of your vulnerability report within 48 hours and provide a more detailed response within 7 days.
