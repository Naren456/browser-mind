export const toolDefinitions: any[] = [
  {
    type: "function",
    function: {
      name: "navigate_to_url",
      description: "Navigates the active page to the given URL.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string" }
        },
        required: ["url"],
        additionalProperties: false,
      }
    }
  },
  {
    type: "function",
    function: {
      name: "take_screenshot",
      description: "Captures the current viewport and returns the path to the screenshot.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      }
    }
  },
  {
    type: "function",
    function: {
      name: "click_on_screen",
      description: "Clicks at the given viewport coordinates.",
      parameters: {
        type: "object",
        properties: {
          x: { type: "number" },
          y: { type: "number" }
        },
        required: ["x", "y"],
        additionalProperties: false,
      }
    }
  },
  {
    type: "function",
    function: {
      name: "send_keys",
      description: "Types text into an element. If a selector is provided, it types into that element via Playwright locator; if null, it types into whatever is currently focused.",
      parameters: {
        type: "object",
        properties: {
          selector: { type: ["string", "null"] },
          text: { type: "string" }
        },
        required: ["selector", "text"],
        additionalProperties: false,
      }
    }
  },
  {
    type: "function",
    function: {
      name: "scroll",
      description: "Scrolls the page by the given pixel amount.",
      parameters: {
        type: "object",
        properties: {
          direction: { type: "string", enum: ["up", "down"] },
          amount: { type: "number", description: "Default is 500" }
        },
        required: ["direction"],
        additionalProperties: false,
      }
    }
  },
  {
    type: "function",
    function: {
      name: "double_click",
      description: "Double-clicks at the given coordinates.",
      parameters: {
        type: "object",
        properties: {
          x: { type: "number" },
          y: { type: "number" }
        },
        required: ["x", "y"],
        additionalProperties: false,
      }
    }
  },

  {
    type: "function",
    function: {
      name: "click_element",
      description: "Clicks on an element identified by a Playwright selector (e.g. css, text=, etc).",
      parameters: {
        type: "object",
        properties: {
          selector: { type: "string" }
        },
        required: ["selector"],
        additionalProperties: false,
      }
    }
  },
  {
    type: "function",
    function: {
      name: "press_key",
      description: "Presses a specific keyboard key (e.g. 'Enter', 'Tab', 'Escape', 'ArrowDown').",
      parameters: {
        type: "object",
        properties: {
          key: { type: "string" }
        },
        required: ["key"],
        additionalProperties: false,
      }
    }
  },
  {
    type: "function",
    function: {
      name: "hover_element",
      description: "Hovers the mouse over an element identified by a Playwright selector.",
      parameters: {
        type: "object",
        properties: {
          selector: { type: "string" }
        },
        required: ["selector"],
        additionalProperties: false,
      }
    }
  },
  {
    type: "function",
    function: {
      name: "analyze_page_structure",
      description: "Extracts ALL interactive elements on the entire page and returns a JSON dictionary mapping a numerical ID to the element's metadata. ALWAYS use this if you do not know the exact CSS selector for an element.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      }
    }
  },
  {
    type: "function",
    function: {
      name: "interact_with_id",
      description: "Use this tool to interact with an element by its numerical ID (obtained from analyze_page_structure).",
      parameters: {
        type: "object",
        properties: {
          id: { type: "number", description: "The numerical ID of the element." },
          action: { type: "string", enum: ["click", "type"], description: "The action to perform." },
          text: { type: "string", description: "The text to type if action is 'type'." }
        },
        required: ["id", "action"],
        additionalProperties: false,
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_current_url",
      description: "Returns the current URL of the page.",
      parameters: { type: "object", properties: {}, additionalProperties: false }
    }
  },
  {
    type: "function",
    function: {
      name: "go_back",
      description: "Navigates back to the previous page in history.",
      parameters: { type: "object", properties: {}, additionalProperties: false }
    }
  },
  {
    type: "function",
    function: {
      name: "refresh_page",
      description: "Reloads the current page.",
      parameters: { type: "object", properties: {}, additionalProperties: false }
    }
  },
  {
    type: "function",
    function: {
      name: "evaluate_script",
      description: "Evaluates arbitrary Javascript on the page and returns the result.",
      parameters: {
        type: "object",
        properties: {
          script: { type: "string", description: "The Javascript code to evaluate." }
        },
        required: ["script"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "download_pdf_from_url",
      description: "Downloads the PDF currently being viewed in the browser directly to disk. Use this when the browser has navigated to a .pdf URL and the internal PDF viewer is open.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false
      }
    }
  }
];
