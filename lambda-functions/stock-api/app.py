import json
import boto3
import uuid
from datetime import datetime
from decimal import Decimal

# DynamoDB setup
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('stock-products')

def lambda_handler(event, context):
    """Main Lambda handler for stock API"""
    
    # CORS headers
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    }
    
    try:
        # Handle OPTIONS request for CORS
        if event['httpMethod'] == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({'message': 'CORS preflight'})
            }
        
        # Route requests
        method = event['httpMethod']
        path = event['path']
        
        if method == 'GET' and path == '/products':
            return get_all_products(headers)
        elif method == 'GET' and path.startswith('/products/'):
            product_id = path.split('/')[-1]
            return get_product(product_id, headers)
        elif method == 'POST' and path == '/products':
            return create_product(json.loads(event['body']), headers)
        elif method == 'PUT' and path.startswith('/products/'):
            product_id = path.split('/')[-1]
            return update_product(product_id, json.loads(event['body']), headers)
        elif method == 'DELETE' and path.startswith('/products/'):
            product_id = path.split('/')[-1]
            return delete_product(product_id, headers)
        elif method == 'GET' and path == '/alerts':
            return get_low_stock_alerts(headers)
        else:
            return {
                'statusCode': 404,
                'headers': headers,
                'body': json.dumps({'error': 'Route not found'})
            }
            
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': str(e)})
        }

def get_all_products(headers):
    """Get all products from stock"""
    try:
        response = table.scan()
        products = response['Items']
        
        # Convert Decimal to float for JSON serialization
        for product in products:
            if 'price' in product:
                product['price'] = float(product['price'])
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'products': products,
                'count': len(products)
            })
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': f'Failed to get products: {str(e)}'})
        }

def get_product(product_id, headers):
    """Get single product by ID"""
    try:
        response = table.get_item(Key={'product_id': product_id})
        
        if 'Item' not in response:
            return {
                'statusCode': 404,
                'headers': headers,
                'body': json.dumps({'error': 'Product not found'})
            }
        
        product = response['Item']
        if 'price' in product:
            product['price'] = float(product['price'])
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({'product': product})
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': f'Failed to get product: {str(e)}'})
        }

def create_product(data, headers):
    """Create new product"""
    try:
        # Generate unique ID
        product_id = str(uuid.uuid4())[:8].upper()
        
        # Prepare item
        item = {
            'product_id': product_id,
            'name': data['name'],
            'quantity': int(data['quantity']),
            'min_threshold': int(data.get('min_threshold', 5)),
            'price': Decimal(str(data.get('price', 0))),
            'category': data.get('category', 'General'),
            'description': data.get('description', ''),
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }
        
        # Save to DynamoDB
        table.put_item(Item=item)
        
        # Convert Decimal for response
        item['price'] = float(item['price'])
        
        return {
            'statusCode': 201,
            'headers': headers,
            'body': json.dumps({
                'message': 'Product created successfully',
                'product': item
            })
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': f'Failed to create product: {str(e)}'})
        }

def update_product(product_id, data, headers):
    """Update existing product"""
    try:
        # Check if product exists
        response = table.get_item(Key={'product_id': product_id})
        if 'Item' not in response:
            return {
                'statusCode': 404,
                'headers': headers,
                'body': json.dumps({'error': 'Product not found'})
            }
        
        # Prepare update expression
        update_expression = "SET updated_at = :updated_at"
        expression_values = {':updated_at': datetime.now().isoformat()}
        
        # Add fields to update
        if 'name' in data:
            update_expression += ", #name = :name"
            expression_values[':name'] = data['name']
        if 'quantity' in data:
            update_expression += ", quantity = :quantity"
            expression_values[':quantity'] = int(data['quantity'])
        if 'min_threshold' in data:
            update_expression += ", min_threshold = :min_threshold"
            expression_values[':min_threshold'] = int(data['min_threshold'])
        if 'price' in data:
            update_expression += ", price = :price"
            expression_values[':price'] = Decimal(str(data['price']))
        if 'category' in data:
            update_expression += ", category = :category"
            expression_values[':category'] = data['category']
        if 'description' in data:
            update_expression += ", description = :description"
            expression_values[':description'] = data['description']
        
        # Update item
        table.update_item(
            Key={'product_id': product_id},
            UpdateExpression=update_expression,
            ExpressionAttributeValues=expression_values,
            ExpressionAttributeNames={'#name': 'name'} if 'name' in data else {}
        )
        
        # Get updated item
        updated_response = table.get_item(Key={'product_id': product_id})
        updated_item = updated_response['Item']
        if 'price' in updated_item:
            updated_item['price'] = float(updated_item['price'])
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'message': 'Product updated successfully',
                'product': updated_item
            })
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': f'Failed to update product: {str(e)}'})
        }

def delete_product(product_id, headers):
    """Delete product"""
    try:
        # Check if product exists
        response = table.get_item(Key={'product_id': product_id})
        if 'Item' not in response:
            return {
                'statusCode': 404,
                'headers': headers,
                'body': json.dumps({'error': 'Product not found'})
            }
        
        # Delete item
        table.delete_item(Key={'product_id': product_id})
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({'message': 'Product deleted successfully'})
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': f'Failed to delete product: {str(e)}'})
        }

def get_low_stock_alerts(headers):
    """Get products with low stock (quantity <= min_threshold)"""
    try:
        response = table.scan()
        products = response['Items']
        
        # Filter low stock products
        low_stock = []
        for product in products:
            if product['quantity'] <= product['min_threshold']:
                if 'price' in product:
                    product['price'] = float(product['price'])
                low_stock.append(product)
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'alerts': low_stock,
                'count': len(low_stock),
                'message': f'{len(low_stock)} products need restocking'
            })
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': f'Failed to get alerts: {str(e)}'})
        }