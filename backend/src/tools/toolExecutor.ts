import { BrowserController } from '../browser/browserController';
import { BrowserActions } from '../browser/actions';

export class ToolExecutor {
  private browserController: BrowserController;
  private actions: BrowserActions | null = null;
  private currentStep: number = 0;

  constructor(browserController: BrowserController) {
    this.browserController = browserController;
  }

  setStep(step: number) {
    this.currentStep = step;
  }

  async execute(name: string, args: any): Promise<{ success: boolean; data?: any; mapping?: any; error?: string }> {
    if (name === 'take_screenshot') {
      return await this.browserController.takeScreenshot(this.currentStep);
    }

    if (!this.actions) {
      if (!this.browserController.page) {
        return { success: false, error: 'Browser page is not initialized.' };
      }
      this.actions = new BrowserActions(this.browserController.page);
    }


    switch (name) {
      case 'navigate_to_url':
        return await this.actions.navigate_to_url(args.url);
      case 'click_on_screen':
        return await this.actions.click_on_screen(args.x, args.y);
      case 'send_keys':
        return await this.actions.send_keys(args.selector, args.text);
      case 'scroll':
        return await this.actions.scroll(args.direction, args.amount);
      case 'double_click':
        return await this.actions.double_click(args.x, args.y);
      case 'click_element':
        return await this.actions.click_element(args.selector);
      case 'hover_element':
        return await this.actions.hover_element(args.selector);
      case 'press_key':
        return await this.actions.press_key(args.key);
      case 'analyze_page_structure':
        const mapRes = await this.actions.highlight_elements();
        const scRes = await this.browserController.takeScreenshot(this.currentStep);
        return { success: scRes.success, data: scRes.data, mapping: mapRes.mapping };
      case 'interact_with_id':
        return await this.actions.interact_with_id(args.id, args.action, args.text);
      case 'get_current_url':
        return await this.actions.get_current_url();
      case 'go_back':
        return await this.actions.go_back();
      case 'refresh_page':
        return await this.actions.refresh_page();
      case 'evaluate_script':
        return await this.actions.evaluate_script(args.script);
      case 'download_pdf_from_url':
        return await this.actions.download_pdf_from_url();
      default:
        return { success: false, error: `Unknown tool: ${name}` };
    }
  }
}
