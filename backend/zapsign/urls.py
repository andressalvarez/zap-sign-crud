"""
ZapSign URLs Configuration
"""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .viewsets import CompanyViewSet, DocumentViewSet, SignerViewSet

# Create router for ViewSets
router = DefaultRouter()

# Register ViewSets with router
router.register(r"companies", CompanyViewSet, basename="company")
router.register(r"documents", DocumentViewSet, basename="document")
router.register(r"signers", SignerViewSet, basename="signer")

# URL patterns
urlpatterns = [
    # API Routes via router
    path("", include(router.urls)),
]

# Available endpoints:
# GET    /api/companies/           - List all companies
# POST   /api/companies/           - Create new company
# GET    /api/companies/{id}/      - Get company details
# PUT    /api/companies/{id}/      - Update company
# DELETE /api/companies/{id}/      - Delete company

# GET    /api/documents/           - List all documents
# POST   /api/documents/           - Create new document (with ZapSign integration)
# GET    /api/documents/{id}/      - Get document details with signers
# PUT    /api/documents/{id}/      - Update document (local DB only)
# PATCH  /api/documents/{id}/      - Partial update document
# DELETE /api/documents/{id}/      - Delete document (local DB only)
# POST   /api/documents/{id}/update_status/ - Update status from ZapSign API
# POST   /api/documents/{id}/sync_with_zapsign/ - Sync with ZapSign API

# GET    /api/signers/             - List all signers
# GET    /api/signers/{id}/        - Get signer details
# POST   /api/signers/             - Not allowed (405)
# PUT    /api/signers/{id}/        - Not allowed (405)
# DELETE /api/signers/{id}/        - Not allowed (405)
