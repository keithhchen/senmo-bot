const TRANSFER_MENU_MESSAGE = {
    type: 'text',
    text: 'How much USD would you like to transfer?',
    quickReply: {
        items: [
            {
                type: 'action',
                action: {
                    type: 'message',
                    label: '$100',
                    text: '100'
                }
            },
            {
                type: 'action',
                action: {
                    type: 'message',
                    label: '$500',
                    text: '500'
                }
            },
            {
                type: 'action',
                action: {
                    type: 'message',
                    label: '$1000',
                    text: '1000'
                }
            }
        ]
    }
}

const MENU_MESSAGE = {
    "type": "flex",
    "altText": "FX Services",
    "contents": {
        "type": "bubble",
        "body": {
            "type": "box",
            "layout": "vertical",
            "contents": [
                {
                    "type": "text",
                    "text": "Senmo Remittance",
                    "weight": "bold",
                    "size": "lg",
                    "color": "#1DB446"
                },
                {
                    "type": "box",
                    "layout": "vertical",
                    "margin": "lg",
                    "spacing": "sm",
                    "contents": [
                        {
                            "type": "button",
                            "style": "primary",
                            "action": {
                                "type": "postback",
                                "label": "Transfer USD to THB",
                                "data": "action=transfer_usd_thb",
                                "displayText": "I want to transfer USD to THB"
                            },
                            "color": "#1DB446"
                        },
                        {
                            "type": "button",
                            "style": "secondary",
                            "action": {
                                "type": "postback",
                                "label": "FX Rate",
                                "data": "action=check_fx_rate",
                                "displayText": "I want to check FX rates"
                            }
                        }
                    ]
                }
            ]
        },
        "styles": {
            "footer": {
                "separator": true
            }
        }
    }
}

// messages.js (or a new file, e.g., messageTemplates.js)
function createFXRateMessage(currentRate, timestamp) {
    return {
        type: 'flex',
        altText: 'Current FX Rate',
        contents: {
            type: 'bubble',
            body: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    {
                        type: 'text',
                        text: 'Current FX Rate',
                        weight: 'bold',
                        size: 'lg',
                        color: '#1DB446'
                    },
                    {
                        type: 'box',
                        layout: 'vertical',
                        margin: 'lg',
                        spacing: 'sm',
                        contents: [
                            {
                                type: 'box',
                                layout: 'horizontal',
                                contents: [
                                    {
                                        type: 'text',
                                        text: 'USD/THB',
                                        size: 'sm',
                                        color: '#555555',
                                        flex: 0
                                    },
                                    {
                                        type: 'text',
                                        text: `฿${currentRate.toFixed(2)}`,
                                        size: 'sm',
                                        color: '#111111',
                                        align: 'end'
                                    }
                                ]
                            },
                            {
                                type: 'text',
                                text: `Last updated: ${timestamp} (Thailand)`,
                                size: 'xs',
                                color: '#aaaaaa',
                                wrap: true
                            }
                        ]
                    }
                ]
            }
        }
    };
}

module.exports = {
    MENU_MESSAGE,
    TRANSFER_MENU_MESSAGE,
    createFXRateMessage
}