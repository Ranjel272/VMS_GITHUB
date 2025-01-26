import React, { useState, useEffect } from "react";
import axios from "axios";
import "./Products.css";
import AddProductsForm from "./AddProductsForm";
import EditProductForm from "./EditProductForm";

const Products = () => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [products, setProducts] = useState({
    women: [],
    men: [],
    girls: [],
    boys: [],
  });

  useEffect(() => {
    console.log("Fetching women's products...");
    fetchWomenProducts();
  }, []);

  const fetchWomenProducts = async () => {
    try {
      const response = await axios.get(
        "http://127.0.0.1:8001/products/products/Womens-Leather-Shoes"
      );
      console.log("Fetched women's products response:", response.data);

      const womenProducts = response.data || [];
      setProducts((prevState) => ({
        ...prevState,
        women: womenProducts.map((product) => {
          const imageURL = product.image_path || "placeholder.png";
          return {
            ...product,
            imageURL: `http://127.0.0.1:8001/${imageURL}`,
          };
        }),
      }));
    } catch (error) {
      console.error("Error fetching women's products:", error);
    }
  };

  useEffect(() => {
    console.log("Fetching men's products...");
    fetchmenProducts();
  }, []);

  const fetchmenProducts = async () => {
    try {
      const response = await axios.get(
        "http://127.0.0.1:8001/products/products/mens-Leather-Shoes"
      );
      console.log("Fetched men's products response:", response.data);

      const menProducts = response.data || [];
      setProducts((prevState) => ({
        ...prevState,
        men: menProducts.map((product) => {
          const imageURL = product.image_path || "placeholder.png";
          return {
            ...product,
            imageURL: `http://127.0.0.1:8001/${imageURL}`,
          };
        }),
      }));
    } catch (error) {
      console.error("Error fetching men's products:", error);
    }
  };

  useEffect(() => {
    console.log("Fetching girls's products...");
    fetchgirlsProducts();
  }, []);

  const fetchgirlsProducts = async () => {
    try {
      const response = await axios.get(
        "http://127.0.0.1:8001/products/products/girls-Leather-Shoes"
      );
      console.log("Fetched girls's products response:", response.data);

      const girlsProducts = response.data || [];
      setProducts((prevState) => ({
        ...prevState,
        girls: girlsProducts.map((product) => {
          const imageURL = product.image_path || "placeholder.png";
          return {
            ...product,
            imageURL: `http://127.0.0.1:8001/${imageURL}`,
          };
        }),
      }));
    } catch (error) {
      console.error("Error fetching girl's products:", error);
    }
  };


  useEffect(() => {
    console.log("Fetching boy's products...");
    fetchboysProducts();
  }, []);

  const fetchboysProducts = async () => {
    try {
      const response = await axios.get(
        "http://127.0.0.1:8001/products/products/boys-Leather-Shoes"
      );
      console.log("Fetched boy's products response:", response.data);

      const boysProducts = response.data || [];
      setProducts((prevState) => ({
        ...prevState,
        boys: boysProducts.map((product) => {
          const imageURL = product.image_path || "placeholder.png";
          return {
            ...product,
            imageURL: `http://127.0.0.1:8001/${imageURL}`,
          };
        }),
      }));
    } catch (error) {
      console.error("Error fetching boy's products:", error);
    }
  };

  const openAddModal = () => {
    console.log("Opening Add Product modal");
    setIsAddModalOpen(true);
  };

  const closeAddModal = () => {
    console.log("Closing Add Product modal");
    setIsAddModalOpen(false);
  };

  const openEditModal = (product, index, category) => {
    console.log("Opening Edit Product modal for:", { product, index, category });
    setSelectedProduct({
      product,
      index,
      category,  // Passing category as a string like 'women'
      imageURL: product.imageURL,
    });
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    console.log("Closing Edit Product modal");
    setIsEditModalOpen(false);
  };

  const addProduct = (newProduct) => {
    console.log("Adding new product:", newProduct);

    // Ensure the new product has a valid image URL
    const productWithImage = {
      ...newProduct,
      imageURL: newProduct.image_path || "http://127.0.0.1:8001/placeholder.png",
    };

    // Filter only required fields
    const productWithRequiredFields = {
      productName: productWithImage.productName,
      productDescription: productWithImage.productDescription,
      category: productWithImage.category,
      unitPrice: productWithImage.unitPrice,
      imageURL: productWithImage.imageURL, // Ensure imageURL is included
    };

    setProducts((prevState) => ({
      ...prevState,
      [newProduct.category]: [...prevState[newProduct.category], productWithRequiredFields],
    }));
  };

  const editProduct = (updatedProduct, category, index) => {
    console.log("Editing product:", { updatedProduct, category, index });

    // Filter only required fields
    const updatedProductWithRequiredFields = {
      productName: updatedProduct.productName,
      productDescription: updatedProduct.productDescription,
      category: updatedProduct.category,
      unitPrice: updatedProduct.unitPrice,
      imageURL: updatedProduct.imageURL,  // Ensure imageURL is passed
    };

    const updatedProducts = [...products[category]];
    updatedProducts[index] = updatedProductWithRequiredFields;

    setProducts((prevState) => ({
      ...prevState,
      [category]: updatedProducts,
    }));
  };

  const countTotalProducts = () => {
    const uniqueProductNames = new Set(); // Set to track unique product names

    // Iterate over each category and add the product name to the set
    Object.values(products).forEach((category) => {
      category.forEach((product) => {
        uniqueProductNames.add(product.productName);
      });
    });

    const totalUniqueProducts = uniqueProductNames.size; // The size of the set is the count of unique products
    console.log("Total unique products count:", totalUniqueProducts);
    return totalUniqueProducts;
  };

  const countTotalWomenProducts = () => {
    const uniqueProductNames = new Set(); // Set to track unique women's product names

    products.women.forEach((product) => {
      uniqueProductNames.add(product.productName);
    });

    const totalUniqueWomenProducts = uniqueProductNames.size; // The size of the set is the count of unique women's products
    console.log("Total unique women's products count:", totalUniqueWomenProducts);
    return totalUniqueWomenProducts;
  };

  const renderProductCards = (category) => {
    // Use a Set to store product names to avoid duplication
    const displayedNames = new Set();

    return products[category].map((product, index) => {
      if (displayedNames.has(product.productName)) {
        return null; // Skip the product if it has been displayed already
      }

      displayedNames.add(product.productName); // Mark this product as displayed

      return (
        <div
          className="product-card"
          key={index}
          onClick={() => openEditModal(product, index, category)}  // Passing 'women' instead of 'womens'
        >
          <img
            src={product.imageURL || "placeholder.png"}  // Default to placeholder if no imageURL
            alt={product.productName}
            className="product-image"
          />
          <div className="product-details">
            <h4>{product.productName}</h4>
          </div>
        </div>
      );
    });
  };

  return (
    <div className="products-container">
      <div className="dashboard">
        {/* Total Number of Products */}
        <div className="category-box">
          <h2>{countTotalProducts()}</h2>
          <p>Total Number of Products</p>
        </div>

        {/* Total Number of Women's Products */}
        <div className="category-box">
          <h2>{countTotalWomenProducts()}</h2>
          <p>Women</p>
        </div>

        {/* Categories like Men, Girls, Boys */}
        {["women", "men", "girls", "boys"].map((category) => (
          <div key={category} className="category-box">
            <i
              className={`fa ${
                category === "women"
                  ? "fa-female"
                  : category === "men"
                  ? "fa-male"
                  : category === "girls"
                  ? "fa-child"
                  : "fa-baby"
              }`}
            ></i>
            <h2>{products[category].length}</h2>
            <p>{category.charAt(0).toUpperCase() + category.slice(1)}</p>
          </div>
        ))}
      </div>

      <button className="add-product-btn" onClick={openAddModal}>
        Add Product
      </button>

      {isAddModalOpen && <AddProductsForm onClose={closeAddModal} addProduct={addProduct} />}

      {isEditModalOpen && selectedProduct && (
        <EditProductForm
          onClose={closeEditModal}
          product={selectedProduct.product}
          index={selectedProduct.index}
          editProduct={editProduct}
          category={selectedProduct.category}  // Passing 'women' instead of 'womens'
        />
      )}

      <div className="products-list">
        {["women", "men", "girls", "boys"].map((category) => (
          <div key={category}>
            <h3>{category.toUpperCase()}</h3>
            <div className="products-grid">
              {renderProductCards(category)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Products;
