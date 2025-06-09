import { Ollama } from 'ollama';
import type { ListResponse, Message, Tool } from 'ollama';
import { z } from 'zod';
import { config } from '../../config';

const ollama = new Ollama({ host: config.OLLAMA_HOST });

const defaultModel = 'qwen3:0.6b-q8_0';

const validateAndParseBase64 = z.string().refine((value) => {
  // Check if the string is a valid base64 encoded string
  try {
    return btoa(atob(value)) === value; // This will throw if the string is not valid base64
  } catch {
    return false;
  }
});

export const listModels = async (): Promise<ListResponse> => {
  return ollama.list();
};

export const generate = async ({
  prompt,
  model = defaultModel,
  suffix,
  images,
  think = false,
  format,
  stream,
  keep_alive = '5m',
  temperature = 1,
}: {
  prompt: string;
  model?: string;
  suffix?: string;
  images?: Uint8Array[] | string[] | string;
  think?: boolean;
  format?: string | object;
  stream?: boolean;
  keep_alive?: string | number;
  temperature?: number;
}) => {
  if (typeof images === 'string') {
    images = [images];
  }
  if (images && !Array.isArray(images)) {
    throw new Error('Images must be an array of Uint8Array or string');
  }
  if (images && images.length > 0) {
    for (const image of images) {
      const parsedImage = validateAndParseBase64.safeParse(image);
      if (!parsedImage.success) {
        throw new Error('Invalid base64 image string provided');
      }
    }
  }

  return ollama.generate({
    prompt,
    model,
    suffix,
    images,
    think,
    format,
    stream: stream ? undefined : false,
    keep_alive,
    options: {
      temperature,
    },
  });
};

export const chat = async ({
  messages,
  model = defaultModel,
  tools = [],
  think = false,
}: {
  messages: string[] | string;
  model?: string;
  tools?: Tool[];
  think?: boolean;
}) => {
  const _messages: Message[] | undefined = [];
  if (Array.isArray(messages)) {
    for (const message of messages) {
      _messages.push({
        role: 'user',
        content: message,
      });
    }
  } else {
    _messages.push({
      role: 'user',
      content: messages,
    });
  }
  return ollama.chat({
    model,
    messages: _messages.length > 0 ? _messages : undefined,
    tools,
    think,
  });
};
