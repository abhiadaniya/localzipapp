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
    const order = event.data?.data();

    if (!order) {
      console.log("No order data found.");
      return;
    }

    const botToken = TELEGRAM_BOT_TOKEN.value();

    // Your Telegram chat ID from getUpdates
    const chatId = "6384569633";

    const orderId = order.orderId || event.params.orderId || "N/A";
    const customerName = order.customer?.name || "N/A";
    const phone = order.customer?.phone || "N/A";
    const address = order.customer?.address || "N/A";
    const storeName = order.storeName || "LocalZip Center";
    const payment = order.payment || "N/A";

    let itemsText = "";

    if (Array.isArray(order.items)) {
      itemsText = order.items
        .map((item) => {
          const name = item.name || item.title || "Item";
          const quantity = item.quantity || item.qty || 1;
          const price =
            item.price ??
            item.total ??
            item.finalPrice ??
            0;

          return `• ${name} × ${quantity} — ₹${price}`;
        })
        .join("\n");
    } else {
      itemsText = "No item details";
    }

    const total =
      order.totals?.grandTotal ??
      order.totals?.total ??
      order.total ??
      0;

    const message =
      `🛍️ *NEW LOCALZIP ORDER*\n\n` +
      `🧾 *Order ID:* ${orderId}\n` +
      `🏪 *Store:* ${storeName}\n\n` +
      `👤 *Customer:* ${customerName}\n` +
      `📞 *Phone:* ${phone}\n\n` +
      `📦 *Items:*\n${itemsText}\n\n` +
      `💰 *Total:* ₹${total}\n` +
      `💳 *Payment:* ${payment}\n\n` +
      `📍 *Address:*\n${address}`;

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "Markdown",
      }),
    });

    const result = await response.json();

    if (!result.ok) {
      console.error("Telegram API error:", result);
      throw new Error("Telegram message failed");
    }

    console.log("Telegram notification sent successfully.");
  }
);
