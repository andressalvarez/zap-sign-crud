#!/usr/bin/env python
"""
Script para inicializar datos básicos en la aplicación ZapSign
"""
import os
import sys

import django

# Setup Django
sys.path.append("/app")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from zapsign.models import Company


def create_initial_data():
    """Crear datos iniciales: Company con token ZapSign"""

    print("🚀 Inicializando datos básicos...")

    # Crear company con token real
    company, created = Company.objects.get_or_create(
        name="ZapSign Demo Company",
        defaults={
            "api_token": "fa895995-6797-49fe-8561-35102d37ba9bf44a60bf-0776-4dac-aeb6-cb97f4fc7632"
        },
    )

    if created:
        print(f"✅ Company creada: {company.name} (ID: {company.id})")
    else:
        print(f"ℹ️  Company ya existe: {company.name} (ID: {company.id})")

    print(f"📊 Total companies: {Company.objects.count()}")
    print("🎉 Datos iniciales listos!")


if __name__ == "__main__":
    create_initial_data()
