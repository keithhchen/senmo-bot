const functions = require('@google-cloud/functions-framework');
const express = require('express');
const line = require('@line/bot-sdk');
const axios = require('axios');
const messages = require('./message_literals'); // Import the messages
require('dotenv').config();

// create LINE SDK config from env variables
const config = {
    channelSecret: process.env.LINE_CHANNEL_SECRET,
};

// create LINE SDK client
const client = new line.messagingApi.MessagingApiClient({
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN
});

const userStates = {}; // Object to track user states

// Create an Express app
const app = express();
app.use(express.json()); // Middleware to parse JSON bodies

// Define routes
app.get('/', (req, res) => {
    res.send('Hello from Express!');
});

app.post('/callback', line.middleware(config), async (req, res) => {
    try {
        await Promise.all(req.body.events.map(handleEvent));
        res.status(200).end();
    } catch (err) {
        const message = { type: 'text', text: err, size: 'xs', color: '#aaaaaa' }
        client.replyMessage({
            replyToken: req.body.events[0].replyToken,
            messages: [message],
        });
        console.error(err);
        res.status(500).end();
    }
});

// Event handler
async function handleEvent(event) {
    const userId = event.source.userId; // Get the user ID from the event
    if (!userStates[userId]) {
        userStates[userId] = { waitingForAmount: false }; // Initialize user state if not present
    }

    if (event.type === 'postback') {
        if (event.postback.data === 'action=transfer_usd_thb') {
            userStates[userId].waitingForAmount = true; // Set state to waiting for amount
            setTimeout(() => {
                userStates[userId].waitingForAmount = false; // Reset state after 1 minute
            }, 60000);
            const message = {
                type: 'flex',
                altText: 'Transfer Amount',
                contents: {
                    type: 'bubble',
                    body: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            {
                                type: 'text',
                                text: "How much USD amount would you like to transfer?",
                                wrap: true
                                // weight: 'bold',
                                // size: 'lg',
                                // margin: 'md'
                            },
                        ]
                    },
                    footer: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            {
                                type: 'button',
                                style: 'secondary',
                                action: {
                                    type: 'postback',
                                    label: 'Cancel',
                                    data: 'action=cancel_transfer', // Postback action for cancel
                                    displayText: 'Cancel the transfer'
                                }
                            }
                        ]
                    }
                }
            };
            return client.replyMessage({
                replyToken: event.replyToken,
                messages: [message],
            });
        } else if (event.postback.data === 'action=cancel_transfer') {
            userStates[userId].waitingForAmount = false;
            const cancelMessage = {
                type: 'text',
                text: 'The transfer has been canceled.'
            };
            return client.replyMessage({
                replyToken: event.replyToken,
                messages: [cancelMessage],
            });
        }
        return await handlePostback(event);
    }

    const userMessage = event.message.text;

    // Check if the user is waiting for a dollar amount
    if (userStates[userId].waitingForAmount) {
        if (isValidDollarAmount(event.message.text)) {
            const amount = parseFloat(event.message.text);
            await handleTransferRequest(event, amount);
            return;
        } else {
            // Provide feedback for invalid input
            const feedbackMessage = {
                type: 'flex',
                altText: 'Transfer Amount',
                contents: {
                    type: 'bubble',
                    body: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            {
                                type: 'text',
                                text: "Please enter a valid USD amount. ",
                            },
                        ]
                    },
                    footer: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            {
                                type: 'button',
                                style: 'secondary',
                                action: {
                                    type: 'postback',
                                    label: 'Cancel',
                                    data: 'action=cancel_transfer', // Postback action for cancel
                                    displayText: 'Cancel the transfer'
                                }
                            }
                        ]
                    }
                }
            };
            return client.replyMessage({
                replyToken: event.replyToken,
                messages: [feedbackMessage],
            });
        }
    }

    if (event.type !== 'message' || event.message.type !== 'text') {
        console.warn('Ignored non-text message or unsupported event type:', event);
        return Promise.resolve(null);
    }

    // create an echoing text message
    const currentState = userStates[userId].waitingForAmount ? "waiting for amount" : "not waiting";
    let responseMessage = { type: "text", text: `User ID: ${userId}, Current State: ${currentState}. Type "menu" to get started.` };


    if (event.message.text === "menu") {
        responseMessage = { ...messages.MENU_MESSAGE };
    }

    return client.replyMessage({
        replyToken: event.replyToken,
        messages: [responseMessage],
    });
}

async function handlePostback(event) {
    const userId = event.source.userId;
    const data = new URLSearchParams(event.postback.data);
    const action = data.get('action');

    switch (action) {
        case 'cancel_transfer':
            userStates[userId].waitingForAmount = false;
            const cancelMessage = {
                type: 'text',
                text: 'The transfer has been canceled.'
            };
            client.replyMessage({
                replyToken: event.replyToken,
                messages: [cancelMessage],
            });
            break;
        case 'transfer_usd_thb':
            await handleTransferRequest(event);
            break;
        case 'check_fx_rate':
            await handleFXRateRequest(event);
            break;
    }
}

// Function to validate if the input is a valid dollar amount
function isValidDollarAmount(input) {
    const amount = parseFloat(input);
    return !isNaN(amount) && amount > 0; // Check if it's a positive number
}


// Function to handle the transfer request
async function handleTransferRequest(event, amount) {
    const message = {
        type: 'text',
        text: `You have requested to transfer $${amount.toFixed(2)}.`
    };

    userStates[event.source.userId].waitingForAmount = false; // Reset state after processing

    return client.replyMessage({
        replyToken: event.replyToken,
        messages: [message],
    });
}
// Function to fetch FX rates from Open Exchange Rates
async function fetchFXRate(baseCurrency, targetCurrency) {
    const url = `https://openexchangerates.org/api/latest.json?app_id=${process.env.OPEN_EXCHANGE_RATES_APP_ID}&base=${baseCurrency}`;

    try {
        const response = await axios.get(url);
        const rates = response.data.rates;

        if (rates[targetCurrency]) {
            return rates[targetCurrency]; // Return the exchange rate for the target currency
        } else {
            throw new Error(`Rate for ${targetCurrency} not found`);
        }
    } catch (error) {
        console.error('Error fetching FX rate:', error);
        throw error; // Rethrow the error for further handling
    }
}

async function handleFXRateRequest(event) {
    const currentRate = await fetchFXRate('USD', 'THB'); // Fetch the rate from USD to THB
    const timestamp = new Date().toLocaleString('en-US', {
        timeZone: 'Asia/Bangkok'
    });

    const message = messages.createFXRateMessage(currentRate, timestamp); // Use the function to create the message

    return client.replyMessage({
        replyToken: event.replyToken,
        messages: [message],
    });
}
functions.http('api', app);