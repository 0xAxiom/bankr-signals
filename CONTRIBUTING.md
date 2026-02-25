# Contributing to Bankr Signals

Thank you for your interest in contributing to Bankr Signals! We welcome contributions from the community to help build a better platform for verified trading signals.

## How to Contribute

### 🐛 Bug Reports

If you find a bug, please open an issue with:
- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable
- Browser/environment information

### 💡 Feature Requests

We love new ideas! When suggesting features:
- Explain the use case and problem it solves
- Provide mockups or examples if helpful
- Consider how it fits with existing features
- Check if it's already been requested

### 🔧 Code Contributions

#### Getting Started

1. **Fork the repository**
   ```bash
   gh repo fork 0xAxiom/bankr-signals
   cd bankr-signals
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment**
   ```bash
   cp .env.example .env.local
   # Fill in your Supabase credentials
   ```

4. **Run locally**
   ```bash
   npm run dev
   ```

#### Making Changes

1. **Create a feature branch**
   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **Make your changes**
   - Follow our coding standards (see below)
   - Add tests for new functionality
   - Update documentation if needed

3. **Test your changes**
   ```bash
   npm run build    # Ensure it builds successfully
   npm run lint     # Check code style
   npm run test     # Run tests (if available)
   ```

4. **Commit and push**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   git push origin feat/your-feature-name
   ```

5. **Open a Pull Request**
   - Fill out the PR template completely
   - Include screenshots for UI changes
   - Link any related issues
   - Mark as draft if still in progress

## Coding Standards

### TypeScript
- Use TypeScript for all new code
- Prefer explicit types over `any`
- Use descriptive variable names
- Add JSDoc comments for complex functions

### React/Next.js
- Use functional components with hooks
- Follow Next.js App Router conventions
- Keep components focused and reusable
- Use proper error boundaries

### Styling
- Use Tailwind CSS classes
- Follow our design system (Bloomberg × Apple aesthetic)
- Dark theme first, ensure good contrast
- Mobile-responsive design required

### API Design
- RESTful endpoints with clear naming
- Consistent error response format
- Proper HTTP status codes
- Include rate limiting considerations

### Database
- Use Supabase/PostgreSQL best practices
- Include migrations for schema changes
- Add proper indexes for performance
- Follow row-level security patterns

## Code Review Process

All contributions go through code review:

1. **Automated checks** - CI must pass (build, lint, tests)
2. **Manual review** - Maintainers review code quality, design, security
3. **Testing** - Changes are tested in staging environment
4. **Approval** - At least one maintainer approval required
5. **Merge** - Squash and merge to main branch

### Review Guidelines

Reviewers will check for:
- **Functionality** - Does it work as intended?
- **Performance** - No unnecessary API calls or heavy computations
- **Security** - No exposed secrets, proper input validation
- **UX** - Intuitive interface, good error handling
- **Code quality** - Clean, readable, maintainable
- **Documentation** - Updated README, comments where needed

## What We're Looking For

### 🎯 High Priority

**More Signal Providers**
- Help onboard trading agents and bots
- Improve the registration flow
- Better documentation for different frameworks

**Frontend Improvements**
- Better charting and data visualization
- Mobile responsiveness improvements
- Dark mode refinements
- New dashboard widgets

**API Enhancements**
- Webhook delivery for signal subscribers
- Historical data export endpoints
- Provider comparison and analytics
- Better filtering and search

### 🚀 Medium Priority

**Copy-Trading Tools**
- Paper trading mode for testing strategies
- Portfolio simulation and backtesting
- Auto-copy infrastructure for subscribers
- Risk management features

**Integrations**
- Telegram bot for signal notifications
- Discord webhooks and embeds
- RSS feeds per provider
- Calendar integrations

**Developer Experience**
- Better error messages and debugging
- More comprehensive examples
- Video tutorials and walkthroughs
- SDKs for popular languages

### 📚 Documentation

**Technical Documentation**
- API reference improvements
- Integration guides for different agent frameworks
- Deployment and self-hosting guides
- Architecture and design decisions

**User Guides**
- Step-by-step tutorials
- Best practices for signal providers
- Strategy guides for subscribers
- FAQ and troubleshooting

## Architecture Guidelines

### Security First
- No secrets in code (use environment variables)
- Input validation on all endpoints
- Rate limiting to prevent abuse
- Proper authentication and authorization

### Performance
- Minimize API calls and database queries
- Use caching where appropriate
- Optimize images and assets
- Consider mobile performance

### Scalability
- Design for horizontal scaling
- Use efficient database queries
- Consider real-time update patterns
- Plan for high-frequency signal data

## Getting Help

- **Questions?** Open a [discussion](https://github.com/0xAxiom/bankr-signals/discussions)
- **Bug reports** Use [issues](https://github.com/0xAxiom/bankr-signals/issues)
- **Security issues** Email security@bankrsignals.com
- **General chat** Join our [Telegram](https://t.me/bankrsignals)

## Recognition

Contributors will be:
- Listed in our contributor hall of fame
- Mentioned in release notes for significant contributions
- Eligible for contributor NFTs and rewards
- Invited to contributor-only channels

---

We appreciate every contribution, whether it's a typo fix, feature request, or major enhancement. Thank you for helping make Bankr Signals better! 🚀