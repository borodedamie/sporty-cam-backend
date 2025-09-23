import { Request, Response } from "express";
import axios from "axios";

async function verifyPayment(reference: string) {
  try {
    const response = await axios({
      method: "get",
      url: `https://api.paystack.co/transaction/verify/${encodeURIComponent(
        reference
      )}`,
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    });

    if (response.data.status === "failed") {
      throw new Error("Invalid Reference");
    } else {
      return response.data;
    }
  } catch (error) {
    console.error("Error verifying payment:", error);
    throw error;
  }
}
