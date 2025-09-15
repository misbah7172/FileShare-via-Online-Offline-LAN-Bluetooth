# Security Policy

## Security Features

FileShare implements multiple layers of security to protect user data and privacy:

### End-to-End Encryption
- All file transfers use WebRTC DTLS (Datagram Transport Layer Security)
- Data channels are encrypted with SRTP (Secure Real-time Transport Protocol)
- Files are never stored on servers - only transferred directly between peers

### Network Security
- HTTPS/TLS encryption for all web traffic
- Secure WebSocket connections for signaling
- Content Security Policy (CSP) headers
- CORS protection

### Data Protection
- No persistent storage of user files
- Room passwords are hashed using SHA-256
- Secure random room ID generation using crypto module
- Automatic cleanup of empty rooms

### Access Control
- Optional room password protection
- Rate limiting on signaling server
- Maximum room size limits
- Session-based user management

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in FileShare, please report it responsibly:

### How to Report
1. **Email**: Send details to security@fileshare.app (if available)
2. **GitHub**: Create a private security advisory
3. **Do NOT** create public issues for security vulnerabilities

### Information to Include
- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact assessment
- Suggested fixes (if any)

### Response Timeline
- **24 hours**: Acknowledgment of report
- **72 hours**: Initial assessment
- **7 days**: Status update and timeline
- **30 days**: Target resolution

### What to Expect
1. Confirmation of receipt
2. Assessment of the vulnerability
3. Timeline for fixes
4. Credit for responsible disclosure (if desired)

## Security Best Practices for Users

### For Room Creators
- Use strong, unique room passwords
- Share room links securely (encrypted messaging)
- Monitor connected users
- Use temporary rooms for sensitive files

### For All Users
- Keep browsers updated
- Use secure networks (avoid public WiFi for sensitive transfers)
- Verify recipient identity before sending files
- Clear browser data after sensitive transfers

### For Self-Hosting
- Use strong TLS certificates
- Implement reverse proxy with security headers
- Monitor server logs for suspicious activity
- Keep software dependencies updated
- Use environment variables for secrets
- Implement proper firewall rules

## Security Limitations

### Known Limitations
- Relies on browser WebRTC implementation security
- No protection against malicious recipients
- Temporary exposure of room links in browser history
- Dependent on DNS security for initial connection

### Mitigations
- Use HTTPS everywhere
- Clear browser history for sensitive sessions
- Verify all participants before sharing
- Use password-protected rooms for sensitive data

## Security Updates

Security updates will be released as needed and announced via:
- GitHub releases
- Security advisories
- README updates

### Update Policy
- Critical vulnerabilities: Immediate patch
- High severity: Within 48 hours
- Medium severity: Within 1 week
- Low severity: Next regular release

## Compliance

FileShare is designed with privacy by design principles:
- No data collection or analytics
- No user tracking
- No persistent storage of user data
- Minimal server-side logging

## Third-Party Security

### Dependencies
- Regular security audits of npm packages
- Automated dependency updates
- Use of well-maintained, security-focused libraries

### Infrastructure
- Docker security best practices
- Minimal attack surface
- Non-root container execution
- Resource limits and constraints

## Contact

For security-related inquiries:
- Create a GitHub issue (for general security questions)
- Check documentation for common security topics
- Review code for implementation details

Remember: FileShare prioritizes user privacy and security. When in doubt, don't send sensitive files over any file-sharing platform.
