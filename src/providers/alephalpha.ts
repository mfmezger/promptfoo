import logger from '../logger';
import { fetchWithCache } from '../cache';
import { REQUEST_TIMEOUT_MS, parseChatPrompt } from './shared';

import type { ApiProvider, ProviderEmbeddingResponse, ProviderResponse } from '../types.js';

interface AlephAlphaCompletionOptions {
  // From https://docs.aleph-alpha.com/api/complete/
  apikey?: string;
  model?: string;
  prompt?: string;
  temperature?: number;
  top_k?: number;
  top_p?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  repetition_penalties_include_prompt?: boolean;
  repetition_penalties_include_completion?: boolean;
  use_multiplicative_presence_penalty?: boolean;
  use_multiplicative_frequency_penalty?: boolean;
  use_multiplicative_sequence_penalty?: boolean;
  penalty_bias?: string;
  penalty_exceptions?: string[];
  penalty_exceptions_include_stop_sequences?: boolean;
  best_of?: number;
  logit_bias?: string;
  n?: number;
  log_probs?: boolean;
  stop_sequences?: string[];
  tokens?: boolean;
  raw_completion?: boolean;
  disable_optimization?: boolean;
  completion_bias_inclusion?: string[];
  completion_bias_inclusion_first_token_only?: boolean;
  contextual_control_threshold?: number;
  control_log_additive?: boolean;
}

export class AlephAlphaCompletionProvider implements ApiProvider {
  modelName: string;
  apiKey?: string;
  config: AlephAlphaCompletionOptions;

  constructor(modelName: string, options: { id?: string; config?: AlephAlphaCompletionOptions } = {}) {
    const { id, config } = options;
    this.modelName = modelName;
    this.id = id ? () => id : this.id;
    this.config = config || {};
  }

  id(): string {
    return `alephalpha:completion:${this.modelName}`;
  }

  toString(): string {
    return `[AlephAlpha Completion Provider ${this.modelName}]`;
  }

  async callApi(prompt: string): Promise<ProviderResponse> {

    const params = {
      model: this.modelName,
      prompt,
      options: this.config,
    };

    logger.debug(`Calling AlephAlpha API: ${JSON.stringify(params)}`);
    let response;
    try {
      response = await fetchWithCache(
        `${process.env.AlephAlpha_BASE_URL || 'https://api.aleph-alpha.com'}/complete`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + this.config.apikey,
          },
          body: JSON.stringify(params),
        },
        REQUEST_TIMEOUT_MS,
        'text',
      );
    } catch (err) {
      return {
        error: `API call error: ${String(err)}. Output:\n${response?.data}`,
      };
    }
    logger.debug(`\tAlephAlpha generate API response: ${response.data}`);
    if (response.data.error) {
      return {
        error: `AlephAlpha error: ${response.data.error}`,
      };
    }

    try {
      return {
        output: response.data.content,
      };
    } catch (err) {
      return {
        error: `API response error: ${String(err)}: ${JSON.stringify(response.data)}`,
      };
    }
  }
}

