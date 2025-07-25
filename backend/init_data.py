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

    # Crear company con token real actualizado
    company, created = Company.objects.get_or_create(
        name="ZapSign Demo Company",
        defaults={
            "api_token": "0de33489-0908-42e0-99a7-299c513ac50b090986b2-8d4b-4ec5-b8f5-32d3bd5f67af"
        },
    )

    # Si ya existe, actualizar el token
    if not created and company.api_token != "0de33489-0908-42e0-99a7-299c513ac50b090986b2-8d4b-4ec5-b8f5-32d3bd5f67af":
        company.api_token = "0de33489-0908-42e0-99a7-299c513ac50b090986b2-8d4b-4ec5-b8f5-32d3bd5f67af"
        company.save()
        print(f"🔄 Token actualizado para: {company.name}")

    if created:
        print(f"✅ Company creada: {company.name} (ID: {company.id})")
    else:
        print(f"ℹ️  Company ya existe: {company.name} (ID: {company.id})")

    print(f"📊 Total companies: {Company.objects.count()}")
    print("🎉 Datos iniciales listos!")


if __name__ == "__main__":
    create_initial_data()
