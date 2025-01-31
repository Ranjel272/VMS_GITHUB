from fastapi import File, UploadFile, HTTPException, APIRouter, Depends
from pydantic import BaseModel
import database
import random
import string
import os
import base64
from typing import Optional
from routers.auth import get_current_user

# Directory for saving uploaded images
UPLOAD_DIRECTORY = "images_upload"
os.makedirs(UPLOAD_DIRECTORY, exist_ok=True)

# Function to generate a unique filename for images
def generate_image_filename():
    return ''.join(random.choices(string.ascii_letters + string.digits, k=16)) + ".png"

# Function to decode Base64 image and save to file
def save_base64_image(base64_image: str) -> str:
    try:
        # Decode the Base64 string (ignore the data URI prefix if present)
        if "," in base64_image:
            base64_image = base64_image.split(",")[1]

        # Fix padding if it's incorrect
        missing_padding = len(base64_image) % 4
        if missing_padding:
            base64_image += "=" * (4 - missing_padding)

        image_data = base64.b64decode(base64_image)
        filename = generate_image_filename()
        filepath = os.path.join(UPLOAD_DIRECTORY, filename)
        with open(filepath, "wb") as file:
            file.write(image_data)
        return filepath
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid Base64 image: {str(e)}")

# function to generate barcode
def generate_barcode():
    characters = string.ascii_uppercase + string.digits
    barcode = ''.join(random.choices(characters, k=13))
    return barcode

# function to generate sku
def generate_sku():
    characters = string.ascii_uppercase + string.digits
    sku = ''.join(random.choices(characters, k=8))
    return sku

router = APIRouter()

# Pydantic model for products
class Product(BaseModel):
    productName: str
    productDescription: str
    size: str
    category: str
    unitPrice: float
    quantity: int
    image: str  

# Pydantic model for adding quantities to an existing product
class AddQuantity(BaseModel):
    productName: str
    size: str
    category: str
    quantity: int

class ProductVariant(BaseModel):
    productName: str
    barcode: str
    productCode: str
    productDescription: str
    size: str
    color: str
    unitPrice: float
    minStockLevel: int
    maxStockLevel: int
    isDamaged: bool = False 
    isWrongItem: bool = False
    isReturned: bool = False

#to ger fetch the sizes
class ProductQueryParams(BaseModel):
    productName: str
    productDescription: str
    unitPrice: float
    category: str

class ProductVariantResponse(BaseModel):
   size: str
   productCode: str
   barcode: str

class ADDSIZE(BaseModel):
    productName: str
    productDescription: str
    size: str
    category: str
    unitPrice: float
    quantity: int  
    image_path: str 

class ProductUpdates(BaseModel):
    productName: str  # Current product name
    productDescription: str  # Current product description
    category: str  # Current category
    unitPrice: float  # Current unit price
    newProductName: str  # New product name
    newProductDescription: str  # New product description
    newCategory: str  # New category
    newUnitPrice: float  # New unit price
    newImage: str  # New image URL or path
    
# class Product(BaseModel):
#     productName: str
#     productDescription: str
#     category: str
#     unitPrice: float

class ProductSizeUpdate(BaseModel):
    productName: str
    productDescription: str
    size: str
    category: str
    unitPrice: float
    newSize: str
    

@router.post('/products')
async def add_product(product: Product):
    conn = await database.get_db_connection()
    cursor = await conn.cursor()
    try:
        # Save the Base64 image to file and get the path
        image_path = save_base64_image(product.image)

        # Check if the product already exists with the same productName and category
        await cursor.execute(''' 
            SELECT productID, productName, productDescription, size, category, unitPrice
            FROM Products
            WHERE productName = ? AND category = ? AND isActive = 1
        ''', (product.productName, product.category))
        existing_product = await cursor.fetchone()

        if existing_product:
            # If an existing product with the same productName and category is found
            return {'message': f'Product "{product.productName}" with category "{product.category}" already exists. Add more size if needed.'}

        # Insert new product into Products table
        await cursor.execute(''' 
            INSERT INTO Products (
                productName, productDescription, size, category, 
                unitPrice, image_path, currentStock, isActive
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        ''', (product.productName, product.productDescription, product.size, 
              product.category, product.unitPrice, image_path, product.quantity))
        await conn.commit()

        # Retrieve the last inserted productID using @@IDENTITY
        await cursor.execute('SELECT @@IDENTITY')
        product_id_row = await cursor.fetchone()

        # Debugging: Log the result of @@IDENTITY
        print(f"@@IDENTITY result: {product_id_row}")

        product_id = product_id_row[0] if product_id_row else None

        if not product_id:
            raise HTTPException(status_code=500, detail='Failed to retrieve productID after insertion.')

        # Insert product variants
        variants_data = [
            (generate_barcode(), generate_sku(), product_id) for _ in range(product.quantity)
        ]
        await cursor.executemany('''
            INSERT INTO ProductVariants (barcode, productCode, productID)
            VALUES (?, ?, ?)
        ''', variants_data)
        await conn.commit()

        return {'message': f'Product "{product.productName}" added with {product.quantity} variants.'}
    
    except Exception as e:
        await conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        await conn.close()


@router.post('/products/updateSize')
async def update_product(productData: ProductSizeUpdate):
    conn = await database.get_db_connection()
    cursor = await conn.cursor()

    try:
        # Step 1: Select the productID based on given fields
        await cursor.execute(''' 
            SELECT productID FROM Products 
            WHERE productName = ? AND productDescription = ? AND size = ? 
                  AND category = ? AND unitPrice = ? AND isActive = 1
            ''',
            productData.productName, 
            productData.productDescription, 
            productData.size, 
            productData.category, 
            float(productData.unitPrice)
        )

        product_row = await cursor.fetchone()
        if not product_row:
            raise HTTPException(
                status_code=404,
                detail=f"Product '{productData.productName}' not found with the given details."
            )

        # Extract the productID
        product_id = product_row[0]

        # Step 2: Check if the new size already exists for the same productName
        await cursor.execute('''
            SELECT 1 FROM Products 
            WHERE productName = ? AND size = ? AND isActive = 1
            ''', productData.productName, productData.newSize)

        existing_size = await cursor.fetchone()
        if existing_size:
            raise HTTPException(
                status_code=400,
                detail=f"Size '{productData.newSize}' already exists for the product '{productData.productName}'."
            )

        # Step 3: Check if the current size is different from the new size before updating
        if productData.size == productData.newSize:
            raise HTTPException(
                status_code=400,
                detail="The size is already set to the new size. No changes are needed."
            )

        # Step 4: Update the size
        await cursor.execute(''' 
            UPDATE Products
            SET size = ?
            WHERE productID = ? AND isActive = 1
            ''', 
            productData.newSize,
            product_id
        )
        await conn.commit()

        # Step 5: Return success message with updated data
        return {
            "message": f"Product with ID {product_id} updated successfully.",
            "updated_product": {
                "productID": product_id,
                "newSize": productData.newSize
            }
        }

    except Exception as e:
        await conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        await conn.close()


@router.put('/products/update-details')
async def update_product_details(productData: ProductUpdates):
    conn = await database.get_db_connection()
    cursor = await conn.cursor()

    try:
        # Step 1: Update all matching products based on the current values
        await cursor.execute(
            '''UPDATE Products
               SET productName = ?, productDescription = ?, category = ?, unitPrice = ?, image_path = ?
               WHERE productName = ? AND productDescription = ? AND category = ? AND unitPrice = ? AND isActive = 1''',
            productData.newProductName, productData.newProductDescription, productData.newCategory, 
            float(productData.newUnitPrice), productData.newImage, 
            productData.productName, productData.productDescription, productData.category, float(productData.unitPrice)
        )
        await conn.commit()

        # Step 2: Fetch the updated products to confirm the changes
        await cursor.execute(
            '''SELECT productName, productDescription, category, unitPrice, image_path
               FROM Products
               WHERE productName = ? AND productDescription = ? AND category = ? AND unitPrice = ? AND isActive = 1''',
            productData.newProductName, productData.newProductDescription, productData.newCategory, 
            float(productData.newUnitPrice)
        )
        updated_products = await cursor.fetchall()

        if not updated_products:
            raise HTTPException(
                status_code=404,
                detail=f"No products found with the specified criteria."
            )

        return {
            "message": f"Products updated successfully.",
            "updated_products": [
                {
                    "productName": product[0],
                    "productDescription": product[1],
                    "category": product[2],
                    "unitPrice": product[3],
                    "image_path": product[4]
                } for product in updated_products
            ]
        }
    except Exception as e:
        await conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        await conn.close()
        
@router.patch('/products/soft-delete')
async def soft_delete_products(productName: str, category: str):
    conn = await database.get_db_connection()
    try:
        async with conn.cursor() as cursor:
            # Check if products exist and are currently active
            await cursor.execute(''' 
                SELECT COUNT(*) 
                FROM Products 
                WHERE productName = ? 
                AND category = ? 
                AND isActive = 1
            ''', (productName, category))

            count = await cursor.fetchone()

            if count[0] == 0:
                raise HTTPException(status_code=404, detail="No active products found for the given product name and category")

            # Perform soft delete by setting isActive to 0 for all matching products
            await cursor.execute(''' 
                UPDATE Products 
                SET isActive = 0 
                WHERE productName = ? 
                AND category = ? 
            ''', (productName, category))

            await conn.commit()
            return {"detail": "Products soft deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")

# Get all Women's products
@router.get("/products/Womens-Leather-Shoes")
async def get_womens_products():
    conn = await database.get_db_connection()
    cursor = await conn.cursor()
    try:
        await cursor.execute(
            '''SELECT p.productName, p.productDescription, p.category,
                p.size, p.unitPrice, CAST(p.image_path AS varchar(max)),
                COUNT(pv.variantID) AS 'available quantity', p.currentStock
            FROM products AS p
            LEFT JOIN ProductVariants AS pv
            ON p.productID = pv.productID
            WHERE p.isActive = 1 AND pv.isAvailable = 1  AND p.category = 'Women'
            GROUP BY p.productName, p.productDescription, p.category, p.size, p.unitPrice, p.currentStock, CAST(p.image_path AS varchar(max))
            '''
        )
        
        products = await cursor.fetchall()
        # Map column names to row values
        # Ensure the image path uses forward slashes
        return [
            {
                **dict(zip([column[0] for column in cursor.description], row)),
                'image_path': row[5].replace("\\", "/") if row[5] else "placeholder.png"
            }
            for row in products
        ]
    finally:
        await conn.close()


# get all Mens products
@router.get("/products/mens-Leather-Shoes")
async def get_mens_products():
    conn = await database.get_db_connection()
    cursor = await conn.cursor()
    try:
        await cursor.execute(
            '''SELECT p.productName, p.productDescription, p.category,
                p.size, p.unitPrice, CAST(p.image_path AS varchar(max)),
                COUNT(pv.variantID) AS 'available quantity', p.currentStock
            FROM products AS p
            LEFT JOIN ProductVariants AS pv
            ON p.productID = pv.productID
            WHERE p.isActive = 1 AND pv.isAvailable = 1  AND p.category = 'men'
            GROUP BY p.productName, p.productDescription, p.category, p.size, p.unitPrice, p.currentStock, CAST(p.image_path AS varchar(max))
            '''
        )
        
        products = await cursor.fetchall()
        # Map column names to row values
        # Ensure the image path uses forward slashes
        return [
            {
                **dict(zip([column[0] for column in cursor.description], row)),
                'image_path': row[5].replace("\\", "/") if row[5] else "placeholder.png"
            }
            for row in products
        ]
    finally:
        await conn.close()

# get all girls products
@router.get("/products/girls-Leather-Shoes")
async def get_girls_products():
    conn = await database.get_db_connection()
    cursor = await conn.cursor()
    try:
        await cursor.execute(
            '''SELECT p.productName, p.productDescription, p.category,
                p.size, p.unitPrice, CAST(p.image_path AS varchar(max)),
                COUNT(pv.variantID) AS 'available quantity', p.currentStock
            FROM products AS p
            LEFT JOIN ProductVariants AS pv
            ON p.productID = pv.productID
            WHERE p.isActive = 1 AND pv.isAvailable = 1  AND p.category = 'girls'
            GROUP BY p.productName, p.productDescription, p.category, p.size, p.unitPrice, p.currentStock, CAST(p.image_path AS varchar(max))
            '''
        )
        
        products = await cursor.fetchall()
        # Map column names to row values
        # Ensure the image path uses forward slashes
        return [
            {
                **dict(zip([column[0] for column in cursor.description], row)),
                'image_path': row[5].replace("\\", "/") if row[5] else "placeholder.png"
            }
            for row in products
        ]
    finally:
        await conn.close()

# get all boys products
@router.get("/products/boys-Leather-Shoes")
async def get_boys_products():
    conn = await database.get_db_connection()
    cursor = await conn.cursor()
    try:
        await cursor.execute(
            '''SELECT p.productName, p.productDescription, p.category,
                p.size, p.unitPrice, CAST(p.image_path AS varchar(max)),
                COUNT(pv.variantID) AS 'available quantity', p.currentStock
            FROM products AS p
            LEFT JOIN ProductVariants AS pv
            ON p.productID = pv.productID
            WHERE p.isActive = 1 AND pv.isAvailable = 1  AND p.category = 'boys'
            GROUP BY p.productName, p.productDescription, p.category, p.size, p.unitPrice, p.currentStock, CAST(p.image_path AS varchar(max))
            '''
        )
        
        products = await cursor.fetchall()
        # Map column names to row values
        # Ensure the image path uses forward slashes
        return [
            {
                **dict(zip([column[0] for column in cursor.description], row)),
                'image_path': row[5].replace("\\", "/") if row[5] else "placeholder.png"
            }
            for row in products
        ]
    finally:
        await conn.close()

@router.get('/products/sizes')
async def get_size(
    productName: str, 
    unitPrice: float, 
    category: str, 
    productDescription: Optional[str] = None
):
    conn = await database.get_db_connection()
    try:
        async with conn.cursor() as cursor:
            # SQL query to fetch sizes
            await cursor.execute(''' 
                SELECT size, currentStock 
                FROM Products 
                WHERE productName = ? 
                AND unitPrice = ? 
                AND category = ?
                AND (productDescription = ? OR ? IS NULL)
                AND currentStock >= 1  
                AND isActive = 1

            ''', (productName, unitPrice, category, productDescription, productDescription))
            
            products = await cursor.fetchall()

            if not products:
                raise HTTPException(status_code=404, detail="Product sizes not found")

            # Map the query results to the expected format
            size_list = [{"size": product[0], "currentStock": product[1]} for product in products]
            return {"size": size_list}  

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        await conn.close()

@router.get('/products/size_variants', response_model=list[ProductVariantResponse])
async def get_size_variants(productName: str, unitPrice: float, category: str, productDescription: Optional[str] = None):
    conn = await database.get_db_connection()
    #cursor = await conn.cursor()

    try:
     async with conn.cursor() as cursor:

        await cursor.execute(
            '''SELECT p.size, pv.productCode, pv.barcode
                FROM
                    Products AS p
                INNER JOIN
                    ProductVariants AS pv
                ON
                    p.productID = pv.productID
                WHERE
                    p.isActive = 1
                    AND pv.isAvailable = 1
                    AND p.productName = ?
                    AND (p.productDescription = ? OR ? IS NULL)
                    AND p.unitPrice = ?
                    AND p.category = ?;  
            ''', (productName, productDescription, productDescription, unitPrice, category))
        variants = await cursor.fetchall()

        if variants:
            variant_list = [
                {
                    "size": variant[0],
                    "productCode": variant[1],
                    "barcode": variant[2]
                }
                for variant in variants
            ]
            return variant_list
        else:
            raise HTTPException(status_code=404, detail="Product not found.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:    
        await conn.close()

@router.post('/products_AddSize')
async def add_product(product: ADDSIZE):
    conn = await database.get_db_connection()
    cursor = await conn.cursor()
    try:
        # Step 1: Retrieve the existing image_path based on product name and description
        await cursor.execute('''SELECT image_path 
                                FROM Products 
                                WHERE productName = ? 
                                      AND productDescription = ? 
                                      AND isActive = 1''',
                             (product.productName, product.productDescription))

        existing_product = await cursor.fetchone()
        
        if existing_product:
            image_path = existing_product[0]  # Use the existing image path
        else:
            raise HTTPException(status_code=404, detail="Original product not found. Cannot add new size.")

        # Step 2: Check if the same product (name, description, and size) already exists
        await cursor.execute('''SELECT productID, currentStock
                                FROM Products
                                WHERE productName = ? 
                                      AND productDescription = ? 
                                      AND size = ? 
                                      AND isActive = 1''',
                             (product.productName, product.productDescription, product.size))

        existing_size = await cursor.fetchone()

        if existing_size:
            # If size exists, just update the quantity (currentStock)
            product_id, current_stock = existing_size
            new_quantity = current_stock + product.quantity  # Add the new quantity to existing stock

            # Update the product quantity in the Products table
            await cursor.execute('''UPDATE Products 
                                    SET currentStock = ? 
                                    WHERE productID = ?''', 
                                 (new_quantity, product_id))
            await conn.commit()

            # Insert new variants into ProductVariants based on the new quantity
            variants_data = [
                (generate_barcode(), generate_sku(), product_id)
                for _ in range(product.quantity)  # Creating variants based on quantity
            ]
            
            await cursor.executemany('''INSERT INTO ProductVariants (barcode, productCode, productID)
                                        VALUES (?, ?, ?);''', variants_data)
            await conn.commit()

            return {
                "message": f"Quantity updated for product '{product.productName}' with size '{product.size}'. New quantity: {new_quantity}",
                "productID": product_id,
                "productName": product.productName,
                "productDescription": product.productDescription,
                "size": product.size,
                "quantity": new_quantity,
                "category": product.category,
                "unitPrice": product.unitPrice,
                "image_path": image_path
            }

        # Step 3: Insert the new product size if it does not exist
        await cursor.execute('''INSERT INTO Products (
                                    productName, productDescription, size, category,  
                                    unitPrice, currentStock, image_path)
                                VALUES (?, ?, ?, ?, ?, ?, ?);''',
                             (product.productName,
                              product.productDescription,
                              product.size,
                              product.category,
                              float(product.unitPrice),  
                              product.quantity,  # Using 'quantity' for 'currentStock'
                              image_path))  # Reusing the existing image path

        await conn.commit()

        # Step 4: Retrieve the last inserted productID using SQL Server's TOP 1 with ORDER BY
        await cursor.execute('''SELECT TOP 1 productID 
                                FROM Products 
                                ORDER BY productID DESC''')
        product_id_row = await cursor.fetchone()
        product_id = product_id_row[0] if product_id_row else None

        if not product_id:
            raise HTTPException(status_code=500, detail='Failed to retrieve productID after insertion')

        # Step 5: Insert multiple variants into the productVariants table based on 'quantity'
        variants_data = [
            (generate_barcode(), generate_sku(), product_id)
            for _ in range(product.quantity)  # Creating variants based on quantity
        ]
        
        await cursor.executemany('''INSERT INTO ProductVariants (barcode, productCode, productID)
                                    VALUES (?, ?, ?);''', variants_data)
        await conn.commit()

        # Step 6: Return product size, quantity, and image_path in response
        return {
            "productID": product_id,
            "productName": product.productName,
            "productDescription": product.productDescription,
            "size": product.size,
            "quantity": product.quantity,
            "category": product.category,
            "unitPrice": product.unitPrice,
            "image_path": image_path  # Include the existing image path in the response
        }

    except Exception as e:
        await conn.rollback()
        # Log the exception for debugging purposes
        print(f"Error occurred: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        await conn.close()


#delete a size
@router.patch('/products/sizes/soft-delete')
async def soft_delete_size(
    productName: str, 
    unitPrice: float, 
    category: str, 
    size: str
):
    conn = await database.get_db_connection()
    try:
        async with conn.cursor() as cursor:
            # Check if the size exists and is currently active
            await cursor.execute('''
                SELECT size 
                FROM Products 
                WHERE productName = ? 
                AND unitPrice = ? 
                AND category = ? 
                AND size = ? 
                AND isActive = 1
            ''', (productName, unitPrice, category, size))
            
            product = await cursor.fetchone()
            
            if not product:
                raise HTTPException(status_code=404, detail="Product size not found or already inactive")
            
            # Perform the soft delete by setting isActive to 0
            await cursor.execute('''
                UPDATE Products 
                SET isActive = 0 
                WHERE productName = ? 
                AND unitPrice = ? 
                AND category = ? 
                AND size = ?
            ''', (productName, unitPrice, category, size))
            
            await conn.commit()
            return {"detail": "Product size soft deleted successfully"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        await conn.close()
        
#dashboard Total Products 
@router.get("/products/count")
async def count_unique_products():
    conn = None
    try:
        # Establish database connection
        conn = await database.get_db_connection()
        cursor = await conn.cursor()

        # Query to count unique products by productName and category (grouped by productName and category)
        query = """
            SELECT COUNT(*)
            FROM (
                SELECT productName, category
                FROM Products
                WHERE isActive = 1
                GROUP BY productName, category
            ) AS unique_products;
        """
        await cursor.execute(query)
        result = await cursor.fetchone()

        # Return the count
        return {"Total Products": result[0]}

    except Exception as e:
        print(f"Error occurred: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error counting unique products: {str(e)}")
    finally:
        if conn:
            await conn.close()

#Product.js count all the products
@router.get("/products/active/count")
async def count_unique_active_products():
    conn = None
    try:
        # Establish database connection
        conn = await database.get_db_connection()
        cursor = await conn.cursor()

        # Query to count unique active products based on productName and category
        query = """
            SELECT COUNT(*)
            FROM (
                SELECT productName, category
                FROM Products
                WHERE isActive = 1
                GROUP BY productName, category
            ) AS unique_active_products
        """
        await cursor.execute(query)
        result = await cursor.fetchone()

        # Return the count
        return {"Total Unique Active Products": result[0]}

    except Exception as e:
        print(f"Error occurred: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error counting unique active products: {str(e)}")
    finally:
        if conn:
            await conn.close()

# add quantities to an existing products
@router.post('/products/add-quantity')
async def add_product_quantity(product: AddQuantity):
    conn = await database.get_db_connection()
    cursor = await conn.cursor()

    try:
        await cursor.execute(
            ''' select productID
            from Products
            where productName = ? and size = ? and category = ? and 
            isActive = 1''',
            product.productName, product.size, product.category
        )
        product_row = await cursor.fetchone()

        if not product_row:
            raise HTTPException(status_code=404, detail='Product not found.')

        product_id = product_row[0]

        variants_data= [(
                    generate_barcode(),
                    generate_sku(),
                    product_id )
                 for _ in range(product.quantity)
                 ]
        await cursor.executemany(
                    '''insert into ProductVariants (barcode, productCode, productID)
                    values (?, ?, ?)''',
                    variants_data
                )
        await conn.commit()
        return{'message': f'{product.quantity} quantities of {product.productName} added successfully.'}
    except Exception as e:
        await conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        await conn.close()
    
# get all productss 
@router.get("/products")
async def get_products():
    conn = await database.get_db_connection()
    try: 
        async with conn.cursor() as cursor:
            await cursor.execute('''
select p.productName, p.productDescription,
p.size, p.color, p.unitPrice, 
count(pv.variantID) as 'available quantity'
from products as p
left join ProductVariants as pv
on p.productID = pv.productID
where p.isActive = 1 and pv.isAvailable =1
group by p.productName, p.productDescription, p.size, p.color, p.unitPrice
''')
            products = await cursor.fetchall()
            # map column names to row values
            return [dict(zip([column[0] for column in cursor.description], row)) for row in products]
    finally: 
        await conn.close()

# get one product
@router.get('/products/{product_id}')
async def get_product(product_id: int):
    conn = await database.get_db_connection()
    cursor = await conn.cursor()
    try:
        await cursor.execute('''select p.productName, p.productDescription,
            p.size, p.color, p.unitPrice,
            p.size, p.color, p.unitPrice, 
            p.minStockLevel, p.maxStockLevel,
            count(pv.variantID) as 'available quantity'
            from products as p
            left join ProductVariants as pv
            on p.productID = pv.productID
            where p.isActive = 1 and pv.isAvailable =1
            and p.productID = ?
            group by p.productName, p.productDescription, p.size, p.color, p.unitPrice, p.minStockLevel, p.maxStockLevel''', product_id)
        #group by p.productName, p.productDescription, p.size, p.color, p.unitPrice, ''', product_id)
        product = await cursor.fetchone()
        if not product:
            raise HTTPException(status_code=404, detail='product not found')
        return dict(zip([column[0] for column in cursor.description], product))
    finally:
        await conn.close()

# get all product variants 
@router.get("/product/variants")
async def get_product_variants():
    conn = await database.get_db_connection()
    try: 
        async with conn.cursor() as cursor:
            await cursor.execute('''
select p.productName, pv.barcode, pv.productCode, 
p.productDescription, p.size, p.color, p.unitPrice, 
p.minStockLevel, p.maxStockLevel
from Products as p
full outer join ProductVariants as pv
on p.productID = pv.productID
where p.isActive = 1 and pv.isAvailable = 1;''')
            products = await cursor.fetchall()
            # map column names to row values
            return [dict(zip([column[0] for column in cursor.description], row)) for row in products]
    finally: 
        await conn.close()

# # get one product variant
# @router.get('/products/variant/{variant_id}', response_model=ProductVariant)
# async def get_product(variant_id: int):
#     conn = await database.get_db_connection()
#     cursor = await conn.cursor()
#     try:
#         await cursor.execute('''select p.productName, pv.barcode, pv.productCode, 
# p.productDescription, p.size, p.color, p.unitPrice,
# p.minStockLevel, p.maxStockLevel
# from Products as p
# full outer join ProductVariants as pv
# on p.productID = pv.productID
# where p.isActive = 1 and pv.isAvailable = 1
# and pv.variantID = ?''', variant_id)
#         row = await cursor.fetchone()
#         if not row:
#             raise HTTPException(status_code=404, detail='product variant not found')
        
#         product_variant = ProductVariant(
#             productName=row[0],
#             barcode=row[1],
#             productCode=row[2],
#             productDescription=row[3],
#             size=row[4],
#             color=row[5],
#             unitPrice=row[6],
#             minStockLevel=row[7],
#             maxStockLevel=row[8]
#         )
#         return product_variant
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))
#     finally:
#         await conn.close()


@router.put('/products')
async def update_products(productUpdate: Product, image_path: str):
    conn = await database.get_db_connection()
    try:
        async with conn.cursor() as cursor:
            # Update all products with the same productName, productDescription, unitPrice, and category
            await cursor.execute(
                '''
                UPDATE Products
                SET productName = ?, productDescription = ?, category = ?, 
                    unitPrice = ?, image_path = ?
                WHERE productName = ? AND productDescription = ? AND unitPrice = ? AND category = ?
                ''',
                product.productName,
                product.productDescription,
                product.category,
                product.unitPrice,
                image_path,  # Update the image path
                product.productName,
                product.productDescription,
                product.unitPrice,
                product.category
            )
            await conn.commit()

            return {'message': 'Products updated successfully!'}

    except Exception as e:
        await conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        await conn.close()


@router.delete('/products/{product_id}')
async def delete_product(product_id: int):
    conn = await database.get_db_connection()
    cursor = await conn.cursor()
    try:
        # Check if the product exists and is active
        await cursor.execute('''SELECT productID FROM Products WHERE productID = ? AND isActive = 1''', (product_id,))
        product = await cursor.fetchone()

        if not product:
            raise HTTPException(status_code=404, detail='Product not found or already deleted.')

        # Mark the product as inactive
        await cursor.execute('''UPDATE Products SET isActive = 0 WHERE productID = ?''', (product_id,))
        await conn.commit()

        return {'message': f'Product with ID {product_id} has been deleted (marked as inactive).'}
    except Exception as e:
        await conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        await conn.close()


# delete a product variant
@router.delete('/products/variant/{variant_id}')
async def delete_product_variant(variant_id: int):
    conn = await database.get_db_connection()
    cursor = await conn.cursor()
    try:
        # Check if the variant exists and is available
        await cursor.execute('''SELECT variantID FROM ProductVariants WHERE variantID = ? AND isAvailable = 1''', (variant_id,))
        variant = await cursor.fetchone()

        if not variant:
            raise HTTPException(status_code=404, detail='Product variant not found or already deleted.')

        # Mark the variant as unavailable
        await cursor.execute('''UPDATE ProductVariants SET isAvailable = 0 WHERE variantID = ?''', (variant_id,))
        await conn.commit()

        return {'message': f'Product variant with ID {variant_id} has been deleted (marked as unavailable).'}
    except Exception as e:
        await conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        await conn.close