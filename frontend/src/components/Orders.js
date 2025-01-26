import React, { useState, useEffect } from "react";
import "./Orders.css";
import { FaBox, FaShoppingCart, FaShippingFast, FaTruck, FaBan } from "react-icons/fa";

// Utility function to send status updates to the backend
const sendOrderStatusUpdate = async (orderID, status) => {
  try {
    const response = await fetch(`http://localhost:8001/orders/vms/orders/${orderID}/confirm`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ orderStatus: status }),
    });
    if (!response.ok) {
      throw new Error("Failed to update order status");
    }
    const data = await response.json();
    console.log(`Order ID ${orderID} status updated to: ${status}`);
    return data;
  } catch (error) {
    console.error("Error updating order status:", error);
    throw error;
  }
};

const sendOrderToShipped = async (orderID, setShippedOrders, setToShipOrders, toShipOrders) => {
  try {
    const response = await fetch(`http://localhost:8001/orders/vms/orders/${orderID}/toship`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ orderStatus: "Shipped" }),
    });

    if (!response.ok) {
      throw new Error("Failed to update order status to Shipped");
    }

    const data = await response.json();
    console.log(`Order ID ${orderID} status updated to: Shipped`);

    // After updating, move the order to 'Shipped' in UI state
    setShippedOrders((prev) => [...prev, ...toShipOrders.filter(order => order.id === orderID)]);
    setToShipOrders((prev) => prev.filter(order => order.id !== orderID));

    return data;
  } catch (error) {
    console.error("Error updating order status to Shipped:", error);
    throw error;
  }
};

const Orders = () => {
  const [pendingOrders, setPendingOrders] = useState([]);
  const [toShipOrders, setToShipOrders] = useState([]);
  const [shippedOrders, setShippedOrders] = useState([]);
  const [rejectedOrders, setRejectedOrders] = useState([]);

  // Fetch data from API
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await fetch("http://localhost:8001/order-details/order-details/orders");
        if (!response.ok) throw new Error("Failed to fetch orders");
        const data = await response.json();

        // Log the fetched data to the console
        console.log("Fetched orders:", data);

        const formattedData = data.map((item, index) => ({
          id: item.orderID, // Use orderID from the backend
          productName: item.productName,
          category: item.category,
          size: item.size,
          quantity: item.quantity,
          customerName: item.customerName,
          address: item.warehouseAddress,
          total: `$${item.totalPrice.toFixed(2)}`, // Format price
          image: "https://via.placeholder.com/150", // Placeholder image
        }));
        setPendingOrders(formattedData);
      } catch (error) {
        console.error("Error fetching orders:", error);
      }
    };
    fetchOrders();
  }, []);

  useEffect(() => {
    const fetchToShipOrders = async () => {
      try {
        const response = await fetch("http://localhost:8001/orders/confirmed/orders");
        if (!response.ok) throw new Error("Failed to fetch 'To Ship' orders");
        const data = await response.json();

        // Log fetched "To Ship" orders
        console.log("Fetched 'To Ship' orders:", data);

        const formattedToShipOrders = data.map((item) => ({
          id: item.orderID,
          productName: item.productName,
          size: item.size,
          category: item.category,
          quantity: item.quantity,
          total: `$${item.totalPrice.toFixed(2)}`, // Format price
          customerName: item.customerName,
          address: item.warehouseAddress,
          image: "https://via.placeholder.com/150", // Placeholder image
        }));

        setToShipOrders(formattedToShipOrders);
      } catch (error) {
        console.error("Error fetching 'To Ship' orders:", error);
      }
    };

    // Fetch "To Ship" orders
    fetchToShipOrders();
  }, []);

  // Approve Function: Move to "To Ship"
  const approveOrder = async (order) => {
    try {
      console.log(`Approving order with ID: ${order.id}`);
      // Send approval status to backend
      const response = await sendOrderStatusUpdate(order.id, "Confirmed");

      // Update the UI state by moving the order to "To Ship" and removing from "Pending"
      setToShipOrders((prev) => [...prev, order]);
      setPendingOrders((prev) => prev.filter((item) => item.id !== order.id));

      console.log("Order confirmed:", response);
    } catch (error) {
      console.error("Error confirming order:", error);
    }
  };

  // Reject Function: Move to "Rejected Orders"
  const rejectOrder = async (order) => {
    try {
      console.log(`Rejecting order with ID: ${order.id}`);
      // Send rejection status to backend
      const response = await sendOrderStatusUpdate(order.id, "Rejected");

      // Update the UI state by moving the order to "Rejected" and removing from "Pending"
      setRejectedOrders((prev) => [...prev, order]);
      setPendingOrders((prev) => prev.filter((item) => item.id !== order.id));

      console.log("Order rejected:", response);
    } catch (error) {
      console.error("Error rejecting order:", error);
    }
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
                  <button className="action-btn to-ship" onClick={() => sendOrderToShipped(order.id, setShippedOrders, setToShipOrders, toShipOrders)}>Ship</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Shipped */}
        <div className="orders-section">
          <h3>Shipped</h3>
          <div className="scrollable-list">
            {rejectedOrders.map((order) => (
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
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Orders;
