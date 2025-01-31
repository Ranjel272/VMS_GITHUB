import React, { useState, useEffect } from "react";
import axios from "axios"; // Import axios for making API requests
import "./Dashboard.css";

const Dashboard = () => {
  const [orderCount, setOrderCount] = useState(0); // State to store the order count
  const [deliveredCount, setDeliveredCount] = useState(0); // State to store the delivered count
  const [totalProducts, setTotalProducts] = useState(0); // State to store the total product count
  const [totalPrice, setTotalPrice] = useState(0); // State to store the total price of completed orders in the last 30 days
  const [loading, setLoading] = useState(true); // State to handle loading
  const [error, setError] = useState(null); // State to handle errors

  useEffect(() => {
    // Function to fetch today's order count from the backend
    const fetchOrderCount = async () => {
      try {
        const response = await axios.get("http://127.0.0.1:8001/order-details/orders/last30days/count");
        setOrderCount(response.data.orderCount); // Update the state with the fetched count
      } catch (err) {
        setError("Error fetching order count"); // Handle error if request fails
      }
    };

    // Function to fetch today's delivered order count from the backend
    const fetchDeliveredCount = async () => {
      try {
        const response = await axios.get("http://127.0.0.1:8001/order-details/orders/delivered/last30days/count");
        setDeliveredCount(response.data.deliveredOrderCount); // Update the state with the fetched delivered count
      } catch (err) {
        setError("Error fetching delivered order count"); // Handle error if request fails
      }
    };

    // Function to fetch total product count from the backend
    const fetchTotalProducts = async () => {
      try {
        const response = await axios.get("http://127.0.0.1:8001/products/products/count");
        setTotalProducts(response.data['Total Products']); // Update the state with the fetched total product count
      } catch (err) {
        setError("Error fetching total products count"); // Handle error if request fails
      }
    };

    // Function to fetch total price of completed orders from the last 30 days
    const fetchTotalPrice = async () => {
      try {
        const response = await axios.get("http://127.0.0.1:8001/orders/vms/orders/Completed/total-price/last30days");
        setTotalPrice(response.data.totalPriceLast30Days); // Update the state with the fetched total price
      } catch (err) {
        setError("Error fetching total price"); // Handle error if request fails
      }
    };

    // Fetch all necessary data
    fetchOrderCount();
    fetchDeliveredCount();
    fetchTotalProducts();
    fetchTotalPrice();

    setLoading(false); // Set loading to false after all requests are completed
  }, []); // Empty dependency array ensures this runs once when the component mounts

  return (
    <div className="dashboard-main">
      {/* Dashboard Summary Section */}
      <section className="dashboard-summary">
        <div className="dashboard-card">
          <h2 className="dashboard-summary-card-title">Orders</h2>
          {loading ? <p>Loading...</p> : error ? <p>{error}</p> : <p>{orderCount}</p>} {/* Show loading or error message */}
        </div>
        <div className="dashboard-card">
          <h2 className="dashboard-summary-card-title">Delivered</h2>
          {loading ? <p>Loading...</p> : error ? <p>{error}</p> : <p>{deliveredCount}</p>} {/* Show delivered count */}
        </div>
        <div className="dashboard-card">
          <h2 className="dashboard-summary-card-title">Total Product</h2>
          {loading ? <p>Loading...</p> : error ? <p>{error}</p> : <p>{totalProducts}</p>} {/* Show total product count */}
        </div>
        <div className="dashboard-card">
          <h2 className="dashboard-summary-card-title">Revenue</h2>
          {loading ? <p>Loading...</p> : error ? <p>{error}</p> : <p>₱{totalPrice}</p>} {/* Show total price */}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
