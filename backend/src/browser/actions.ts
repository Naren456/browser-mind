import { Page } from 'playwright';

export class BrowserActions {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async navigate_to_url(url: string): Promise<{ success: boolean; error?: string; html?: string }> {
    try {
      await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
      // Extract simplified HTML to send back to the text model
      const html = await this.page.evaluate(() => {
        const clone = document.body.cloneNode(true) as HTMLElement;
        clone.querySelectorAll('script, style, svg').forEach(e => e.remove());
        // Return up to 20,000 characters to avoid blowing up the context window
        return clone.innerHTML.substring(0, 20000);
      });
      return { success: true, html };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async click_on_screen(x: number, y: number): Promise<{ success: boolean; error?: string }> {
    try {
      await this.page.mouse.click(x, y);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async double_click(x: number, y: number): Promise<{ success: boolean; error?: string }> {
    try {
      await this.page.mouse.dblclick(x, y);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async send_keys(selector: string | null, text: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (selector) {
        const locator = this.page.locator(selector).first();
        await locator.waitFor({ state: 'visible', timeout: 5000 });
        await locator.click();
        await this.page.keyboard.press('Control+a');
        await this.page.keyboard.press('Backspace');
        await this.page.keyboard.type(text);
      } else {
        // Type into whatever is focused
        await this.page.keyboard.type(text);
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async scroll(direction: 'up' | 'down', amount: number = 500): Promise<{ success: boolean; error?: string }> {
    try {
      const deltaY = direction === 'down' ? amount : -amount;
      await this.page.mouse.wheel(0, deltaY);
      // Wait a tiny bit for any scroll-triggered animations
      await this.page.waitForTimeout(500); 
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async click_element(selector: string): Promise<{ success: boolean; error?: string }> {
    try {
      const locator = this.page.locator(selector).first();
      await locator.waitFor({ state: 'visible', timeout: 5000 });
      await locator.click();
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async press_key(key: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.page.keyboard.press(key);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async hover_element(selector: string): Promise<{ success: boolean; error?: string }> {
    try {
      const locator = this.page.locator(selector).first();
      await locator.waitFor({ state: 'visible', timeout: 5000 });
      await locator.hover();
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async highlight_elements(): Promise<{ success: boolean; mapping?: Record<number, any>; error?: string }> {
    try {
      const mapping = await this.page.evaluate(() => {
        document.querySelectorAll('.agent-highlight-marker').forEach(e => e.remove());
        let idCounter = 1;
        const mapping: Record<number, any> = {};
        const elements = document.querySelectorAll('a, button, input, textarea, select, [role="button"], [role="link"], [tabindex]:not([tabindex="-1"])');
        
        elements.forEach(el => {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            const id = idCounter++;
            mapping[id] = { tag: el.tagName.toLowerCase(), type: (el as HTMLInputElement).type, hint: (el as HTMLInputElement).placeholder || el.textContent?.substring(0, 30)?.trim() };
            el.setAttribute('data-agent-id', id.toString());
          }
        });
        return mapping;
      });
      return { success: true, mapping };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async interact_with_id(id: number, action: 'click' | 'type', text?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const locator = this.page.locator(`[data-agent-id="${id}"]`).first();
      await locator.waitFor({ state: 'visible', timeout: 5000 });
      await locator.scrollIntoViewIfNeeded();
      await locator.click();
      if (action === 'type' && text) {
        await this.page.keyboard.press('Control+a');
        await this.page.keyboard.press('Backspace');
        await this.page.keyboard.type(text);
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async get_current_url(): Promise<{ success: boolean; data?: string; error?: string }> {
    try {
      const url = this.page.url();
      return { success: true, data: url };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async go_back(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.page.goBack({ waitUntil: 'domcontentloaded' });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async refresh_page(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.page.reload({ waitUntil: 'domcontentloaded' });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async evaluate_script(script: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const result = await this.page.evaluate(script);
      return { success: true, data: result };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async download_pdf_from_url(): Promise<{ success: boolean; data?: string; error?: string }> {
    try {
      const url = this.page.url();
      if (!url.toLowerCase().endsWith('.pdf')) {
        return { success: false, error: 'Current page does not appear to be a PDF (URL must end in .pdf)' };
      }
      const response = await this.page.request.get(url);
      const buffer = await response.body();
      
      const fs = require('fs');
      const path = require('path');
      
      // In this context we don't have runId easily available in actions, 
      // so we'll just save it to downloads/ directory directly.
      const downloadsDir = path.resolve(__dirname, '../../downloads');
      if (!fs.existsSync(downloadsDir)) {
        fs.mkdirSync(downloadsDir, { recursive: true });
      }
      const filename = path.basename(new URL(url).pathname) || 'download.pdf';
      const downloadPath = path.join(downloadsDir, filename);
      fs.writeFileSync(downloadPath, buffer);
      
      return { success: true, data: `PDF downloaded successfully to ${downloadPath}` };
    } catch (e: any) {
      return { success: false, error: `Failed to download PDF: ${e.message}` };
    }
  }
}
