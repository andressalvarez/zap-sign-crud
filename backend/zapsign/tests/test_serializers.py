"""
Tests for ZapSign Serializers
"""
from django.test import TestCase
from rest_framework.test import APITestCase

from ..models import Company, Document, Signer
from ..serializers import (
    CompanySerializer,
    DocumentCreateSerializer,
    DocumentDetailSerializer,
    DocumentListSerializer,
    DocumentStatusUpdateSerializer,
    DocumentUpdateSerializer,
    SignerSerializer,
)


class CompanySerializerTest(TestCase):
    """Test Company Serializer"""

    def setUp(self):
        """Set up test data"""
        self.company = Company.objects.create(
            name="Test Company", api_token="secret-token-123"
        )

    def test_company_serialization(self):
        """Test company serialization (read)"""
        serializer = CompanySerializer(instance=self.company)
        data = serializer.data

        self.assertEqual(data["name"], "Test Company")
        self.assertEqual(data["id"], self.company.id)
        self.assertIn("created_at", data)
        self.assertIn("last_updated_at", data)
        self.assertIn("documents_count", data)
        # API token should not be included in read operations
        self.assertNotIn("api_token", data)

    def test_company_deserialization_create(self):
        """Test company deserialization for creation"""
        data = {"name": "New Company", "api_token": "new-secret-token"}

        serializer = CompanySerializer(data=data)
        self.assertTrue(serializer.is_valid())

        company = serializer.save()
        self.assertEqual(company.name, "New Company")
        self.assertEqual(company.api_token, "new-secret-token")

    def test_company_deserialization_update(self):
        """Test company deserialization for update"""
        data = {"name": "Updated Company Name", "api_token": "updated-token"}

        serializer = CompanySerializer(instance=self.company, data=data)
        self.assertTrue(serializer.is_valid())

        updated_company = serializer.save()
        self.assertEqual(updated_company.name, "Updated Company Name")
        self.assertEqual(updated_company.api_token, "updated-token")

    def test_company_validation_name_required(self):
        """Test that company name is required"""
        data = {"api_token": "token-123"}

        serializer = CompanySerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("name", serializer.errors)

    def test_documents_count_method(self):
        """Test documents_count SerializerMethodField"""
        # Create documents for the company
        Document.objects.create(name="Doc 1", company=self.company, created_by="user1")
        Document.objects.create(name="Doc 2", company=self.company, created_by="user2")

        serializer = CompanySerializer(instance=self.company)
        data = serializer.data

        self.assertEqual(data["documents_count"], 2)


class SignerSerializerTest(TestCase):
    """Test Signer Serializer"""

    def setUp(self):
        """Set up test data"""
        self.company = Company.objects.create(
            name="Test Company", api_token="token-123"
        )
        self.document = Document.objects.create(
            name="Test Document", company=self.company, created_by="testuser"
        )
        self.signer = Signer.objects.create(
            name="John Doe",
            email="john@example.com",
            document=self.document,
            token="signer-token-123",
            external_id="ext-123",
        )

    def test_signer_serialization(self):
        """Test signer serialization"""
        serializer = SignerSerializer(instance=self.signer)
        data = serializer.data

        self.assertEqual(data["name"], "John Doe")
        self.assertEqual(data["email"], "john@example.com")
        self.assertEqual(data["token"], "signer-token-123")
        self.assertEqual(data["external_id"], "ext-123")
        self.assertEqual(data["status"], "PENDING")
        self.assertEqual(data["document"], self.document.id)

    def test_signer_deserialization_create(self):
        """Test signer deserialization for creation"""
        data = {
            "name": "Jane Smith",
            "email": "jane@example.com",
            "document": self.document.id,
            "status": "PENDING",
        }

        serializer = SignerSerializer(data=data)
        self.assertTrue(serializer.is_valid())

        signer = serializer.save()
        self.assertEqual(signer.name, "Jane Smith")
        self.assertEqual(signer.email, "jane@example.com")
        self.assertEqual(signer.document, self.document)

    def test_signer_validation_required_fields(self):
        """Test signer validation for required fields"""
        data = {
            "name": "Jane Smith"
            # Missing email and document
        }

        serializer = SignerSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("email", serializer.errors)
        self.assertIn("document", serializer.errors)

    def test_signer_read_only_fields(self):
        """Test that token and external_id are read-only"""
        data = {
            "name": "Jane Smith",
            "email": "jane@example.com",
            "document": self.document.id,
            "token": "should-be-ignored",
            "external_id": "should-be-ignored",
        }

        serializer = SignerSerializer(data=data)
        self.assertTrue(serializer.is_valid())

        signer = serializer.save()
        # These fields should not be set from input data
        self.assertNotEqual(signer.token, "should-be-ignored")
        self.assertNotEqual(signer.external_id, "should-be-ignored")


class DocumentSerializersTest(TestCase):
    """Test Document Serializers"""

    def setUp(self):
        """Set up test data"""
        self.company = Company.objects.create(
            name="Test Company", api_token="token-123"
        )
        self.document = Document.objects.create(
            name="Test Document",
            company=self.company,
            created_by="testuser",
            token="doc-token-123",
            open_id=12345,
        )
        self.signer = Signer.objects.create(
            name="John Doe", email="john@example.com", document=self.document
        )

    def test_document_list_serializer(self):
        """Test DocumentListSerializer"""
        serializer = DocumentListSerializer(instance=self.document)
        data = serializer.data

        self.assertEqual(data["name"], "Test Document")
        self.assertEqual(data["id"], self.document.id)
        self.assertEqual(data["status"], "PENDING_API")
        self.assertEqual(data["created_by"], "testuser")
        self.assertEqual(data["company_name"], "Test Company")
        self.assertEqual(data["signers_count"], 1)
        self.assertIn("created_at", data)
        self.assertIn("last_updated_at", data)

    def test_document_detail_serializer(self):
        """Test DocumentDetailSerializer"""
        serializer = DocumentDetailSerializer(instance=self.document)
        data = serializer.data

        self.assertEqual(data["name"], "Test Document")
        self.assertEqual(data["token"], "doc-token-123")
        self.assertEqual(data["open_id"], 12345)
        self.assertEqual(data["external_id"], "")
        self.assertIn("company", data)
        self.assertIn("signers", data)
        self.assertEqual(len(data["signers"]), 1)
        self.assertEqual(data["signers"][0]["name"], "John Doe")

    def test_document_create_serializer_validation(self):
        """Test DocumentCreateSerializer validation"""
        # Valid data
        valid_data = {
            "name": "New Document",
            "pdf_url": "https://example.com/test.pdf",
            "company_id": self.company.id,
            "created_by": "newuser",
            "signers": [{"name": "Signer 1", "email": "signer1@example.com"}],
        }

        serializer = DocumentCreateSerializer(data=valid_data)
        self.assertTrue(serializer.is_valid())

    def test_document_create_serializer_required_fields(self):
        """Test DocumentCreateSerializer required fields"""
        invalid_data = {
            "name": "New Document"
            # Missing required fields
        }

        serializer = DocumentCreateSerializer(data=invalid_data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("pdf_url", serializer.errors)
        self.assertIn("company_id", serializer.errors)
        self.assertIn("created_by", serializer.errors)
        self.assertIn("signers", serializer.errors)

    def test_document_create_serializer_company_validation(self):
        """Test DocumentCreateSerializer company validation"""
        invalid_data = {
            "name": "New Document",
            "pdf_url": "https://example.com/test.pdf",
            "company_id": 99999,  # Non-existent company
            "created_by": "newuser",
            "signers": [{"name": "Signer 1", "email": "signer1@example.com"}],
        }

        serializer = DocumentCreateSerializer(data=invalid_data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("company_id", serializer.errors)

    def test_document_create_serializer_signers_validation(self):
        """Test DocumentCreateSerializer signers validation"""
        invalid_data = {
            "name": "New Document",
            "pdf_url": "https://example.com/test.pdf",
            "company_id": self.company.id,
            "created_by": "newuser",
            "signers": [],  # Empty signers list
        }

        serializer = DocumentCreateSerializer(data=invalid_data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("signers", serializer.errors)

    def test_document_update_serializer(self):
        """Test DocumentUpdateSerializer"""
        update_data = {"name": "Updated Document Name", "status": "COMPLETED"}

        serializer = DocumentUpdateSerializer(
            instance=self.document, data=update_data, partial=True
        )
        self.assertTrue(serializer.is_valid())

        updated_document = serializer.save()
        self.assertEqual(updated_document.name, "Updated Document Name")
        self.assertEqual(updated_document.status, "COMPLETED")

    def test_document_status_update_serializer(self):
        """Test DocumentStatusUpdateSerializer"""
        status_data = {"status": "CANCELLED"}

        serializer = DocumentStatusUpdateSerializer(
            instance=self.document, data=status_data
        )
        self.assertTrue(serializer.is_valid())

        updated_document = serializer.save()
        self.assertEqual(updated_document.status, "CANCELLED")

    def test_document_status_update_invalid_status(self):
        """Test DocumentStatusUpdateSerializer with invalid status"""
        status_data = {"status": "INVALID_STATUS"}

        serializer = DocumentStatusUpdateSerializer(
            instance=self.document, data=status_data
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("status", serializer.errors)


class SerializerMethodFieldsTest(TestCase):
    """Test SerializerMethodField behaviors"""

    def setUp(self):
        """Set up test data"""
        self.company = Company.objects.create(
            name="Test Company", api_token="token-123"
        )

    def test_company_documents_count_zero(self):
        """Test documents_count when company has no documents"""
        serializer = CompanySerializer(instance=self.company)
        data = serializer.data

        self.assertEqual(data["documents_count"], 0)

    def test_company_documents_count_multiple(self):
        """Test documents_count with multiple documents"""
        # Create multiple documents
        for i in range(5):
            Document.objects.create(
                name=f"Document {i}", company=self.company, created_by=f"user{i}"
            )

        serializer = CompanySerializer(instance=self.company)
        data = serializer.data

        self.assertEqual(data["documents_count"], 5)

    def test_document_list_signers_count(self):
        """Test signers_count in DocumentListSerializer"""
        document = Document.objects.create(
            name="Test Document", company=self.company, created_by="testuser"
        )

        # Create multiple signers
        for i in range(3):
            Signer.objects.create(
                name=f"Signer {i}", email=f"signer{i}@example.com", document=document
            )

        serializer = DocumentListSerializer(instance=document)
        data = serializer.data

        self.assertEqual(data["signers_count"], 3)

    def test_document_list_company_name(self):
        """Test company_name in DocumentListSerializer"""
        document = Document.objects.create(
            name="Test Document", company=self.company, created_by="testuser"
        )

        serializer = DocumentListSerializer(instance=document)
        data = serializer.data

        self.assertEqual(data["company_name"], "Test Company")
