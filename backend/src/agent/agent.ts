import OpenAI from 'openai';
import { config } from '../utils/config';
import { Logger } from '../utils/logger';
import { toolDefinitions } from '../tools/toolDefinitions';
import { ToolExecutor } from '../tools/toolExecutor';
import { BrowserController } from '../browser/browserController';
import { BrowserActions } from '../browser/actions';
import { systemPrompt } from './systemPrompt';

export async function runAgent(
  runId: string,
  task: string,
  url: string | undefined,
  emit: (event: any) => void
) {
  const logger = new Logger(runId);
  const browserController = new BrowserController(runId);
  const toolExecutor = new ToolExecutor(browserController);

  const openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: config.openRouterApiKey,
    defaultHeaders: {
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "BrowserMind Agent",
    }
  });

  let initialContext = '';
  try {
    if (url) {
      console.log(`[Agent] Pre-initializing browser and navigating to ${url}...`);
      await browserController.launch();
      if (browserController.page) {
        const actions = new BrowserActions(browserController.page);
        await actions.navigate_to_url(url);
        
        const scRes = await browserController.takeScreenshot(0);
        let initialScreenshotUrl = scRes.success ? scRes.data : undefined;
        if (initialScreenshotUrl) {
          emit({
            type: 'step',
            tool: 'navigate_to_url',
            args: { url },
            result: { success: true },
            screenshotUrl: initialScreenshotUrl,
            timestamp: new Date().toISOString()
          });
        }

        const mapRes = await actions.highlight_elements();
        if (mapRes.success) {
          initialContext = `\n\nInitial Page Structure Mapping (ID -> Element):\n\`\`\`json\n${JSON.stringify(mapRes.mapping)}\n\`\`\``;
        }
      }
    } else {
      console.log(`[Agent] Launching blank browser for autonomous navigation...`);
      await browserController.launch();
    }
  } catch (err) {
    console.error('[Agent] Pre-initialization failed:', err);
  }

  const messages: any[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Task: ${task}\nStart URL: ${url || 'None specified'}${initialContext}` }
  ];

  try {
    for (let step = 1; step <= config.maxSteps; step++) {
      toolExecutor.setStep(step);

      console.log(`[Agent] Calling main model for step ${step}...`);
      const response = await openai.chat.completions.create({
        model: config.modelId,
        messages: messages,
        tools: toolDefinitions,
        tool_choice: "auto",
      }, { timeout: 45000 });
      console.log(`[Agent] Main model responded for step ${step}.`);

      const message = response.choices[0].message;
      
      // Emit reasoning if there's any text content
      if (message.content) {
        const reasoningEvent = {
          type: 'reasoning',
          message: message.content,
          timestamp: new Date().toISOString()
        };
        emit(reasoningEvent);
        logger.logStep({ step, ...reasoningEvent });
      }

      messages.push(message);

      if (message.tool_calls && message.tool_calls.length > 0) {
        for (const toolCall of message.tool_calls) {
          const toolName = toolCall.function?.name;
          console.log(`[Step ${step}] ${toolName || 'undefined_tool'} ${toolCall.function?.arguments || ''}`);
          
          let args = {};
          let result: any;
          
          if (!toolName) {
            result = { success: false, error: "You provided an undefined tool. If you are finished, stop calling tools and just output 'TASK_COMPLETED'." };
          } else {
            try {
              args = JSON.parse(toolCall.function.arguments || '{}');
              result = await toolExecutor.execute(toolName, args);
            } catch (err: any) {
              result = { success: false, error: 'Invalid tool arguments JSON: ' + err.message };
            }
          }
          
          let screenshotUrl;
          let toolResultContent: any = JSON.stringify(result);

          if (toolName && toolName !== 'take_screenshot' && toolName !== 'open_browser' && toolName !== 'extract_html' && toolName !== 'analyze_vision') {
             const scRes = await browserController.takeScreenshot(step);
             if (scRes.success) {
               screenshotUrl = scRes.data;
             }
          } else if (toolName === 'analyze_page_structure' && result.success) {
             screenshotUrl = result.data;
             const mapping = result.mapping;
             console.log(`[Agent] Returning full-page DOM mapping to main model...`);
             toolResultContent = JSON.stringify({
                 success: true,
                 message: "Page structure mapped successfully. Use the provided ID mapping to find the correct element.",
                 data: screenshotUrl,
                 mapping: mapping
             });
          } else if (toolName === 'take_screenshot') {
             screenshotUrl = result.data;
          }

          const { mapping, ...sanitizedResult } = result;

          const stepEvent = {
            type: 'step',
            tool: toolName || 'unknown',
            args,
            result: sanitizedResult,
            screenshotUrl,
            timestamp: new Date().toISOString()
          };
          
          emit(stepEvent);
          logger.logStep({ step, ...stepEvent });

          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: toolResultContent
          });
        }
      } else {
        if (!message.content?.includes('TASK_COMPLETED')) {
          console.log(`[Step ${step}] Model did not invoke tools or output TASK_COMPLETED. Prompting for continuation.`);
          messages.push({
            role: 'user',
            content: "You didn't invoke any tools. If you are finished, output the exact string 'TASK_COMPLETED'. Otherwise, invoke a tool to continue."
          });
          emit({
            type: 'step',
            tool: 'system_prompt',
            args: { message: "Forced continuation prompt" },
            result: { success: true },
            timestamp: new Date().toISOString()
          });
          continue;
        }

        // No more tool calls AND message includes TASK_COMPLETED = task complete
        console.log(`[Agent] Task complete. Generating final Playwright script...`);
        let finalScript = '';
        try {
          const scriptResponse = await openai.chat.completions.create({
            model: config.modelId,
            messages: [
              ...messages,
              { role: 'user', content: 'Based on the successful actions taken in this conversation, write a complete, standalone Playwright script in TypeScript that reproduces this task from start to finish. Use the coordinates and selectors we found. Include imports and an async IIFE. Return ONLY the code.' }
            ]
          }, { timeout: 45000 });
          finalScript = scriptResponse.choices[0].message.content || '';
        } catch (scriptErr) {
           console.error("Failed to generate script:", scriptErr);
        }

        const doneEvent = { 
          type: 'done', 
          message: (message.content || 'Task completed.') + (finalScript ? '\n\n### Generated Playwright Script\n```typescript\n' + finalScript + '\n```' : ''), 
          timestamp: new Date().toISOString() 
        };
        emit(doneEvent);
        logger.logStep({ step, ...doneEvent });
        // await browserController.close();
        return;
      }
    }

    // Max steps reached
    const errorEvent = { type: 'error', message: 'Max steps reached without completion', timestamp: new Date().toISOString() };
    emit(errorEvent);
    logger.logStep({ step: config.maxSteps + 1, ...errorEvent });

  } catch (error: any) {
    const errorEvent = { type: 'error', message: `Uncaught agent error: ${error.message}`, timestamp: new Date().toISOString() };
    emit(errorEvent);
    logger.logError('Agent loop failed', error);
  } finally {
    // await browserController.close();
  }
}
