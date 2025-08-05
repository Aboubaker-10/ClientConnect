# ERPNext Customer Portal Deployment Guide

## Step 1: Build the Application

```bash
./build-for-erpnext.sh
```

This creates optimized files in `dist/erpnext/`:
- `customer-portal.js` - Main application
- `customer-portal.css` - Styles
- `assets/` - Images, fonts, etc.

## Step 2: Upload Files to ERPNext

### Method A: Via ERPNext File Manager
1. Login to ERPNext as Administrator
2. Go to **File Manager** (search "File" in awesome bar)
3. Create new folder: `customer-portal`
4. Upload all files from `dist/erpnext/` to this folder

### Method B: Via Server Access
```bash
# Copy files to ERPNext's public folder
scp -r dist/erpnext/* user@your-server:/path/to/erpnext/sites/assets/customer-portal/
```

## Step 3: Create Web Page in ERPNext

1. Go to **Website > Web Page > New**
2. Fill in the form:
   - **Title**: Customer Portal
   - **Route**: customer-portal
   - **Published**: ✅ Yes
   - **Show Sidebar**: ❌ No
   - **Show Title**: ❌ No
   - **Show Header**: ❌ No
   - **Show Footer**: ❌ No

3. In **Main Section**, copy content from `erpnext-web-page.html`

4. **Save** the Web Page

## Step 4: Configure Your Node.js Server

Ensure your Node.js server (with ERPNext integration) is running:

```bash
# In your project directory
npm start
```

The server should be accessible from your ERPNext domain.

## Step 5: Test the Integration

1. Visit: `https://your-erpnext-site.com/customer-portal`
2. You should see the customer portal login page
3. Test login with an ERPNext Customer ID
4. Verify all features work (dashboard, orders, invoices, place order)

## Step 6: Optional Enhancements

### Add Navigation Link
In ERPNext, go to **Website Settings** and add custom HTML:

```html
<script>
frappe.ready(function() {
    // Add portal link to navbar
    $('.navbar-nav').append(`
        <li class="nav-item">
            <a class="nav-link" href="/customer-portal">Customer Portal</a>
        </li>
    `);
});
</script>
```

### Custom Domain (Optional)
Set up subdomain: `portal.your-company.com` → `/customer-portal`

## Troubleshooting

### Portal doesn't load
- Check browser console for errors
- Verify file paths: `/assets/customer-portal/customer-portal.js`
- Ensure files uploaded correctly

### API calls fail
- Verify Node.js server is running
- Check ERPNext API permissions
- Ensure CORS is configured if needed

### Styling issues
- Check if ERPNext CSS conflicts with portal CSS
- Verify `customer-portal.css` is loading

## File Structure in ERPNext

```
/sites/assets/customer-portal/
├── customer-portal.js
├── customer-portal.css
└── assets/
    ├── images/
    └── fonts/
```

## Success!

Your customer portal is now integrated into ERPNext's website at:
`https://your-erpnext-site.com/customer-portal`