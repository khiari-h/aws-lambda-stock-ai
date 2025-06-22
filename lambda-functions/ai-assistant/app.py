import json
import boto3
from datetime import datetime, timedelta
import random

# AWS services
dynamodb = boto3.resource('dynamodb')
bedrock = boto3.client('bedrock-runtime')
table = dynamodb.Table('stock-products')

def lambda_handler(event, context):
    """Main Lambda handler for AI assistant"""
    
    # CORS headers
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
        
        # Handle POST requests
        if event['httpMethod'] == 'POST':
            body = json.loads(event['body'])
            
            if event['path'] == '/chat':
                return handle_chat(body.get('message', ''), headers)
            elif event['path'] == '/predict':
                return handle_predictions(body.get('product_id'), headers)
            elif event['path'] == '/recommendations':
                return handle_recommendations(headers)
            else:
                return {
                    'statusCode': 404,
                    'headers': headers,
                    'body': json.dumps({'error': 'Route not found'})
                }
        
        return {
            'statusCode': 405,
            'headers': headers,
            'body': json.dumps({'error': 'Method not allowed'})
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': str(e)})
        }

def handle_chat(user_message, headers):
    """Handle conversational queries about stock"""
    try:
        # Get current stock data
        stock_data = get_stock_context()
        
        # Try Bedrock first, fallback to simple chat
        try:
            # Prepare context for AI
            context = f"""
            You are a helpful stock management assistant. Here's the current inventory data:
            {json.dumps(stock_data, indent=2)}
            
            User question: {user_message}
            
            Please provide a helpful response about the inventory. Be concise and actionable.
            If asked about specific products, provide exact quantities and details.
            If asked about recommendations, suggest based on current stock levels.
            """
            
            # Call Bedrock Claude
            response = call_bedrock_claude(context)
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'response': response,
                    'context': 'AI-powered response',
                    'timestamp': datetime.now().isoformat()
                })
            }
        except:
            # Fallback to simple matching
            return handle_simple_chat(user_message, headers)
        
    except Exception as e:
        return handle_simple_chat(user_message, headers)

def handle_simple_chat(user_message, headers):
    """Fallback chat handler with keyword matching"""
    try:
        message_lower = user_message.lower()
        stock_data = get_stock_context()
        
        # Simple keyword responses
        if any(word in message_lower for word in ['low', 'alert', 'critical']):
            low_stock = [p for p in stock_data if p['quantity'] <= p['min_threshold']]
            response = f"Found {len(low_stock)} products with low stock: " + ", ".join([p['name'] for p in low_stock[:3]])
        
        elif any(word in message_lower for word in ['total', 'count', 'how many']):
            total_value = sum(float(p.get('price', 0)) * p['quantity'] for p in stock_data)
            response = f"You have {len(stock_data)} products in inventory with a total value of ${total_value:.2f}"
        
        elif any(word in message_lower for word in ['expensive', 'valuable', 'high price']):
            expensive = sorted(stock_data, key=lambda x: float(x.get('price', 0)), reverse=True)[:3]
            response = f"Most valuable products: " + ", ".join([f"{p['name']} (${float(p.get('price', 0))})" for p in expensive])
        
        else:
            # Search for product names in the message
            found_products = []
            for product in stock_data:
                if any(word in product['name'].lower() for word in message_lower.split()):
                    found_products.append(product)
            
            if found_products:
                product = found_products[0]
                price = float(product.get('price', 0))
                response = f"{product['name']}: {product['quantity']} units in stock, ${price} each"
            else:
                response = "I can help you with stock information. Try asking about product quantities, low stock alerts, or valuable items."
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'response': response,
                'context': 'Simple keyword matching',
                'timestamp': datetime.now().isoformat()
            })
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': f'Chat failed: {str(e)}'})
        }

def handle_predictions(product_id, headers):
    """Handle demand predictions for products"""
    try:
        if not product_id:
            # Get predictions for all low stock items
            stock_data = get_stock_context()
            low_stock = [p for p in stock_data if p['quantity'] <= p['min_threshold']]
            
            predictions = []
            for product in low_stock[:5]:  # Limit to 5 products
                pred = generate_simple_prediction(product)
                predictions.append(pred)
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'predictions': predictions,
                    'message': f'Predictions for {len(predictions)} low-stock products'
                })
            }
        else:
            # Get prediction for specific product
            response = table.get_item(Key={'product_id': product_id})
            if 'Item' not in response:
                return {
                    'statusCode': 404,
                    'headers': headers,
                    'body': json.dumps({'error': 'Product not found'})
                }
            
            product = response['Item']
            prediction = generate_simple_prediction(product)
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'prediction': prediction,
                    'product_id': product_id
                })
            }
            
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': f'Prediction failed: {str(e)}'})
        }

def handle_recommendations(headers):
    """Handle restocking recommendations"""
    try:
        stock_data = get_stock_context()
        recommendations = []
        
        for product in stock_data:
            if product['quantity'] <= product['min_threshold']:
                # Calculate recommended order quantity
                current_qty = product['quantity']
                min_threshold = product['min_threshold']
                
                # Simple algorithm: order 3x threshold or current stock, whichever is higher
                recommended_qty = max(min_threshold * 3, current_qty * 2)
                
                urgency = 'Critical' if current_qty == 0 else 'High' if current_qty <= min_threshold // 2 else 'Medium'
                
                price = float(product.get('price', 0))
                recommendations.append({
                    'product_id': product['product_id'],
                    'product_name': product['name'],
                    'current_quantity': current_qty,
                    'recommended_order': recommended_qty,
                    'urgency': urgency,
                    'estimated_cost': recommended_qty * price,
                    'reason': f'Stock below threshold ({min_threshold})'
                })
        
        # Sort by urgency and current quantity
        urgency_order = {'Critical': 0, 'High': 1, 'Medium': 2}
        recommendations.sort(key=lambda x: (urgency_order[x['urgency']], x['current_quantity']))
        
        total_cost = sum(r['estimated_cost'] for r in recommendations)
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'recommendations': recommendations,
                'total_cost': round(total_cost, 2),
                'message': f'{len(recommendations)} products need restocking'
            })
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': f'Recommendations failed: {str(e)}'})
        }

def get_stock_context():
    """Get current stock data for AI context"""
    try:
        response = table.scan()
        products = response['Items']
        
        # Convert Decimal to float for JSON serialization
        for product in products:
            if 'price' in product:
                product['price'] = float(product['price'])
        
        return products
    except Exception as e:
        print(f"Error getting stock context: {e}")
        return []

def call_bedrock_claude(prompt):
    """Call AWS Bedrock Claude for AI responses"""
    try:
        # Prepare request for Claude
        request_body = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 300,
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        }
        
        # Call Bedrock
        response = bedrock.invoke_model(
            modelId="anthropic.claude-3-sonnet-20240229-v1:0",
            body=json.dumps(request_body),
            contentType="application/json"
        )
        
        # Parse response
        response_body = json.loads(response['body'].read())
        return response_body['content'][0]['text']
        
    except Exception as e:
        print(f"Bedrock error: {e}")
        return f"AI temporarily unavailable. Error: {str(e)}"

def generate_simple_prediction(product):
    """Generate simple demand prediction for a product"""
    try:
        current_qty = product['quantity']
        min_threshold = product['min_threshold']
        
        # Simple prediction algorithm
        if current_qty == 0:
            urgency = "Critical"
            days_until_stockout = 0
            recommended_action = "Order immediately"
        elif current_qty <= min_threshold // 2:
            urgency = "High"
            days_until_stockout = random.randint(3, 7)
            recommended_action = "Order within 24 hours"
        else:
            urgency = "Medium"
            days_until_stockout = random.randint(7, 21)
            recommended_action = "Plan order this week"
        
        # Simulate demand forecast
        weekly_demand = random.randint(1, max(1, current_qty // 2))
        monthly_demand = weekly_demand * 4
        
        return {
            'product_id': product['product_id'],
            'product_name': product['name'],
            'current_stock': current_qty,
            'predicted_weekly_demand': weekly_demand,
            'predicted_monthly_demand': monthly_demand,
            'estimated_days_until_stockout': days_until_stockout,
            'urgency_level': urgency,
            'recommended_action': recommended_action,
            'confidence': random.randint(75, 95),  # Simulated confidence
            'generated_at': datetime.now().isoformat()
        }
        
    except Exception as e:
        return {
            'error': f'Prediction failed: {str(e)}',
            'product_id': product.get('product_id', 'unknown')
        }