/**
 * PuterAgent Studio - Autonomous Agent Engine
 * Implements a robust multi-step ReAct & Function-Calling Autonomous Loop.
 * Handles tool dispatch, execution tracking, error recovery, step guards, and cancellation.
 */

class AgentEngine {
  constructor() {
    this.isRunning = false;
    this.abortController = null;
    this.maxSteps = 5;
    this.currentStep = 0;
    this.activeTools = [
      'local_get_workspace',
      'local_read_file',
      'local_write_file',
      'local_edit_file',
      'local_list_directory',
      'local_create_directory',
      'local_run_command',
      'local_file_exists',
      'local_delete_path',
      'web_search',
      'fetch_web_content',
      'run_javascript',
      'render_chart',
      'generate_image',
      'puter_fs_write',
      'puter_fs_read',
      'puter_fs_list',
      'puter_kv_store',
      'puter_kv_retrieve',
      'text_to_speech'
    ];
  }

  /**
   * Set list of active tools
   */
  setActiveTools(toolNames) {
    this.activeTools = toolNames;
  }

  /**
   * Set maximum execution steps for the autonomous loop
   */
  setMaxSteps(steps) {
    this.maxSteps = Math.max(1, Math.min(10, steps));
  }

  /**
   * Stop the currently running agent loop
   */
  abort() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.isRunning = false;
  }

  /**
   * Main entry: Run the autonomous agent loop
   */
  async run({
    messages,
    model = 'qwen/qwen-2.5-72b-instruct',
    systemPrompt = '',
    callbacks = {}
  }) {
    if (this.isRunning) {
      throw new Error('An agent session is already running. Please stop it first.');
    }

    this.isRunning = true;
    this.abortController = new AbortController();
    this.currentStep = 0;
    const startTime = performance.now();
    const stepsHistory = [];

    const {
      onStepStart = () => {},
      onThought = () => {},
      onToolStart = () => {},
      onToolEnd = () => {},
      onStreamToken = () => {},
      onComplete = () => {},
      onError = () => {}
    } = callbacks;

    try {
      // Build tool schemas and system instructions
      const toolSchemas = window.getOpenAIToolSchemas(this.activeTools);
      const reactInstructions = window.getReActSystemPrompt(this.activeTools);

      const baseSystemPrompt = systemPrompt || `
You are PuterAgent, an expert autonomous AI agent operating with Puter.js.
You have access to web search, code sandbox execution, charts, files, Puter Cloud Storage, image generation, speech, and local computer access when running in Desktop mode.
Break complex tasks down logically. Think carefully before taking action.
When asked to perform tasks (like creating code, inspecting files, fixing bugs, or executing commands), do not just output brief text—provide full, working, high-quality implementations and verify results.
When you finish, provide a clear, comprehensive final answer with rich markdown and complete code.
`.trim();

      let computerContext = '';
      if (window.desktopAPI) {
        const ws = window.currentWorkspacePath || 'Current Workspace';
        computerContext = `\n\n[LOCAL COMPUTER ACCESS ACTIVE]\n- Current Local Workspace Directory: "${ws}"\n- You have direct access to the user's hard drive and shell.\n- Use local_read_file to inspect files, local_write_file to create/write files, local_edit_file to modify code, local_list_directory to explore folders, and local_run_command to execute terminal commands (git, npm, python, tests).\n- Relative file paths will automatically resolve to "${ws}".`;
      }

      const combinedSystemPrompt = `${baseSystemPrompt}${computerContext}\n\n${reactInstructions}`;

      // Working conversation memory for the multi-step loop
      const workingMessages = [
        { role: 'system', content: combinedSystemPrompt },
        ...messages
      ];

      let isFinished = false;
      let finalAnswer = '';

      while (!isFinished && this.currentStep < this.maxSteps) {
        if (this.abortController && this.abortController.signal.aborted) {
          throw new Error('Agent execution was stopped by the user.');
        }

        this.currentStep++;
        onStepStart({
          stepNumber: this.currentStep,
          maxSteps: this.maxSteps,
          model
        });

        // 1. Send request to Puter AI with robust fallback
        let aiResponse;
        try {
          // Attempt native tool-calling first
          aiResponse = await window.puterClient.chat(workingMessages, {
            model,
            tools: toolSchemas.length > 0 ? toolSchemas : undefined
          });
        } catch (chatError) {
          console.warn('[AgentEngine] Chat call error:', chatError);

          // If the model rejects the `tools` parameter, retry with pure text ReAct prompt
          if (chatError.message?.includes('tools') || chatError.message?.includes('functions')) {
            console.warn('[AgentEngine] Model does not support native tools, falling back to ReAct prompt mode');
            aiResponse = await window.puterClient.chat(workingMessages, { model });
          } else if (chatError.message?.includes('aborted') || chatError.name === 'AbortError') {
            const isSignedIn = await window.puterClient.checkAuth();
            if (!isSignedIn) {
              throw new Error('AUTH_REQUIRED');
            }
            console.log('[AgentEngine] Retrying with default Puter auto-route...');
            aiResponse = await window.puterClient.chat(workingMessages, { model: 'default' });
          } else if (chatError.message?.includes('unavailable') || chatError.message?.includes('500') || chatError.message?.includes('404')) {
            console.warn('[AgentEngine] Model provider unavailable, automatically retrying with default free model...');
            try {
              aiResponse = await window.puterClient.chat(workingMessages, { model: 'default' });
            } catch (retryErr) {
              aiResponse = await window.puterClient.chat(workingMessages, { model: 'gpt-4o-mini' });
            }
          } else {
            throw chatError;
          }
        }

        // Normalize response object
        let responseContent = '';
        let toolCalls = [];

        if (typeof aiResponse === 'string') {
          responseContent = aiResponse;
        } else if (aiResponse?.message) {
          responseContent = aiResponse.message.content || '';
          toolCalls = aiResponse.message.tool_calls || [];
        } else if (aiResponse?.text) {
          responseContent = aiResponse.text;
        }

        // 2. Check for OpenAI-style Tool Calls
        if (toolCalls && toolCalls.length > 0) {
          workingMessages.push({
            role: 'assistant',
            content: responseContent || null,
            tool_calls: toolCalls
          });

          for (const call of toolCalls) {
            const toolName = call.function.name;
            let args = {};
            try {
              args = JSON.parse(call.function.arguments || '{}');
            } catch {
              args = { input: call.function.arguments };
            }

            const stepRecord = await this.executeToolWithTracking({
              toolCallId: call.id,
              toolName,
              args,
              onToolStart,
              onToolEnd
            });

            stepsHistory.push(stepRecord);

            // Append tool execution result into memory
            workingMessages.push({
              role: 'tool',
              tool_call_id: call.id,
              content: stepRecord.resultString
            });
          }
          continue;
        }

        // 3. Fallback: Parse ReAct text pattern (Action: tool_name, Action Input: {...})
        const reactParsed = this.parseReActOutput(responseContent);

        if (reactParsed.thought) {
          onThought({ thoughtText: reactParsed.thought });
        }

        if (reactParsed.action && window.AGENT_TOOLS[reactParsed.action]) {
          const toolName = reactParsed.action;
          const args = reactParsed.actionInput;
          const toolCallId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

          workingMessages.push({
            role: 'assistant',
            content: responseContent
          });

          const stepRecord = await this.executeToolWithTracking({
            toolCallId,
            toolName,
            args,
            onToolStart,
            onToolEnd
          });

          stepsHistory.push(stepRecord);

          workingMessages.push({
            role: 'user',
            content: `Observation: ${stepRecord.resultString}\n\nPlease proceed to the next step or provide Final Answer.`
          });
          continue;
        }

        // 4. No tool was called -> We have the final answer!
        isFinished = true;
        finalAnswer = reactParsed.finalAnswer || responseContent;
      }

      // If loop exited due to max steps reached
      if (!isFinished && !finalAnswer) {
        finalAnswer = `Agent reached maximum step limit (${this.maxSteps} steps). Summary of actions taken:\n\n` +
          stepsHistory.map(s => `- **${s.toolName}**: ${s.status}`).join('\n');
      }

      const totalDurationMs = Math.round(performance.now() - startTime);

      onComplete({
        finalResponse: finalAnswer,
        stepsExecuted: this.currentStep,
        stepsHistory,
        totalDurationMs
      });

      return {
        finalResponse: finalAnswer,
        stepsExecuted: this.currentStep,
        stepsHistory,
        totalDurationMs
      };
    } catch (err) {
      onError({ error: err.message || String(err) });
      throw err;
    } finally {
      this.isRunning = false;
      this.abortController = null;
    }
  }

  /**
   * Helper to execute a single tool with timing and event callbacks
   */
  async executeToolWithTracking({ toolCallId, toolName, args, onToolStart, onToolEnd }) {
    const tool = window.AGENT_TOOLS[toolName];
    const toolStartTime = performance.now();

    onToolStart({
      toolCallId,
      toolName,
      args
    });

    let resultString = '';
    let status = 'success';
    let parsedResult = null;

    if (!tool) {
      status = 'error';
      resultString = JSON.stringify({ error: `Tool "${toolName}" is not available.` });
    } else {
      try {
        resultString = await tool.execute(args);
        try {
          parsedResult = JSON.parse(resultString);
        } catch {
          parsedResult = resultString;
        }
      } catch (execErr) {
        status = 'error';
        resultString = JSON.stringify({ error: execErr.message || String(execErr) });
      }
    }

    const durationMs = Math.round(performance.now() - toolStartTime);

    onToolEnd({
      toolCallId,
      toolName,
      args,
      result: parsedResult || resultString,
      resultString,
      durationMs,
      status
    });

    return {
      toolCallId,
      toolName,
      args,
      result: parsedResult || resultString,
      resultString,
      durationMs,
      status
    };
  }

  /**
   * Parse ReAct output format (Thought, Action, Action Input, Final Answer)
   */
  parseReActOutput(text) {
    const result = {
      thought: null,
      action: null,
      actionInput: {},
      finalAnswer: null
    };

    if (!text) return result;

    // Thought match
    const thoughtMatch = text.match(/Thought:\s*([\s\S]*?)(?=Action:|Final Answer:|$)/i);
    if (thoughtMatch) {
      result.thought = thoughtMatch[1].trim();
    }

    // Action match
    const actionMatch = text.match(/Action:\s*([a-zA-Z0-9_-]+)/i);
    if (actionMatch) {
      result.action = actionMatch[1].trim();
    }

    // Action Input match
    const inputMatch = text.match(/Action Input:\s*([\s\S]*?)(?=Thought:|Action:|Observation:|Final Answer:|$)/i);
    if (inputMatch) {
      const rawInput = inputMatch[1].trim();
      try {
        result.actionInput = JSON.parse(rawInput);
      } catch {
        result.actionInput = { query: rawInput, code: rawInput, input: rawInput };
      }
    }

    // Final Answer match
    const finalMatch = text.match(/Final Answer:\s*([\s\S]*)$/i);
    if (finalMatch) {
      result.finalAnswer = finalMatch[1].trim();
    }

    return result;
  }
}

window.AgentEngine = AgentEngine;
window.agentEngine = new AgentEngine();
