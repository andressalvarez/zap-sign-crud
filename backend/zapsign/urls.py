"""
ZapSign URLs Configuration
"""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

# Crear router para ViewSets
router = DefaultRouter()

# URLs patterns
urlpatterns = [
    # API Routes via router
    path("", include(router.urls)),
]
