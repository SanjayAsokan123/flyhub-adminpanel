import axios from "axios";
import { getShiprocketToken } from "./shiprocketAuth.js";

export async function createShiprocketOrder(order) {
  const token = await getShiprocketToken();

  const payload = {
    order_id: order.orderId,
    order_date: new Date().toISOString().split("T")[0],
    pickup_location: "Primary",

    billing_customer_name: order.buyer.name,
    billing_phone: order.buyer.phone,
    billing_email: order.buyer.email,
    billing_address: order.buyer.address,
    billing_city: "City",
    billing_state: "State",
    billing_pincode: "600001",
    billing_country: "India",

    shipping_is_billing: true,

    order_items: order.items.map(i => ({
      name: i.name,
      sku: i.productId,
      units: i.quantity,
      selling_price: i.price,
    })),

    payment_method:
      order.payment.mode === "COD" ? "COD" : "Prepaid",
    cod_amount:
      order.payment.mode === "COD" ? order.totalAmount : 0,
    sub_total: order.totalAmount,
    length: 10,
    breadth: 10,
    height: 5,
    weight: 1,
  };

  const res = await axios.post(
    "https://apiv2.shiprocket.in/v1/external/orders/create/adhoc",
    payload,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return {
    trackingNumber: res.data.awb_code,
    shipmentId: res.data.shipment_id,
    courier: res.data.courier_name,
  };
}
