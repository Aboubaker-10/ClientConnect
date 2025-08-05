#!/bin/bash

# Build Customer Portal for ERPNext Integration
echo "🚀 Building Customer Portal for ERPNext..."

# Build the React app
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build completed successfully!"
    echo ""
    echo "📁 Files created in: dist/erpnext/"
    echo "   - customer-portal.js"
    echo "   - customer-portal.css"
    echo "   - assets/ (images, fonts, etc.)"
    echo ""
    echo "📋 Next Steps:"
    echo "1. Upload files from 'dist/erpnext/' to ERPNext's public/files/customer-portal/"
    echo "2. Create a Web Page in ERPNext with route: /customer-portal"
    echo "3. Copy content from 'erpnext-web-page.html' to the Web Page"
    echo "4. Set Published = Yes"
    echo ""
    echo "🌐 Your portal will be available at: https://your-erpnext-site.com/customer-portal"
else
    echo "❌ Build failed!"
    exit 1
fi