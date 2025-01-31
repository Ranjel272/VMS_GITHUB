import React, { useState, useEffect } from 'react';
import './EditProductForm.css';
import EditSizeModal from './EditSizeModal';
import AddSizeModal from './AddSizeModal';

const EditProductForm = ({ product, category, onClose }) => {
  const [productData, setProductData] = useState(product);
  const [size, setSize] = useState([]);
  const [sizeVariants, setSizeVariants] = useState([]);
  const [selectedSizeDetails, setSelectedSizeDetails] = useState(null);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [isAddSizeModalOpen, setAddSizeModalOpen] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (product) {
      setProductData({
        ...product,
        category: category,
      });
    }
  }, [product, category]);

  useEffect(() => {
    fetchSize();
    fetchSizeVariants();
  }, [productData]);

  const fetchSize = async () => {
    try {
      const url = `http://127.0.0.1:8001/products/products/sizes?productName=${encodeURIComponent(productData.productName)}&unitPrice=${productData.unitPrice}&productDescription=${encodeURIComponent(productData.productDescription)}&category=${encodeURIComponent(productData.category)}`;
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data.size)) {
          setSize(data.size);
        } else {
          console.warn("Invalid size data received.");
          setSize([]);
          setError("Invalid size data received.");
        }
      } else {
        setSize([]);
        setError("Failed to fetch product size.");
      }
    } catch (error) {
      setSize([]);
      setError("An error occurred while fetching product size.");
    }
  };

  const fetchSizeVariants = async () => {
    try {
      const url = `http://127.0.0.1:8001/products/products/size_variants?productName=${encodeURIComponent(productData.productName)}&unitPrice=${productData.unitPrice}&productDescription=${encodeURIComponent(productData.productDescription || '')}&category=${encodeURIComponent(productData.category)}`;
      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setSizeVariants(data);
        } else {
          setSizeVariants([]);
        }
      } else {
        setSizeVariants([]);
      }
    } catch (error) {
      setSizeVariants([]);
    }
  };

  const handleSizeClick = (selectedSize) => {
    setProductData((prevData) => ({
      ...prevData,
      selectedSize,
    }));
    setSelectedSizeDetails(size.find((item) => item.size === selectedSize.size) || null);
  };

  const handleDeleteSize = async (sizeToDelete) => {
    if (!sizeToDelete) return;

    try {
      const response = await fetch(
        `http://127.0.0.1:8001/products/products/sizes/soft-delete?productName=${encodeURIComponent(productData.productName)}&unitPrice=${encodeURIComponent(productData.unitPrice)}&category=${encodeURIComponent(productData.category)}&size=${encodeURIComponent(sizeToDelete.size)}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        setSize((prevSize) => prevSize.filter((sizeItem) => sizeItem.size !== sizeToDelete.size));
        setSelectedSizeDetails(null);
      } else {
        alert(`Failed to delete size.`);
      }
    } catch (error) {
      alert("An error occurred while attempting to delete the size.");
    }
  };

  const handleSaveSize = (updatedSizeDetails) => {
    setSize((prevSize) =>
      prevSize.map((sizeItem) =>
        sizeItem.size === selectedSizeDetails.size ? { ...sizeItem, ...updatedSizeDetails } : sizeItem
      )
    );
    setSelectedSizeDetails(updatedSizeDetails);
  };

  return (
    <div className="edit-product-form">
      <button className="Editp-close-button" onClick={onClose}>x</button>

      <div className="scrollable-container">
        <div className="photo-section">
          <div className="photo-placeholder">
            {productData.imageURL ? (
              <img src={productData.imageURL} alt={productData.productName} />
            ) : (
              'No Photo Available'
            )}
          </div>
        </div>

        <div className="details-section">
          <div className="details">
            <p><strong>PRODUCT NAME:</strong> {productData.productName}</p>
            <p><strong>DESCRIPTION:</strong> {productData.productDescription}</p>
            <p><strong>PRICE:</strong> {productData.unitPrice}</p>
          </div>
        </div>

        <div className="size-options">
          {size.length === 0 ? (
            <p>No sizes available</p>
          ) : (
            size.map((sizeItem, index) => (
              <button key={index} className="size-button" onClick={() => handleSizeClick(sizeItem)}>
                {sizeItem.size}
              </button>
            ))
          )}
        </div>

        <div className="actions-section">
        <button 
  className="action-button save-button" 
  onClick={() => {
    console.log("Opening EditSizeModal with:", selectedSizeDetails);
    setEditModalOpen(true);
  }}
>
  EDIT
</button>
          <button className="action-button delete-button" onClick={() => handleDeleteSize(selectedSizeDetails)}>DELETE</button>
          <button className="action-button add-size-button" onClick={() => setAddSizeModalOpen(true)}>ADD SIZE</button>
        </div>

        {selectedSizeDetails && (
          <div className="size-details">
            <h4>Selected Size Details</h4>
            <p><strong>Quantity:</strong> {selectedSizeDetails.currentStock}</p>
          </div>
        )}

        <div className="table-section">
          <h3>Size Information</h3>
          <table className="size-table">
            <thead>
              <tr>
                <th>Size</th>
                <th>Barcode</th>
                <th>Product Code</th>
              </tr>
            </thead>
            <tbody>
              {sizeVariants.length > 0 ? (
                sizeVariants.map((variant, index) => (
                  <tr key={index}>
                    <td>{variant.size}</td>
                    <td>{variant.barcode || 'N/A'}</td>
                    <td>{variant.productCode || 'N/A'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3">Loading size variants...</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {error && <div className="error-message">{error}</div>}
      </div>

      {isEditModalOpen && selectedSizeDetails && (
  <EditSizeModal
    selectedSize={selectedSizeDetails}
    productName={productData.productName}
    productDescription={productData.productDescription}
    unitPrice={productData.unitPrice}
    category={productData.category}
    onClose={() => {
      setEditModalOpen(false);
      fetchSize();
      fetchSizeVariants(); // Refresh size variants when modal closes
    }}
    onSave={(updatedSizeDetails) => {
      handleSaveSize(updatedSizeDetails);
      fetchSizeVariants(); // Refresh size variants after saving
    }}
  />
)}


      {isAddSizeModalOpen && (
        <AddSizeModal
          onClose={() => {
            setAddSizeModalOpen(false);
          }}
          onSave={(newSize) => {
            setSize((prevSize) => [...prevSize, newSize]);
            setAddSizeModalOpen(false);
            fetchSizeVariants(); // Refresh after adding a new size
          }}
          productName={productData.productName}
          productDescription={productData.productDescription}
          unitPrice={productData.unitPrice}
          category={productData.category}
          imagePath={productData.image_path}
        />
      )}
    </div>
  );
};

export default EditProductForm;
