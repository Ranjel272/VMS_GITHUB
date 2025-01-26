import React, { useState } from "react";
import "./Orders.css";
import { FaBox, FaShoppingCart, FaShippingFast, FaTruck, FaBan } from "react-icons/fa";

const Orders = () => {
  const [pendingOrders, setPendingOrders] = useState([
    { id: 1, productName: "kim", category: "women", size: "7", quantity: 9, customerName: "angel", address: "123 Street, NY", total: "$200", image: "https://via.placeholder.com/150" },
    { id: 2, productName: "dash", category: "men", size: "9", quantity: 1, customerName: "heart", address: "456 Lane, CA", total: "$150", image: "https://via.placeholder.com/150" },
    { id: 3, productName: "storm", category: "kids", size: "5", quantity: 2, customerName: "john", address: "789 Avenue, FL", total: "$100", image: "https://via.placeholder.com/150" },
  ]);

  const [toShipOrders, setToShipOrders] = useState([]);
  const [shippedOrders, setShippedOrders] = useState([]);
  const [rejectedOrders, setRejectedOrders] = useState([]);

  // Approve Function: Move to "To Ship"
  const approveOrder = (order) => {
    setToShipOrders((prev) => [...prev, order]);
    setPendingOrders((prev) => prev.filter((item) => item.id !== order.id));
  };

  // Reject Function: Move to "Rejected Orders"
  const rejectOrder = (order) => {
    setRejectedOrders((prev) => [...prev, order]);
    setPendingOrders((prev) => prev.filter((item) => item.id !== order.id));
  };

  // Ship Function: Move to "Shipped"
  const shipOrder = (order) => {
    setShippedOrders((prev) => [...prev, order]);
    setToShipOrders((prev) => prev.filter((item) => item.id !== order.id));
  };

  // Card Data
  const cardData = [
    { title: "Total Orders", count: pendingOrders.length + toShipOrders.length + shippedOrders.length + rejectedOrders.length, icon: <FaBox /> },
    { title: "Pending", count: pendingOrders.length, icon: <FaShoppingCart /> },
    { title: "To Ship", count: toShipOrders.length, icon: <FaShippingFast /> },
    { title: "Shipped", count: shippedOrders.length, icon: <FaTruck /> },
    { title: "Rejected", count: rejectedOrders.length, icon: <FaBan /> },
  ];

  return (
    <div className="history-container">
      {/* Cards */}
      <div className="cards-container">
        {cardData.map((card, index) => (
          <div className="card" key={index}>
            <div className="card-content">
              <div className="card-number">{card.count}</div>
              <div className="card-icon">{card.icon}</div>
            </div>
            <div className="card-title">{card.title}</div>
          </div>
        ))}
      </div>

      {/* Orders Lists */}
      <div className="orders-lists">
        {/* Pending Orders */}
        <div className="orders-section">
          <h3>Pending Orders</h3>
          <div className="scrollable-list">
            {pendingOrders.map((order) => (
              <div className="order-item" key={order.id}>
                <div className="order-photo">
                  <img src={order.image} alt={order.productName} className="product-image" />
                </div>
                <div className="order-details">
                  <p className="product-name">Product Name: {order.productName}</p>
                  <p>Category: {order.category}</p>
                  <p>Size: {order.size}</p>
                  <p>Quantity: {order.quantity}</p>
                </div>
                <div className="actions">
                  <button className="action-btn reject" onClick={() => rejectOrder(order)}>Reject</button>
                  <button className="action-btn approve" onClick={() => approveOrder(order)}>Approve</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* To Ship Orders */}
        <div className="orders-section">
          <h3>To Ship</h3>
          <div className="scrollable-list">
            {toShipOrders.map((order) => (
              <div className="order-item" key={order.id}>
                <div className="order-photo">
                  <img src={order.image} alt={order.productName} className="product-image" />
                </div>
                <div className="order-details">
                  <p className="product-name">Product Name: {order.productName}</p>
                  <p>Category: {order.category}</p>
                  <p>Size: {order.size}</p>
                  <p>Quantity: {order.quantity}</p>
                  <hr />
                  <p>Customer Name: {order.customerName}</p>
                  <p>Address: {order.address}</p>
                  <p>Total: {order.total}</p>
                </div>
                <div className="actions">
                  <button className="action-btn to-ship" onClick={() => shipOrder(order)}>SHIP</button>
                </div>
              </div>
            ))}
          </div>
        </div>

       

        {/* Shipped Orders */}
        <div className="orders-section">
          <h3>Shipped</h3>
          <div className="scrollable-list">
            {shippedOrders.map((order) => (
              <div className="order-item" key={order.id}>
                <div className="order-details">
                  <p className="product-name">Product Name: {order.productName}</p>
                  <p>Quantity: {order.quantity}</p>
                </div>
                <span className="shipped-status">Shipped</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  ); 
};

export default Orders;