# Telegram Bot Adapter

Connects to the Telegram Bot API to send and receive messages regarding scanned EAN codes.

## Config

```json
{
  "services": [
    {
      ...
      "bot": {
        "adapterName": "telegram", // This needs to be "telegram" to load this adapter
        "botToken": "telegramBotId", // Set your telegram Bot Token, you can create a Telegram Bot via https://t.me/botfather
        "chatId": "telegramChatId" // Set your chat ID you want to allow updates from / to. This can either be a private chat or a group chat. Get your Chat-ID via https://t.me/myidbot
      }
    }
  ]
}
```

### Start Bot

Open the Chat with your Bot after it's created and after you have started the application and run /start once so the Bot can send messages to this chat.

#### Privacy Settings

Make sure to disable Group Privacy in Botfathers Bot Settings for your Bot if you want to use it in a Group. Otherwise it will not be able to read your messages.