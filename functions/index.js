const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");

admin.initializeApp();

const TELEGRAM_BOT_TOKEN = defineSecret("TELEGRAM_BOT_TOKEN");

exports.sendNewOrderToTelegram = onDocumentCreated(
  {
    document: "artifacts/localzip/users/{userId}/orders/{orderId}",
    secrets: [TELEGRAM_BOT_TOKEN],
  },
  async (event) => {
    const order = event.data?.data();

    if (!order) {
      console.log("No order data found.");
      return;
    }

    const orderId = event.params.orderId;

    const customer =
      order.customerName ||
      order.name ||
      order.customer?.name ||
      "Unknown";

    const phone =
      order.phone ||
      order.customerPhone ||
      order.customer?.phone ||
      "Not available";

    const total =
      order.total ||
      order.totalAmount ||
      order.amount ||
      0;

    const address =
      order.address ||
      order.deliveryAddress ||
      order.customer?.address ||
      "Not available";

    let itemsText = "No items";

    if (Array.isArray(order.items)) {
      itemsText = order.items
        .map((item) => {
          const name = item.name || item.title || "Item";
          const qty = item.quantity || item.qty || 1;
          const price = item.price || 0;

          return `• ${name} × ${qty} — ₹${price}`;
        })
        .join("\n");
    }

    const message =
      `🛍️ *NEW LOCALZIP ORDER*\n\n` +
      `🧾 Order ID: ${orderId}\n` +
      `👤 Customer: ${customer}\n` +
      `📞 Phone: ${phone}\n\n` +
      `📦 *Items:*\n${itemsText}\n\n` +
      `💰 *Total: ₹${total}*\n` +
      `📍 Address: ${address}`;

    const url =
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN.value()}/sendMessage`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: "6384569633",
        text: message,
        parse_mode: "Markdown",
      }),
    });

    const result = await response.json();

    if (!result.ok) {
      console.error("Telegram error:", result);
      throw new Error("Telegram notification failed");
    }

    console.log("Telegram order notification sent.");
  }
);
