import React, { useState } from "react";
import axios from "axios";
import "./AddProductsForm.css";

const AddProductsForm = ({ onClose }) => {
  const [formData, setFormData] = useState({
    productName: "",
    productDescription: "",
    unitPrice: "",
    category: "",
    size: "",
    quantity: "",
    image_path: null, // Base64 image string
  });

  const [showErrorModal, setShowErrorModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(""); // Added error message state

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Validation for size and price fields
    if (name === "size" || name === "unitPrice") {
      const regex = /^[0-9]*\.?[0-9]*$/; // Matches numbers with an optional decimal point
      if (!regex.test(value)) {
        return; // Ignore invalid input
      }
    }

    setFormData((prevState) => ({ ...prevState, [name]: value }));
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prevState) => ({ ...prevState, image_path: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate required fields
    if (
      !formData.productName ||
      !formData.productDescription ||
      !formData.unitPrice ||
      !formData.category ||
      !formData.size ||
      !formData.quantity ||
      !formData.image_path
    ) {
      setShowErrorModal(true); // Show error modal if any field is missing
      return;
    }

    try {
      setIsSubmitting(true);

      // Prepare JSON payload
      const payload = {
        productName: formData.productName,
        productDescription: formData.productDescription,
        size: formData.size,
        category: formData.category,
        unitPrice: parseFloat(formData.unitPrice), // Ensure it's a number
        quantity: parseInt(formData.quantity), // Ensure it's an integer
        image: formData.image_path, // Base64 string
      };

      // Send POST request to the API
      const response = await axios.post(
        "http://127.0.0.1:8001/products/products",
        payload,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      // If the product already exists
      if (response.data.message) {
        setErrorMessage(response.data.message); // Set the error message from the server
        setShowErrorModal(true); // Show error modal
        return;
      }

      console.log("Product added:", response.data); // Log successful response

      // Pass the new product back to the Products component
      onClose(response.data); // Pass the newly added product to the parent

    } catch (error) {
      console.error("Error adding product:", error);
      alert("Failed to add product. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeErrorModal = () => {
    setShowErrorModal(false); // Close error modal
    onClose(); // Close the entire modal
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="close-btn" onClick={onClose}>
          X
        </button>
        <h2>Add Product</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-scroll-container">
            <div className="form-group">
              <label>Product Name</label>
              <input
                type="text"
                name="productName"
                value={formData.productName}
                onChange={handleChange}
                placeholder="Enter product name"
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                name="productDescription"
                value={formData.productDescription}
                onChange={handleChange}
                placeholder="Enter product description"
              />
            </div>

            <div className="form-group">
              <label>Price</label>
              <input
                type="text"
                name="unitPrice"
                value={formData.unitPrice}
                onChange={handleChange}
                placeholder="Enter price"
              />
            </div>

            <div className="form-group">
              <label>Size</label>
              <input
                type="text"
                name="size"
                value={formData.size}
                onChange={handleChange}
                placeholder="Enter size"
              />
            </div>

            <div className="form-group">
              <label>Quantity</label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                placeholder="Enter product quantity"
              />
            </div>

            <div className="form-group">
              <label>Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
              >
                <option value="">Select Category</option>
                <option value="men">Men</option>
                <option value="women">Women</option>
                <option value="girls">Girls</option>
                <option value="boys">Boys</option>
              </select>
            </div>

            <div className="form-group">
              <label>Product Image</label>
              <div className="image-upload">
                <input type="file" accept="image/*" onChange={handleFileChange} />
                <div className="image-placeholder">
                  {formData.image_path ? (
                    <img
                      src={formData.image_path}
                      alt="Product"
                      style={{ maxWidth: "100px", maxHeight: "100px" }}
                    />
                  ) : (
                    <p>Upload Image</p>
                  )}
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="submit-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Adding..." : "Add Product"}
            </button>
          </div>
        </form>
      </div>

      {/* Error Modal */}
      {showErrorModal && (
        <div className="addproduct-modal-overlay">
          <div className="addproduct-modal-content">
            <h2>Product Exists</h2>
            <p>{errorMessage}</p> 
            <button className="addproduct-submit-btn" onClick={closeErrorModal}>
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddProductsForm;
