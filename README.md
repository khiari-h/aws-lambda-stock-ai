# AWS Lambda Stock Manager with AI Assistant

## 🏆 AWS Lambda Hackathon 2025 Submission

**A serverless stock management solution powered by AWS Lambda and AI for real-world business efficiency.**

## 🎯 Project Overview

Smart stock management system that leverages AWS Lambda to handle inventory operations with AI-powered insights. Built to solve real-world problems for small to medium businesses managing product inventory.

## 🚀 Key Features

- **Real-time Inventory Management** - Add, update, view, and delete stock items
- **Smart Alerts** - Automatic low-stock notifications using Lambda triggers
- **AI-Powered Assistant** - Chat with your inventory using AWS Bedrock
- **Predictive Analytics** - AI estimations for restocking
- **Serverless Architecture** - Scales automatically with demand

## 🏗️ AWS Lambda Architecture

```
Frontend (S3) → API Gateway → Lambda Functions → DynamoDB
                                    ↓
                              AWS Bedrock (AI)
```

### Lambda Functions Used:
1. **`stock-api`** - Core CRUD operations (API Gateway trigger)
2. **`ai-assistant`** - AI chat and predictions (API Gateway trigger)
3. **`stock-alerts`** - Automated monitoring (EventBridge trigger)

### AWS Services:
- **AWS Lambda** - Core serverless compute
- **API Gateway** - HTTP triggers for Lambda functions
- **DynamoDB** - NoSQL database for product data
- **AWS Bedrock** - AI/ML for intelligent features
- **S3** - Static website hosting
- **EventBridge** - Scheduled triggers for monitoring

## 🛠️ Technology Stack

- **Backend**: Python 3.11 (Lambda functions)
- **Frontend**: Vanilla JavaScript/HTML
- **Database**: DynamoDB
- **AI**: AWS Bedrock (Claude)
- **Infrastructure**: AWS SAM
- **Deployment**: One-click SAM deploy

## 📦 Installation & Deployment

### Prerequisites
- AWS CLI configured
- AWS SAM CLI installed
- Python 3.11+

### Quick Deploy
```bash
git clone https://github.com/hamdane-khiari/aws-lambda-stock-ai
cd aws-lambda-stock-ai
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

### Manual Deploy
```bash
sam build
sam deploy --guided
```

## 🎥 Demo Video

**[🎬 Watch Demo Video](https://youtube.com/watch?v=PLACEHOLDER)**

*3-minute demonstration showing:*
- Stock management operations
- AI assistant interactions
- Real-time alerts
- Lambda function execution

## 💡 How AWS Lambda Powers This Solution

### Serverless Benefits Demonstrated:
- **Auto-scaling**: Handles inventory spikes without infrastructure management
- **Cost-effective**: Pay only for actual usage
- **Event-driven**: Triggers on stock changes, scheduled checks
- **Zero maintenance**: No servers to manage

### Lambda Triggers Implemented:
- **API Gateway**: HTTP requests for CRUD operations
- **EventBridge**: Scheduled stock monitoring (every hour)
- **DynamoDB Streams**: Real-time stock change notifications

## 🏅 Business Value

**Real-world problems solved:**
- Manual inventory tracking → Automated system
- Stockouts → Predictive alerts
- Data silos → Centralized dashboard
- Reactive management → Proactive AI insights

## 📊 Sample Data Structure

```json
{
  "product_id": "PROD001",
  "name": "Laptop Dell XPS",
  "quantity": 15,
  "min_threshold": 5,
  "price": 999.99,
  "category": "Electronics",
  "last_updated": "2025-06-22T10:30:00Z"
}
```

## 🧠 AI Features

- **Natural Language Queries**: "How many laptops do we have?"
- **Predictive Estimations**: AI suggests optimal reorder quantities
- **Trend Analysis**: Identifies fast/slow-moving products
- **Smart Alerts**: Context-aware notifications

## 🚀 Future Enhancements

- Multi-location inventory support
- Supplier integration APIs
- Advanced analytics dashboard
- Mobile app integration
- Barcode scanning

## 👥 Team

**Hamdane KHIARI** - Solo Developer & AWS Architect  
*Full-stack development, serverless architecture, and AI integration*

## 📝 License

MIT License - Open source for community benefit

---

**Built for AWS Lambda Hackathon 2025** 🏆  
*Solo project showcasing the power of serverless architecture for real business solutions*