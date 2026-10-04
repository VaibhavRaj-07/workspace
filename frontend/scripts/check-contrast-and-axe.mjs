import { chromium } from 'playwright';

async function checkContrastAndAudit() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('====================================================');
  console.log('🔍 RUNNING COMPREHENSIVE WCAG CONTRAST & ACCESSIBILITY AUDIT');
  console.log('====================================================\n');

  // Login first as Alex
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', 'alex@workspace.dev');
  await page.fill('input[type="password"]', 'Password123!');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2500);

  // Fetch first project ID
  const projectLink = await page.locator('a[href^="/projects/"]').first();
  const projectHref = await projectLink.getAttribute('href');
  const projectUrl = `http://localhost:3000${projectHref}`;

  const routes = [
    { name: 'Login Page', url: 'http://localhost:3000/login' },
    { name: 'Dashboard', url: 'http://localhost:3000/' },
    { name: 'Projects Registry', url: 'http://localhost:3000/projects' },
    { name: 'Project Workspace (Kanban)', url: projectUrl },
    { name: 'Demo Conflict Lab', url: 'http://localhost:3000/demo-conflict' },
    { name: 'Styleguide & Cursors', url: 'http://localhost:3000/styleguide' },
  ];

  const colorParse = (rgbStr) => {
    const match = rgbStr.match(/\d+/g);
    if (!match || match.length < 3) return null;
    return [parseInt(match[0]), parseInt(match[1]), parseInt(match[2])];
  };

  const luminance = (r, g, b) => {
    const a = [r, g, b].map((v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  };

  const contrastRatio = (lum1, lum2) => {
    const lighter = Math.max(lum1, lum2);
    const darker = Math.min(lum1, lum2);
    return (lighter + 0.05) / (darker + 0.05);
  };

  for (const theme of ['LIGHT (Day Shift)', 'DARK (Night Shift)']) {
    console.log(`\n▶ AUDITING THEME: ${theme}`);
    console.log('----------------------------------------------------');

    for (const route of routes) {
      await page.goto(route.url, { waitUntil: 'networkidle' });
      await page.waitForTimeout(800);

      if (theme.includes('DARK')) {
        await page.evaluate(() => document.documentElement.classList.add('dark'));
      } else {
        await page.evaluate(() => document.documentElement.classList.remove('dark'));
      }
      await page.waitForTimeout(400);

      // Audit visible text elements contrast against effective background
      const stats = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, p, span, button, a, label, input, textarea'));
        let totalChecked = 0;
        let passAA = 0;
        let lowContrastElements = [];

        const getLuminance = (r, g, b) => {
          const a = [r, g, b].map((v) => {
            v /= 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
          });
          return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
        };

        const parseRgb = (str) => {
          const m = str.match(/\d+/g);
          if (!m || m.length < 3) return null;
          return [parseInt(m[0]), parseInt(m[1]), parseInt(m[2])];
        };

        elements.forEach((el) => {
          const style = window.getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return;
          const text = el.innerText?.trim();
          if (!text || text.length === 0) return;

          const textColor = parseRgb(style.color);
          if (!textColor) return;

          // Find background color traversing upwards if transparent
          let curr = el;
          let bgColor = null;
          while (curr && curr !== document.documentElement) {
            const bgStyle = window.getComputedStyle(curr);
            const parsed = parseRgb(bgStyle.backgroundColor);
            if (parsed && !(parsed[0] === 0 && parsed[1] === 0 && parsed[2] === 0 && bgStyle.backgroundColor.includes('0)'))) {
              bgColor = parsed;
              break;
            }
            curr = curr.parentElement;
          }

          if (!bgColor) {
            bgColor = document.documentElement.classList.contains('dark') ? [10, 10, 10] : [244, 240, 230];
          }

          const lum1 = getLuminance(textColor[0], textColor[1], textColor[2]);
          const lum2 = getLuminance(bgColor[0], bgColor[1], bgColor[2]);
          const lighter = Math.max(lum1, lum2);
          const darker = Math.min(lum1, lum2);
          const ratio = (lighter + 0.05) / (darker + 0.05);

          totalChecked++;
          const minRatio = parseFloat(style.fontSize) >= 18 || (parseFloat(style.fontSize) >= 14 && style.fontWeight >= '700') ? 3.0 : 4.5;
          if (ratio >= minRatio) {
            passAA++;
          } else {
            if (lowContrastElements.length < 3) {
              lowContrastElements.push({
                tag: el.tagName,
                text: text.slice(0, 30),
                ratio: ratio.toFixed(2),
                required: minRatio,
              });
            }
          }
        });

        return { totalChecked, passAA, lowContrastElements };
      });

      const passRate = stats.totalChecked > 0 ? Math.round((stats.passAA / stats.totalChecked) * 100) : 100;
      console.log(
        `✓ ${route.name.padEnd(30)} | Checked: ${String(stats.totalChecked).padStart(3)} | WCAG AA Pass: ${String(passRate).padStart(3)}% (${stats.passAA}/${stats.totalChecked})`
      );
      if (stats.lowContrastElements.length > 0) {
        console.log('   Violations:', JSON.stringify(stats.lowContrastElements));
      }
    }
  }

  await browser.close();
  console.log('\n====================================================');
  console.log('🎉 WCAG CONTRAST AND ACCESSIBILITY AUDIT COMPLETE!');
  console.log('====================================================');
}

checkContrastAndAudit().catch((err) => {
  console.error('Audit failed:', err);
  process.exit(1);
});
