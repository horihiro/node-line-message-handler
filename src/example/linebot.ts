import { LINEBotMessageHandler, MessageContext, RecievedData } from '../index';
import * as Types from "@line/bot-sdk/dist/types";
import * as fs from 'fs';
import { TextEventMessage } from '@line/bot-sdk';
import * as http from 'http';
import config from './config'; // { channelSecret: '<LINEBOT_CHANNEL_SECRET>', channelAccessToken: '<LINEBOT_CHANNEL_ACCESS_TOKEN>' }

const msgHandler = new LINEBotMessageHandler(config as Types.ClientConfig);

msgHandler
// emit `text` event on recieving text message
// 'location' and 'sticker' are same as this.
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
// emit `image` event on recieving iamge message
// 'video', 'audio' and 'file' are same as this.
.on('image', async (context:MessageContext, data:RecievedData ) => {
  const dest = fs.createWriteStream(`dest.${data.contentType ? data.contentType.replace(/[^/]+\//, '') : 'dat'}`);
  // write to a local file using stream
  data.stream.pipe(dest);
})
// emit `invalid` event on failing to validate the message signature
.on('invalid', async (data ) => {
  // invalid signature or request body.
  console.error('invalid');
});


http.createServer((req: http.IncomingMessage, res: http.ServerResponse) => {
  let data = '';

  req
  // emit 'data' event on recieving the request
  .on('data', function(chunk:any) {
    if (!chunk) return;
    data += chunk.toString();
  })
  // emit 'end' event on finishing the request
  .on('end', function() {
    // get message signature from request headers.
    const signature: string = req.headers['x-line-signature'] ? req.headers['x-line-signature'].toString() as string : '';

    // validate the signature and parse event.
    msgHandler.setRecievedMessage(data.toString(), signature);

    res.writeHead(200, {'Content-Type': 'text/plain'});

    res.end('Hello LINE bot\n');
  });

}).listen(7071, '127.0.0.1')
.on('listening', () => {
  // you can access original client through MessageHandler#getClient()
  msgHandler.getClient().broadcast([{
    type: 'text',
    text: 'rebooted'
  }]);
});
