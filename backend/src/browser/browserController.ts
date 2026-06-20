import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { config } from '../utils/config';
import fs from 'fs';
import path from 'path';

export class BrowserController {
  browser: Browser | null = null;
  context: BrowserContext | null = null;
  page: Page | null = null;
  private runId: string;

  constructor(runId: string) {
    this.runId = runId;
  }

  async launch(): Promise<{ success: boolean; error?: string }> {
    if (this.browser) {
      return { success: true }; // Already launched
    }
    try {
      this.browser = await chromium.launch({ 
        headless: config.headlessBrowser,
        args: ['--start-fullscreen']
      });
      this.context = await this.browser.newContext({
        viewport: null
      });
      
      const cursorScript = `
        document.addEventListener('DOMContentLoaded', () => {
          const box = document.createElement('div');
          box.style.pointerEvents = 'none';
          box.style.position = 'fixed';
          box.style.top = '0';
          box.style.left = '0';
          box.style.width = '20px';
          box.style.height = '20px';
          box.style.background = 'rgba(255, 0, 0, 0.5)';
          box.style.border = '2px solid white';
          box.style.borderRadius = '50%';
          box.style.zIndex = '9999999999';
          box.style.transform = 'translate(-50%, -50%)';
          box.style.transition = 'transform 0.1s ease-out';
          document.body.appendChild(box);

          document.addEventListener('mousemove', (e) => {
            box.style.left = e.clientX + 'px';
            box.style.top = e.clientY + 'px';
          }, true);

          document.addEventListener('mousedown', () => {
            box.style.transform = 'translate(-50%, -50%) scale(0.7)';
            box.style.background = 'rgba(255, 0, 0, 0.9)';
          }, true);

          document.addEventListener('mouseup', () => {
            box.style.transform = 'translate(-50%, -50%) scale(1)';
            box.style.background = 'rgba(255, 0, 0, 0.5)';
          }, true);
        });
      `;
      
      await this.context.addInitScript(cursorScript);
      
      this.page = await this.context.newPage();
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async takeScreenshot(step: number): Promise<{ success: boolean; data?: string; error?: string }> {
    if (!this.page) {
      return { success: false, error: 'Browser not launched' };
    }
    try {
      const screenshotsDir = path.resolve(__dirname, '../../screenshots', this.runId);
      if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true });
      }
      const filename = `step_${step}.jpeg`;
      const filepath = path.join(screenshotsDir, filename);
      await this.page.screenshot({ path: filepath, type: 'jpeg', quality: 50 });
      // Return a relative path or URL for the frontend to consume
      return { success: true, data: `/screenshots/${this.runId}/${filename}` };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
      this.page = null;
    }
  }
}
