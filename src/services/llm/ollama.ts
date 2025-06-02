import { Ollama } from 'ollama';
import type { ListResponse, Message, Tool } from 'ollama';
import { config } from '../../config';

const ollama = new Ollama({ host: config.OLLAMA_HOST });

const defaultModel = 'qwen3:0.6b-q8_0';

const validBase64Image = (imageString: string) => {
  return /^data:image\/(png|jpeg|jpg|gif|webp);base64,[A-Za-z0-9+/=]+$/.test(
    imageString,
  );
};

export const listModels = async (): Promise<ListResponse> => {
  return ollama.list();
};

export const generate = async ({
  prompt,
  model = defaultModel,
  suffix,
  images,
  think = false,
  format = 'json',
  stream,
  keep_alive = '5m',
}: {
  prompt: string;
  model?: string;
  suffix?: string;
  images?: Uint8Array[] | string[] | string;
  think?: boolean;
  format?: string | object;
  stream?: boolean;
  keep_alive?: string | number;
}) => {
  if (typeof images === 'string') {
    images = [images];
  }
  if (images && !Array.isArray(images)) {
    throw new Error('Images must be an array of Uint8Array or string');
  }
  if (images && images.length > 0) {
    for (const image of images) {
      if (typeof image === 'string' && !validBase64Image(image)) {
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
