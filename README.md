# node-linebot-message-handler
A module to make it more easy to handle LINE bot message, and wrapping some original Client APIs.

## Install

```bash
npm install node-linebot-message-handler --save
```

## Usage

```typescript
import { LINEMessageHandler, MessageContext, RecievedData } from 'node-linebot-message-handler';
import * as Types from "@line/bot-sdk/dist/types";
import { TextEventMessage } from '@line/bot-sdk';

const msgHandler = new LINEBotMessageHandler(config as Types.ClientConfig);

msgHandler
// emit `text` event on recieving text message
.on('text', async (context:MessageContext) => {
  // MessageContext#getEvent() returns Message event object, so you can get message through MessageEvent#message
  // https://developers.line.biz/en/reference/messaging-api/#message-event

  const textEventMessage : TextEventMessage = context.getEvent().message as TextEventMessage;
  const eventSource : Types.EventSource = context.getEvent().source;

  // you can send response message from context directly.
  // e.g. echo message
  await context.replyMessage([{
    type: 'text',
    text: textEventMessage.text
  }]);

  // you can send push message without `to` parameter because the context has it.
  await context.pushMessage([{
    type: 'text',
    text: textEventMessage.text
  }]);

  if (!eventSource.userId) return;

  // or you can access original client through MessageContext#getClient() and use original APIs (i.e. pushMessage, broadcast, etc)
  await context.getClient().pushMessage(eventSource.userId, [{
    type: 'text',
    text: textEventMessage.text
  }]);
})
// 'location' and 'sticker' are same as 'text'.
.on('location', async (context:MessageContext) => {
  // : 
})
.on('sticker', async (context:MessageContext) => {
  // : 
})
// emit `image` event on recieving image message
.on('image', async (context:MessageContext, data:RecievedData ) => {
  const dest = fs.createWriteStream(`dest.${data.contentType ? data.contentType.replace(/[^/]+\//, '') : 'dat'}`);
  // write to a local file using stream
  data.stream.pipe(dest);
})
// 'video', 'audio' and 'file' are same as `image`.
.on('video', async (context:MessageContext, data:RecievedData ) => {
  // : 
})
.on('audio', async (context:MessageContext, data:RecievedData ) => {
  // : 
})
.on('file', async (context:MessageContext, data:RecievedData ) => {
  // : 
})
// emit `invalid` event on failing to validate the message signature
.on('invalid', async (data ) => {
  // invalid signature or request body.
  console.error('invalid');
});

// set recieved message, then above listeners will be called.
msgHandler.setRecievedMessage(data.toString(), signature /* from `x-line-signature` header in request */);

// you can access original client through MessageHandler#getClient() and use original APIs (i.e. pushMessage, broadcast, etc)
msgHandler.getClient().broadcast([{
  type: 'text',
  text: 'rebooted'
}]);
```