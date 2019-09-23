import { Client, MessageEvent, validateSignature } from "@line/bot-sdk";
import * as Types from "@line/bot-sdk/dist/types";
import { EventEmitter } from "events";
import { StrictEventEmitter } from "strict-event-emitter-types";
import fetch, { Response } from "node-fetch";

type LINEMessageEvent =  StrictEventEmitter<EventEmitter, MessageTypes>;
export declare type RecievedData = {
  contentType: string | null,
  stream: NodeJS.ReadableStream
}

export declare type EventHandleOption = {
  signature?: string,
  downloadData?: boolean,
}

class MessageContext {
  private event: MessageEvent;
  private handler: LINEBotMessageHandler;
  public constructor(event: MessageEvent, handler: LINEBotMessageHandler) {
    this.event = event;
    this.handler = handler;
  };
  public getEvent() : MessageEvent {
    return this.event;
  }
  public getClient() : Client {
    return this.handler.getClient();
  }
  public replyMessage( messages: Types.Message | Types.Message[], notificationDisabled?: boolean): Promise<Types.MessageAPIResponseBase> {
    return this.handler.getClient().replyMessage(this.event.replyToken, messages, notificationDisabled);
  }
  public pushMessage( messages: Types.Message | Types.Message[], notificationDisabled?: boolean): Promise<Types.MessageAPIResponseBase> {
    const to: string = this.event.source.type === 'room' ? this.event.source.roomId : (this.event.source.type === 'group' ? this.event.source.groupId : this.event.source.userId);
    return this.handler.getClient().pushMessage(to, messages, notificationDisabled);
  }
}
interface MessageTypes {
  text: (messageContext:MessageContext) => void;
  image: (messageContext:MessageContext, data?:RecievedData) => void;
  video: (messageContext:MessageContext, data?:RecievedData) => void;
  audio: (messageContext:MessageContext, data?:RecievedData) => void;
  file: (messageContext:MessageContext, data?:RecievedData) => void;
  location: (messageContext:MessageContext, ) => void;
  sticker: (messageContext:MessageContext) => void;
  invalid: (webhookRequestBody:String) => void;
  other: (messageContext:MessageContext) => void;
}

class LINEBotMessageHandler extends (EventEmitter as { new(): LINEMessageEvent }){
  private config: Types.ClientConfig;
  private rawClient: Client;
  constructor (config: Types.ClientConfig) {
    super();
    this.config = config;
    this.rawClient = new Client(this.config);
  };
  public getClient() : Client {
    return this.rawClient;
  }
  public setRecievedMessage(webhookRequestBodyString: string, option?: EventHandleOption) : Promise<void>{
    return new Promise((res) => {
      process.nextTick(async () => {
        if (option && option.signature && (!this.config.channelSecret || !validateSignature(webhookRequestBodyString, this.config.channelSecret, option.signature))) {
          this.emit('invalid', webhookRequestBodyString);
          res();
          return;
        }
        const webhookRequestBody: Types.WebhookRequestBody = JSON.parse(webhookRequestBodyString);
        for (let event of webhookRequestBody.events as Array<MessageEvent>) {
          const messageContext: MessageContext = new MessageContext(event, this);
          switch(event.message.type) {
            case 'image':
            case 'video':
            case 'audio':
            case 'file':

              const receivedData:RecievedData|undefined = option && option.downloadData ? await (async () => {
                const response:Response = await fetch(`https://api.line.me/v2/bot/message/${event.message.id}/content`, {
                  headers: {
                    Authorization: `Bearer ${this.config.channelAccessToken}`
                  }
                });
                const stream = response.body;
                const contentType = response.headers.get('content-type');
                return {stream, contentType};
              })() : undefined;
              this.emit(event.message.type, messageContext, receivedData);
              break;
            case 'text':
            case 'location':
            case 'sticker':
            default:
              this.emit(['text', 'location', 'sticker'].includes(event.message.type) ? event.message.type : 'other', messageContext);
              break;
          }
        }
        res();
      });
    });
  };
};

export {LINEBotMessageHandler, MessageContext}