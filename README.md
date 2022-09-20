# CryptoBot
### How to run the environment Instructions:

#### 1. Getting Chat ID - This Step can be skipped for now as both our telegram bot and fastest alerts chat id's are hard coded
- Go to [https://web.telegram.org/](url) and login to your account 
- Select the chat you want to listen to, then copy the number after the `#` this is your chat id

> Example (Fastest Alerts): https://web.telegram.org/z/#-1519789792
> Chat ID is: -1519789792

#### 2. Run Telegram Client
- Open repo and go to `src/telegram/telegramClient.ts`
- Select chat ID const on `#line 16`
- On a new terminal run `npm run telegram`
- You will be promted to login with FA2, phone number format: `+97254XXXXXXX`
- After success in Login, sessionHash will be printed to the console, copy it and paste on `#line 9`
``` node
const stringSession = new StringSession("Your Token Here"); // fill this later with the value from session.save()
```
- ReRun `npm run telegram`  and see that you logged in successfully

#### 3. In a New Terminal - Run Telegram Bot - `npm run bot`
#### 4. In a New Terminal -  Run Server - `npm run server`

#### 5. Running Tests
At this point you should have **3 Terminals Running** with the **Server, Bot and Client** 

- Choose any device and go to the bot at username: `@super_pump_super_bot`, or [https://t.me/super_pump_super_bot](url)
- run command `/start` to start auto messages 
- run command `/stop` to stop auto messages 

## Have Fun
