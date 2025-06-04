# Golden Niche IMS - Django Integration

This project integrates the Golden Niche Inventory Management System (IMS) frontend with a Django backend API.

## Features

- Products management
- Stock in/out tracking
- Inventory statistics
- Dashboard with charts and low stock alerts
- Django Admin interface for data management

## Technical Stack

- **Frontend**: HTML, CSS, JavaScript, Bootstrap 5, Chart.js
- **Backend**: Django, Django REST Framework
- **Database**: SQLite (default, can be changed in settings)

## Project Structure

- `/ims_project/` - Django project settings
- `/inventory/` - Django app with models, views, and API endpoints
- `/frontend/` - Frontend static files (HTML, CSS, JS)
- `/templates/` - Django templates
- `/staticfiles/` - Collected static files for deployment

## Setup

1. Clone the repository
2. Create and activate a virtual environment:
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```
   pip install django djangorestframework django-cors-headers
   ```
4. Run migrations:
   ```
   python manage.py migrate
   ```
5. Load initial data:
   ```
   python manage.py load_initial_data
   ```
6. Create a superuser:
   ```
   python manage.py createsuperuser
   ```
7. Collect static files:
   ```
   python manage.py collectstatic
   ```
8. Run the development server:
   ```
   python manage.py runserver
   ```

## Usage

- Access the IMS frontend at: http://localhost:8000/app/
- Access the Django admin at: http://localhost:8000/admin/
- Access the API at: http://localhost:8000/api/

## API Endpoints

- `/api/products/` - Products CRUD
- `/api/product-types/` - Product Types CRUD
- `/api/stock-history/` - Stock History CRUD
- `/api/products/low_stock/` - Low Stock Products
- `/api/products/stats/` - Inventory Statistics

## Demo Login

For the frontend demo, use:
- Email: admin@example.com
- Password: password123

## License

This project is licensed under the MIT License - see the LICENSE file for details. # goldennicheims
