const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { defineSecret } = require("firebase-functions/params");

const TELEGRAM_BOT_TOKEN = defineSecret("TELEGRAM_BOT_TOKEN");

exports.sendNewOrderToTelegram = onDocumentCreated(
  {
    document: "artifacts/{appId}/public/data/orders/{orderId}",
    region: "us-central1",
    secrets: [TELEGRAM_BOT_TOKEN],
  },

  async (event) => {
    try {
      // Get newly created order
      const order = event.data?.data();

      if (!order) {
        console.log("No order data found.");
        return;
      }

      // Telegram bot token from Firebase Secret Manager
      const botToken = TELEGRAM_BOT_TOKEN.value();

      // Telegram chat ID for the account that started the bot
      const chatId = "6384569633";

      // Order ID
      const orderId =
        order.orderId ||
        event.params.orderId ||
        "N/A";

      // Customer information
      const customerName =
        order.customer?.name ||
        "N/A";

      const customerPhone =
        order.customer?.phone ||
        "N/A";

      const customerAddress =
        order.customer?.address ||
        "N/A";

      // Store
      const storeName =
        order.storeName ||
        "N/A";

      // Payment
      const payment =
        order.payment ||
        "N/A";

      // Items
      let itemsText = "No items found";

      if (Array.isArray(order.items) && order.items.length > 0) {
        itemsText = order.items
          .map((item) => {
            const name =
              item.name ||
              item.title ||
              "Item";

            const quantity =
              item.quantity ||
              item.qty ||
              1;

            const price =
              item.price ??
              item.total ??
              item.finalPrice ??
              0;

            return `• ${name} × ${quantity} — ₹${price}`;
          })
          .join("\n");
      }

      // Total
      const total =
        order.totals?.grandTotal ??
        order.totals?.total ??
        order.total ??
        0;

      // Telegram message
      const message =
        `🛍️ *NEW LOCALZIP ORDER*\n\n` +

        `🧾 *Order ID:* ${orderId}\n` +

        `🏪 *Store:* ${storeName}\n\n` +

        `👤 *Customer:* ${customerName}\n` +

        `📞 *Phone:* ${customerPhone}\n\n` +

        `📦 *Items:*\n${itemsText}\n\n` +

        `💰 *Total:* ₹${total}\n` +

        `💳 *Payment:* ${payment}\n\n` +

        `📍 *Delivery Address:*\n${customerAddress}`;

      // Telegram API
      const telegramUrl =
        `https://api.telegram.org/bot${botToken}/sendMessage`;

      const response = await fetch(
        telegramUrl,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            chat_id: chatId,
            text: message,
            parse_mode: "Markdown",
          }),
        }
      );

      const result = await response.json();

      console.log(
        "Telegram API response:",
        result
      );

      if (!result.ok) {
        throw new Error(
          `Telegram API error: ${JSON.stringify(result)}`
        );
      }

      console.log(
        `Telegram notification sent successfully for order ${orderId}`
      );

    } catch (error) {
      console.error(
        "Failed to send Telegram notification:",
        error
      );

      throw error;
    }
  }
);
