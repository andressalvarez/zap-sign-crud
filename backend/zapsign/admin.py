"""
ZapSign Admin Configuration
"""
from django.contrib import admin

from .models import Company, Document, Signer


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ["name", "created_at", "last_updated_at"]
    list_filter = ["created_at"]
    search_fields = ["name"]
    readonly_fields = ["created_at", "last_updated_at"]


class SignerInline(admin.TabularInline):
    model = Signer
    extra = 1
    readonly_fields = ["token", "external_id"]


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ["name", "status", "company", "created_by", "created_at"]
    list_filter = ["status", "company", "created_at"]
    search_fields = ["name", "created_by"]
    readonly_fields = [
        "open_id",
        "token",
        "external_id",
        "created_at",
        "last_updated_at",
    ]
    inlines = [SignerInline]

    fieldsets = (
        (
            "Document Information",
            {"fields": ("name", "company", "created_by", "status")},
        ),
        (
            "ZapSign Data",
            {"fields": ("open_id", "token", "external_id"), "classes": ("collapse",)},
        ),
        (
            "Timestamps",
            {"fields": ("created_at", "last_updated_at"), "classes": ("collapse",)},
        ),
    )


@admin.register(Signer)
class SignerAdmin(admin.ModelAdmin):
    list_display = ["name", "email", "status", "document", "document__company"]
    list_filter = ["status", "document__company"]
    search_fields = ["name", "email", "document__name"]
    readonly_fields = ["token", "external_id"]

    def document__company(self, obj):
        return obj.document.company.name

    document__company.short_description = "Company"
