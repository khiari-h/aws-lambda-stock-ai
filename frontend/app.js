// Configuration API - À remplacer par vos vrais endpoints Lambda
const API_CONFIG = {
    stockAPI: 'https://your-api-gateway-url/prod',  // Stock API Lambda
    aiAPI: 'https://your-ai-api-gateway-url/prod'   // AI Assistant Lambda
};

// État global de l'application
let appState = {
    products: [],
    currentEditProduct: null,
    isLoading: false
};

// Initialisation de l'application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    setupEventListeners();
    loadProducts();
    setupFormSubmission();
}

function setupEventListeners() {
    // Navigation tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => showTab(e.target.dataset.tab, e.target));
    });

    // Chat input
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.addEventListener('keypress', handleChatKeyPress);
    }
}

// === NAVIGATION ===
function showTab(tabName, buttonElement) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active from all buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    const targetTab = document.getElementById(tabName);
    if (targetTab) {
        targetTab.classList.add('active');
    }
    
    // Add active to clicked button
    if (buttonElement) {
        buttonElement.classList.add('active');
    }

    // Load data based on tab
    switch(tabName) {
        case 'inventory':
            loadProducts();
            break;
        case 'alerts':
            loadAlerts();
            break;
        case 'ai-assistant':
            // Chat is always ready
            break;
    }
}

// === PRODUCTS MANAGEMENT ===
async function loadProducts() {
    setLoading('productsGrid', true);
    
    try {
        const response = await fetch(`${API_CONFIG.stockAPI}/products`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        appState.products = data.products || [];
        
        renderProducts(appState.products);
        updateStats();
        
    } catch (error) {
        console.error('Error loading products:', error);
        showError('Failed to load products. Using demo data.');
        loadDemoProducts();
    }
}

function loadDemoProducts() {
    // Données de démo pour développement local
    appState.products = [
        {
            product_id: 'DEMO001',
            name: '💻 Laptop Dell XPS',
            quantity: 15,
            price: 999.00,
            min_threshold: 5,
            category: 'Electronics',
            description: 'High-performance laptop'
        },
        {
            product_id: 'DEMO002',
            name: '🖱️ Wireless Mouse',
            quantity: 2,
            price: 25.00,
            min_threshold: 10,
            category: 'Electronics',
            description: 'Ergonomic wireless mouse'
        },
        {
            product_id: 'DEMO003',
            name: '⌨️ Gaming Keyboard',
            quantity: 0,
            price: 50.00,
            min_threshold: 5,
            category: 'Electronics',
            description: 'Mechanical gaming keyboard'
        },
        {
            product_id: 'DEMO004',
            name: '📱 iPhone 15',
            quantity: 8,
            price: 799.00,
            min_threshold: 3,
            category: 'Electronics',
            description: 'Latest iPhone model'
        }
    ];
    
    renderProducts(appState.products);
    updateStats();
}

function renderProducts(products) {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;

    if (products.length === 0) {
        grid.innerHTML = '<div class="loading">No products found. Add some products to get started!</div>';
        return;
    }

    grid.innerHTML = products.map(product => `
        <div class="product-card">
            <div class="product-header">
                <div>
                    <div class="product-name">${product.name}</div>
                    <div class="product-category">${product.category || 'General'}</div>
                </div>
            </div>
            <div class="product-details">
                <div class="product-stat">
                    <span class="stat-label">Quantity:</span>
                    <span class="stat-value ${getQuantityClass(product.quantity, product.min_threshold)}">${product.quantity}</span>
                </div>
                <div class="product-stat">
                    <span class="stat-label">Price:</span>
                    <span class="stat-value">$${product.price?.toFixed(2) || '0.00'}</span>
                </div>
                <div class="product-stat">
                    <span class="stat-label">Min Threshold:</span>
                    <span class="stat-value">${product.min_threshold}</span>
                </div>
                ${product.description ? `
                <div class="product-stat">
                    <span class="stat-label">Description:</span>
                    <span class="stat-value">${product.description}</span>
                </div>
                ` : ''}
            </div>
            <div class="product-actions">
                <button class="btn btn-edit btn-sm" onclick="editProduct('${product.product_id}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-delete btn-sm" onclick="deleteProduct('${product.product_id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `).join('');

    setLoading('productsGrid', false);
}

function getQuantityClass(quantity, threshold) {
    if (quantity === 0) return 'quantity-low';
    if (quantity <= threshold) return 'quantity-low';
    if (quantity <= threshold * 2) return 'quantity-medium';
    return 'quantity-good';
}

function updateStats() {
    const products = appState.products;
    const totalProducts = products.length;
    const lowStockCount = products.filter(p => p.quantity <= p.min_threshold).length;
    const totalValue = products.reduce((sum, p) => sum + (p.quantity * (p.price || 0)), 0);

    // Update DOM elements
    const totalProductsEl = document.getElementById('totalProducts');
    const lowStockCountEl = document.getElementById('lowStockCount');
    const totalValueEl = document.getElementById('totalValue');

    if (totalProductsEl) totalProductsEl.textContent = totalProducts;
    if (lowStockCountEl) lowStockCountEl.textContent = lowStockCount;
    if (totalValueEl) totalValueEl.textContent = `$${totalValue.toFixed(2)}`;
}

// === PRODUCT FORMS ===
function setupFormSubmission() {
    const productForm = document.getElementById('productForm');
    const editForm = document.getElementById('editProductForm');

    if (productForm) {
        productForm.addEventListener('submit', handleAddProduct);
    }

    if (editForm) {
        editForm.addEventListener('submit', handleEditProduct);
    }
}

async function handleAddProduct(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const productData = {
        name: document.getElementById('productName').value,
        quantity: parseInt(document.getElementById('productQuantity').value),
        price: parseFloat(document.getElementById('productPrice').value) || 0,
        category: document.getElementById('productCategory').value,
        min_threshold: parseInt(document.getElementById('minThreshold').value) || 5,
        description: document.getElementById('productDescription').value
    };

    try {
        const response = await fetch(`${API_CONFIG.stockAPI}/products`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(productData)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        showSuccess('Product added successfully!');
        e.target.reset();
        loadProducts();
        showTab('inventory');

    } catch (error) {
        console.error('Error adding product:', error);
        showError('Failed to add product. Please try again.');
    }
}

async function editProduct(productId) {
    const product = appState.products.find(p => p.product_id === productId);
    if (!product) return;

    appState.currentEditProduct = product;
    
    // Fill edit form
    document.getElementById('editProductId').value = product.product_id;
    document.getElementById('editProductName').value = product.name;
    document.getElementById('editProductQuantity').value = product.quantity;
    document.getElementById('editProductPrice').value = product.price || 0;
    document.getElementById('editProductCategory').value = product.category || 'General';
    document.getElementById('editMinThreshold').value = product.min_threshold;

    // Show modal
    document.getElementById('editModal').style.display = 'block';
}

async function handleEditProduct(e) {
    e.preventDefault();
    
    const productId = document.getElementById('editProductId').value;
    const updateData = {
        name: document.getElementById('editProductName').value,
        quantity: parseInt(document.getElementById('editProductQuantity').value),
        price: parseFloat(document.getElementById('editProductPrice').value) || 0,
        category: document.getElementById('editProductCategory').value,
        min_threshold: parseInt(document.getElementById('editMinThreshold').value)
    };

    try {
        const response = await fetch(`${API_CONFIG.stockAPI}/products/${productId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        showSuccess('Product updated successfully!');
        closeEditModal();
        loadProducts();

    } catch (error) {
        console.error('Error updating product:', error);
        showError('Failed to update product. Please try again.');
    }
}

async function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
        const response = await fetch(`${API_CONFIG.stockAPI}/products/${productId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        showSuccess('Product deleted successfully!');
        loadProducts();

    } catch (error) {
        console.error('Error deleting product:', error);
        showError('Failed to delete product. Please try again.');
    }
}

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
    appState.currentEditProduct = null;
}

// === ALERTS & RECOMMENDATIONS ===
async function loadAlerts() {
    const container = document.getElementById('alertsContainer');
    if (!container) return;

    setLoading('alertsContainer', true);

    try {
        const response = await fetch(`${API_CONFIG.stockAPI}/alerts`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        renderAlerts(data.alerts || []);

    } catch (error) {
        console.error('Error loading alerts:', error);
        renderDemoAlerts();
    }
}

function renderDemoAlerts() {
    const lowStockProducts = appState.products.filter(p => p.quantity <= p.min_threshold);
    renderAlerts(lowStockProducts);
}

function renderAlerts(alerts) {
    const container = document.getElementById('alertsContainer');
    if (!container) return;

    if (alerts.length === 0) {
        container.innerHTML = '<div class="alert-card"><i class="fas fa-check-circle alert-icon" style="color: #28a745;"></i><div class="alert-content"><div class="alert-title">All Good!</div><div class="alert-description">No stock alerts at this time.</div></div></div>';
        return;
    }

    container.innerHTML = alerts.map(alert => `
        <div class="alert-card ${alert.quantity === 0 ? 'alert-critical' : ''}">
            <i class="fas fa-${alert.quantity === 0 ? 'exclamation-circle' : 'exclamation-triangle'} alert-icon"></i>
            <div class="alert-content">
                <div class="alert-title">${alert.name} - ${alert.quantity === 0 ? 'CRITICAL' : 'LOW STOCK'}</div>
                <div class="alert-description">
                    ${alert.quantity === 0 ? 'Out of stock - Order immediately!' : `${alert.quantity} units left - Below threshold of ${alert.min_threshold}`}
                </div>
            </div>
        </div>
    `).join('');

    setLoading('alertsContainer', false);
}

async function getRecommendations() {
    const container = document.getElementById('recommendationsContainer');
    if (!container) return;

    try {
        const response = await fetch(`${API_CONFIG.aiAPI}/recommendations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        renderRecommendations(data.recommendations || []);

    } catch (error) {
        console.error('Error getting recommendations:', error);
        renderDemoRecommendations();
    }
}

function renderDemoRecommendations() {
    const lowStockProducts = appState.products.filter(p => p.quantity <= p.min_threshold);
    const recommendations = lowStockProducts.map(product => ({
        product_name: product.name,
        current_quantity: product.quantity,
        recommended_order: Math.max(product.min_threshold * 3, 10),
        urgency: product.quantity === 0 ? 'Critical' : product.quantity <= product.min_threshold / 2 ? 'High' : 'Medium',
        estimated_cost: Math.max(product.min_threshold * 3, 10) * (product.price || 0)
    }));
    
    renderRecommendations(recommendations);
}

function renderRecommendations(recommendations) {
    const container = document.getElementById('recommendationsContainer');
    if (!container) return;

    if (recommendations.length === 0) {
        container.innerHTML = '<div class="recommendation-card"><div class="recommendation-title">No recommendations needed</div><div>All products are well stocked!</div></div>';
        return;
    }

    container.innerHTML = recommendations.map(rec => `
        <div class="recommendation-card">
            <div class="recommendation-header">
                <span class="recommendation-title">${rec.product_name}</span>
                <span class="urgency-badge urgency-${rec.urgency.toLowerCase()}">${rec.urgency.toUpperCase()}</span>
            </div>
            <div>
                Current: ${rec.current_quantity} units | 
                Recommended order: ${rec.recommended_order} units | 
                Estimated cost: $${rec.estimated_cost?.toFixed(2) || '0.00'}
            </div>
        </div>
    `).join('');
}

// === AI CHAT ===
function handleChatKeyPress(event) {
    if (event.key === 'Enter') {
        sendChatMessage();
    }
}

async function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const messages = document.getElementById('chatMessages');
    
    if (!input || !messages) return;
    
    const message = input.value.trim();
    if (!message) return;

    // Add user message
    addChatMessage(message, 'user');
    input.value = '';

    // Show typing indicator
    const typingId = addChatMessage('AI is thinking...', 'assistant', true);

    try {
        const response = await fetch(`${API_CONFIG.aiAPI}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        // Remove typing indicator
        document.getElementById(typingId)?.remove();
        
        // Add AI response
        addChatMessage(data.response || 'Sorry, I couldn\'t process that request.', 'assistant');

    } catch (error) {
        console.error('Error sending chat message:', error);
        
        // Remove typing indicator
        document.getElementById(typingId)?.remove();
        
        // Add fallback response
        const fallbackResponse = generateFallbackResponse(message);
        addChatMessage(fallbackResponse, 'assistant');
    }
}

function addChatMessage(message, sender, isTemporary = false) {
    const messages = document.getElementById('chatMessages');
    if (!messages) return;

    const messageId = isTemporary ? `temp-${Date.now()}` : null;
    const messageEl = document.createElement('div');
    if (messageId) messageEl.id = messageId;
    
    messageEl.className = `chat-message ${sender}`;
    messageEl.innerHTML = `
        <div class="message-content">
            ${sender === 'assistant' ? '<i class="fas fa-robot"></i>' : ''}
            ${message}
        </div>
    `;

    messages.appendChild(messageEl);
    messages.scrollTop = messages.scrollHeight;
    
    return messageId;
}

function generateFallbackResponse(message) {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('low') || lowerMessage.includes('alert')) {
        const lowStock = appState.products.filter(p => p.quantity <= p.min_threshold);
        return `I found ${lowStock.length} products with low stock: ${lowStock.map(p => p.name).slice(0, 3).join(', ')}`;
    }
    
    if (lowerMessage.includes('total') || lowerMessage.includes('count')) {
        return `You have ${appState.products.length} products in inventory.`;
    }
    
    if (lowerMessage.includes('value') || lowerMessage.includes('worth')) {
        const totalValue = appState.products.reduce((sum, p) => sum + (p.quantity * (p.price || 0)), 0);
        return `Your total inventory value is $${totalValue.toFixed(2)}.`;
    }
    
    return "I'm here to help with your inventory! Try asking about stock levels, alerts, or product information.";
}

async function quickEstimation() {
    addChatMessage('Show me demand estimations for low stock products', 'user');
    
    try {
        const response = await fetch(`${API_CONFIG.aiAPI}/estimate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const estimations = data.estimations || [];
        
        if (estimations.length === 0) {
            addChatMessage('No estimations needed - all products are well stocked!', 'assistant');
        } else {
            const response = `Here are demand estimations for ${estimations.length} products:\n\n${estimations.map(est => 
                `• ${est.product_name}: ${est.estimated_weekly_demand || 'N/A'} units/week (${est.urgency_level} priority)`
            ).join('\n')}`;
            addChatMessage(response, 'assistant');
        }

    } catch (error) {
        console.error('Error getting estimations:', error);
        addChatMessage('Demand estimations: Gaming Keyboard (High demand - 15 units/week), Wireless Mouse (Medium demand - 8 units/week)', 'assistant');
    }
}

function askQuestion(question) {
    const input = document.getElementById('chatInput');
    if (input) {
        input.value = question;
        sendChatMessage();
    }
}

// === UTILITY FUNCTIONS ===
function setLoading(elementId, isLoading) {
    const element = document.getElementById(elementId);
    if (!element) return;

    if (isLoading) {
        element.innerHTML = '<div class="loading">Loading...</div>';
    }
}

function showSuccess(message) {
    showToast(message, 'success');
}

function showError(message) {
    showToast(message, 'error');
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// === GLOBAL FUNCTIONS (called from HTML) ===
window.showTab = showTab;
window.loadProducts = loadProducts;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.closeEditModal = closeEditModal;
window.loadAlerts = loadAlerts;
window.getRecommendations = getRecommendations;
window.sendChatMessage = sendChatMessage;
window.handleChatKeyPress = handleChatKeyPress;
window.quickEstimation = quickEstimation;
window.askQuestion = askQuestion;

// Modal event listeners
document.addEventListener('click', function(e) {
    const modal = document.getElementById('editModal');
    if (e.target === modal) {
        closeEditModal();
    }
});

// Initialize tooltips and other enhancements
document.addEventListener('DOMContentLoaded', function() {
    // Add any additional initialization here
    console.log('AWS Lambda Stock Manager initialized successfully!');
});