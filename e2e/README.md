# E2E Test Coverage: Critical Flows

This directory contains end-to-end tests for critical application flows using Playwright.

## Test Suites

### 1. OAuth Authentication Flow (`oauth-flow.e2e.js`)
Tests for the authentication system including:
- Onboarding display when unauthenticated
- HA URL entry and validation
- OAuth token persistence
- Token management (storage, logout, expiry)
- OAuth redirect handling
- Fallback token authentication mode
- Connection error handling

**Key Scenarios:**
- ✅ User with no auth sees onboarding
- ✅ User can enter HA URL with format validation
- ✅ OAuth tokens are persisted to localStorage
- ✅ User can logout and clear OAuth session
- ✅ URL validation prevents invalid inputs
- ✅ Redirect from Home Assistant OAuth flow is handled
- ✅ Fallback to token auth when OAuth unavailable

### 2. Drag and Drop (`drag-and-drop.e2e.js`)
Tests for card reordering and layout customization:
- Edit mode toggle
- Card dragging to new positions
- Drop zone indicators
- Card position persistence across reloads
- Delete zone detection during drag
- Touch/mobile drag support
- Drag cancellation with Escape key

**Key Scenarios:**
- ✅ Edit mode can be triggered
- ✅ Cards can be dragged to reorder
- ✅ Drop zones show visual feedback
- ✅ Card order persists after reload
- ✅ Delete indicators appear when appropriate
- ✅ Escape key cancels in-progress drag
- ✅ Mobile/touch drag works on small viewports

### 3. Modal Interactions (`modals.e2e.js`)
Tests for all modal/dialog behaviors:
- Settings modal open/close
- Close button and Escape key support
- Click-outside behavior (backdrop dismiss)
- Tab switching within modals
- Theme changing
- Language selection
- Connection status display
- Card settings modals
- Focus management
- Animation transitions

**Key Scenarios:**
- ✅ Settings modal opens and closes
- ✅ Modal closes on Escape key
- ✅ Backdrop click closes modal
- ✅ Theme can be changed in appearance tab
- ✅ Language selector works
- ✅ Connection info displays
- ✅ Modal animations are smooth
- ✅ Body scroll is locked when modal open
- ✅ Focus returns to trigger element on close

## Setup and Usage

### Install Playwright
```bash
npm install @playwright/test --save-dev
npx playwright install
```

### Run All E2E Tests
```bash
npm run test:e2e
```

### Run Tests in UI Mode (Recommended for Development)
```bash
npm run test:e2e:ui
```

### Run Tests in Headed Mode (See the Browser)
```bash
npm run test:e2e:headed
```

### Run Specific Test File
```bash
npx playwright test e2e/oauth-flow.e2e.js
```

### Run Specific Test
```bash
npx playwright test -g "should open settings modal"
```

### Debug Tests
```bash
npx playwright test --debug
```

## Test Fixtures

The test suite includes custom fixtures in `fixtures.js`:

### `mockHAConnection`
Mocks Home Assistant WebSocket connection with simulated entity responses

### `authenticatedPage`
Pre-authenticated page with OAuth tokens and HA URL pre-configured

### Context
Auto-populates localStorage with auth credentials before each test

## Architecture Notes

- **Base URL**: Tests run against `http://localhost:5173` (dev server)
- **Web Server**: Vite dev server is automatically started unless using existing server
- **Browser Coverage**: Chromium and Firefox
- **Retries**: No retries in development, 2 retries in CI
- **Screenshots**: Only captured on test failure
- **Traces**: Recorded on first retry for debugging

## CI/CD Integration

For continuous integration:

```yaml
- name: Install Playwright
  run: npx playwright install --with-deps

- name: Run E2E tests
  run: npm run test:e2e
```

## Debugging Tips

1. **UI Mode** (Best for interactive debugging):
   ```bash
   npm run test:e2e:ui
   ```

2. **Headed Mode** (See the browser while tests run):
   ```bash
   npm run test:e2e:headed
   ```

3. **Inspector** (Step through tests):
   ```bash
   npx playwright test --debug
   ```

4. **Trace Viewer** (Review test recordings):
   ```bash
   npx playwright show-trace path/to/trace.zip
   ```

## Common Issues

### WebSocket Not Mocking
The `mockHAConnection` fixture mocks WebSocket globally. Ensure tests use `mockHAConnection` in their fixtures.

### Onboarding Modal Not Appearing
Clear localStorage before test:
```javascript
await page.evaluate(() => localStorage.clear());
```

### Modal Not Closing
Some modals prevent closing (e.g., required OAuth setup). Wait for modal state to stabilize:
```javascript
await page.waitForTimeout(300);
```

### Drag Not Working
Playwright drag-to may not work on all elements. Tests include fallback to manual mouse events.

## Coverage Goals

- **OAuth Flow**: 100% coverage of authentication paths
- **Drag & Drop**: All reorder, delete, and mobile scenarios
- **Modals**: All open/close patterns and settings changes

## Future Improvements

- [ ] Add visual regression testing for theme changes
- [ ] Add performance benchmarks for modal transitions
- [ ] Add device-specific tests (tablet, mobile orientations)
- [ ] Add accessibility compliance testing (a11y)
- [ ] Record videos of failed tests
- [ ] Parallel test execution with better isolation
