"use client";

import { CheckCircle2, XCircle, Truck, Store  } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Order } from "@/types/order";
import { PayPalButton } from "./paypal-button";
import { StripeButton } from "./stripe-button";
import "./order-details.css";

interface OrderDetailsProps {
  order: Order;
}

export function OrderDetails({ order }: OrderDetailsProps) {
  const sellerDeliveryItems = order.orderItems.filter(
    (item) => item.product && String(item.product.deliveryType) === "SELLER"
  );
  
  const FishHuntDeliveryItems = order.orderItems.filter(
    (item) => !item.product || String(item.product.deliveryType) !== "SELLER"
  );

  console.log("Seller items:", sellerDeliveryItems);
  console.log("FishHunt items:", FishHuntDeliveryItems);
  return (
    <div className="order-container">
      <div className="order-header">
        <h1 className="order-title">Order #{order._id}</h1>
        <span className={`order-badge ${order.isPaid ? "paid" : "pending"}`}>
          {order.isPaid ? "Paid" : "Pending Payment"}
        </span>
      </div>

      <div className="order-grid">
        <div className="order-left">
          {/* Shipping Info */}
          <div className="order-card">
            <h2 className="order-subtitle">Shipping</h2>
            <p>
              <span className="font-medium">Address: </span>
              {order.shippingDetails.address}, {order.shippingDetails.city},{" "}
              {order.shippingDetails.postalCode},{" "}
              {order.shippingDetails.country}
            </p>
            <div className={`alert ${order.isDelivered ? "success" : "error"}`}>
              {order.isDelivered ? (
                <CheckCircle2 className="icon" />
              ) : (
                <XCircle className="icon" />
              )}
              <span>
                {order.isDelivered
                  ? `Delivered on ${new Date(
                      order.deliveredAt!
                    ).toLocaleDateString()}`
                  : "Not Delivered"}
              </span>
            </div>
          </div>

          {/* Payment Info */}
          <div className="order-card">
            <h2 className="order-subtitle">Payment</h2>
            <p>
              <span className="font-medium">Method: </span>
              {order.paymentMethod}
            </p>
            <div className={`alert ${order.isPaid ? "success" : "error"}`}>
              {order.isPaid ? (
                <CheckCircle2 className="icon" />
              ) : (
                <XCircle className="icon" />
              )}
              <span>
                {order.isPaid
                  ? `Paid on ${new Date(order.paidAt!).toLocaleDateString()}`
                  : "Not Paid"}
              </span>
            </div>
          </div>

          {/* Order Items */}
          <div className="order-card">
            <h2 className="order-subtitle">Order Items</h2>
            {sellerDeliveryItems.length > 0 && (
              <div className="delivery-group">
                <div className="delivery-group-header">
                  <Store className="icon" />
                  <h3>გამყიდველის მიტანა</h3>
                </div>
                {sellerDeliveryItems.map((item) => (
                  <div key={item.product?._id} className="order-item">
                    <div className="order-item-image">
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        className="object-cover rounded-md"
                      />
                    </div>
                    <div className="order-item-details">
                      <Link
                        href={`/products/${item.product?._id}`}
                        className="order-item-link"
                      >
                        {item.name}
                      </Link>
                      <p>
                        {item.qty} x ₾{item.price.toFixed(2)} = $
                        {(item.qty * item.price).toFixed(2)}
                      </p>
                      {item.product?.minDeliveryDays && item.product?.maxDeliveryDays && (
                        <p className="delivery-time">
                          მიწოდების ვადა: {item.product.minDeliveryDays}-{item.product.maxDeliveryDays} დღე
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {FishHuntDeliveryItems.length > 0 && (
              <div className="delivery-group">
                <div className="delivery-group-header">
                  <Truck className="icon" />
                  <h3>FishHunt-ის კურიერი</h3>
                </div>
                {FishHuntDeliveryItems.map((item) => (
                  <div key={item.product?._id} className="order-item">
                    <div className="order-item-image">
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        className="object-cover rounded-md"
                      />
                    </div>
                    <div className="order-item-details">
                      <Link
                        href={`/products/${item.product?._id}`}
                        className="order-item-link"
                      >
                        {item.name}
                      </Link>
                      <p>
                        {item.qty} x ₾{item.price.toFixed(2)} = $
                        {(item.qty * item.price).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Order Summary */}
        <div className="order-right">
          <div className="order-card">
            <h2 className="order-subtitle">Order Summary</h2>
            <div className="order-summary">
              <div className="summary-item">
                <span>Items</span>
                <span>${order.itemsPrice.toFixed(2)}</span>
              </div>
              <div className="summary-item">
                <span>Shipping</span>
                <span>
                  {order.shippingPrice === 0
                    ? "Free"
                    : `$${order.shippingPrice.toFixed(2)}`}
                </span>
              </div>
              <div className="summary-item">
                <span>Tax</span>
                <span>${order.taxPrice.toFixed(2)}</span>
              </div>
              <hr />
              <div className="summary-total">
                <span>Total</span>
                <span>${order.totalPrice.toFixed(2)}</span>
              </div>

              {!order.isPaid &&
                (order.paymentMethod === "PayPal" ? (
                  <PayPalButton orderId={order._id} amount={order.totalPrice} />
                ) : (
                  <StripeButton orderId={order._id} amount={order.totalPrice} />
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
